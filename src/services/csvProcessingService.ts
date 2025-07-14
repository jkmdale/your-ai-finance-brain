import { UnifiedTransactionProcessor, Transaction, BankFormat as ProcessorBankFormat } from './unifiedTransactionProcessor';
import { CSVParser } from '@/utils/csv/csvParser';
import { detectBankFormat, BankFormat as DetectedBankFormat } from '@/utils/bankFormats';
import { AIFormatDetector } from '@/utils/aiFormatDetector';

export interface ProcessingResult {
  transactions: Transaction[];
  summary: {
    totalRows: number;
    successfulTransactions: number;
    duplicatesSkipped: number;
    errors: string[];
    warnings: string[];
    skippedRows: number;
    skippedRowDetails: Array<{
      rowNumber: number;
      error: string;
      dateValue?: string;
      amountValue?: string;
    }>;
  };
}

export class CSVProcessingService {
  private csvParser = new CSVParser();
  private aiDetector = new AIFormatDetector();

  async processCSVFiles(files: FileList, userId: string): Promise<ProcessingResult> {
    const allTransactions: Transaction[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const allSkippedRowDetails: Array<{
      rowNumber: number;
      error: string;
      dateValue?: string;
      amountValue?: string;
    }> = [];
    
    let totalRows = 0;
    let totalSkippedRows = 0;

    console.log(`📁 Processing ${files.length} CSV file(s)...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📄 Processing file ${i + 1}/${files.length}: ${file.name}`);

      try {
        const fileResult = await this.processSingleFile(file, userId);
        
        // Merge results
        allTransactions.push(...fileResult.transactions);
        allErrors.push(...fileResult.summary.errors);
        allWarnings.push(...fileResult.summary.warnings);
        allSkippedRowDetails.push(...fileResult.summary.skippedRowDetails);
        
        totalRows += fileResult.summary.totalRows;
        totalSkippedRows += fileResult.summary.skippedRows;

      } catch (error) {
        console.error(`❌ Error processing file ${file.name}:`, error);
        allErrors.push(`File ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Remove duplicates based on date, amount, and description
    const uniqueTransactions = this.removeDuplicates(allTransactions);
    const duplicatesSkipped = allTransactions.length - uniqueTransactions.length;

    console.log(`✅ CSV processing complete: ${uniqueTransactions.length} unique transactions from ${totalRows} rows`);

    return {
      transactions: uniqueTransactions,
      summary: {
        totalRows,
        successfulTransactions: uniqueTransactions.length,
        duplicatesSkipped,
        errors: allErrors,
        warnings: allWarnings,
        skippedRows: totalSkippedRows,
        skippedRowDetails: allSkippedRowDetails.slice(0, 10) // Limit to first 10 for UI
      }
    };
  }

  private async processSingleFile(file: File, userId: string): Promise<ProcessingResult> {
    const fileName = file.name;
    console.log(`📋 Processing single file: ${fileName}`);

    // Read file content
    const csvText = await this.readFileAsText(file);
    if (!csvText.trim()) {
      throw new Error(`File ${fileName} is empty`);
    }

    // Parse CSV
    const parsedData = this.csvParser.parseCSV(csvText);
    const { headers, rows } = parsedData;

    if (rows.length === 0) {
      throw new Error(`No data rows found in ${fileName}`);
    }

    console.log(`📊 File ${fileName}: ${headers.length} columns, ${rows.length} data rows`);

    // Detect bank format
    const sampleRows = rows.slice(0, Math.min(5, rows.length));
    let detectedFormat = detectBankFormat(headers, sampleRows);

    // If basic detection fails, try AI detection
    if (!detectedFormat || detectedFormat.confidence < 0.6) {
      console.log(`🤖 Using AI format detection for ${fileName}...`);
      try {
        const aiAnalysis = await this.aiDetector.detectFormat(headers, sampleRows);
        if (aiAnalysis.confidence > 0.5) {
          // Convert AI analysis to bank format
          detectedFormat = this.convertAIAnalysisToBankFormat(aiAnalysis, headers);
        }
      } catch (error) {
        console.warn(`AI format detection failed for ${fileName}:`, error);
      }
    }

    if (!detectedFormat) {
      throw new Error(`Could not detect bank format for ${fileName}. Please check that your CSV has date, amount, and description columns.`);
    }

    console.log(`🏦 Detected bank format for ${fileName}: ${detectedFormat.name || detectedFormat.id} (confidence: ${Math.round(detectedFormat.confidence * 100)}%)`);

    // Convert to processor format
    const processorFormat = this.convertToProcessorFormat(detectedFormat);

    // Create processor instance with detected format
    const processor = new UnifiedTransactionProcessor(processorFormat);

    // Process each row
    const transactions: Transaction[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const skippedRowDetails: Array<{
      rowNumber: number;
      error: string;
      dateValue?: string;
      amountValue?: string;
    }> = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const rowNumber = rowIndex + 2; // +2 because row 1 is headers and we're 0-indexed

      try {
        // Convert row array to object using headers
        const rowObject: any = {};
        headers.forEach((header, index) => {
          rowObject[header] = row[index] || '';
        });

        // Skip completely empty rows
        const hasAnyData = Object.values(rowObject).some(value => 
          value && value.toString().trim().length > 0
        );
        if (!hasAnyData) {
          continue;
        }

        // Process the row
        const transaction = processor.normalizeTransaction(rowObject);
        
        if (transaction) {
          // Add metadata
          transaction.id = `${userId}_${Date.now()}_${rowIndex}`;
          transactions.push(transaction);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ Skipping row ${rowNumber} in ${fileName}: ${errorMessage}`);
        
        // Extract values for debugging
        const dateValue = this.extractDebugValue(row, headers, processorFormat.columnMappings.date);
        const amountValue = this.extractDebugValue(row, headers, processorFormat.columnMappings.amount);
        
        skippedRowDetails.push({
          rowNumber,
          error: errorMessage,
          dateValue,
          amountValue
        });
        
        errors.push(`Row ${rowNumber}: ${errorMessage}`);
      }
    }

    console.log(`✅ File ${fileName}: processed ${transactions.length}/${rows.length} rows successfully`);

    return {
      transactions,
      summary: {
        totalRows: rows.length,
        successfulTransactions: transactions.length,
        duplicatesSkipped: 0, // Will be calculated at the overall level
        errors,
        warnings,
        skippedRows: rows.length - transactions.length,
        skippedRowDetails: skippedRowDetails.slice(0, 10) // Limit for performance
      }
    };
  }

  private convertToProcessorFormat(detectedFormat: DetectedBankFormat): ProcessorBankFormat {
    return {
      columnMappings: {
        date: detectedFormat.headers?.date || ['date'],
        amount: detectedFormat.headers?.amount || ['amount'],
        description: detectedFormat.headers?.description || ['description'],
        // For formats that might have separate debit/credit columns
        debit: detectedFormat.headers?.amount?.includes('debit') ? ['debit'] : undefined,
        credit: detectedFormat.headers?.amount?.includes('credit') ? ['credit'] : undefined,
      }
    };
  }

  private extractDebugValue(row: string[], headers: string[], columnNames: string[]): string {
    for (const colName of columnNames) {
      const index = headers.findIndex(h => h.toLowerCase().includes(colName.toLowerCase()));
      if (index >= 0 && row[index]) {
        return row[index];
      }
    }
    return '[not found]';
  }

  private convertAIAnalysisToBankFormat(aiAnalysis: any, headers: string[]): DetectedBankFormat {
    return {
      id: 'ai-detected',
      name: aiAnalysis.bankName || 'AI Detected Format',
      country: aiAnalysis.country || 'Unknown',
      dateFormats: [aiAnalysis.dateFormat || 'DD/MM/YYYY'],
      amountFormats: ['0.00'],
      confidence: aiAnalysis.confidence,
      headers: {
        date: [headers[aiAnalysis.columnMappings.date?.index] || 'date'],
        amount: [headers[aiAnalysis.columnMappings.amount?.index] || 'amount'],
        description: [headers[aiAnalysis.columnMappings.description?.index] || 'description'],
      },
      patterns: {
        datePattern: /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/,
        amountPattern: /^-?[\d,]+\.?\d*$/,
        negativePattern: /^-/
      }
    };
  }

  private removeDuplicates(transactions: Transaction[]): Transaction[] {
    const seen = new Set<string>();
    const unique: Transaction[] = [];

    for (const transaction of transactions) {
      // Create a hash based on date, amount, and description
      const hash = `${transaction.date}_${transaction.amount}_${transaction.description.substring(0, 50)}`;
      
      if (!seen.has(hash)) {
        seen.add(hash);
        unique.push(transaction);
      }
    }

    return unique;
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file, 'utf-8');
    });
  }
}