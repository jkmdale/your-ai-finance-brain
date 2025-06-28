import { BankFormat, detectBankFormat } from './bankFormats';
import { AIFormatDetector, BankFormatAnalysis } from './aiFormatDetector';
import { AITransactionCategorizer } from './aiTransactionCategorizer';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  merchant?: string;
  category?: string;
  account?: string;
  balance?: number;
  reference?: string;
  isIncome: boolean;
  confidence: number;
  rowNumber?: number;
  parseWarnings?: string[];
  tags?: string[];
  aiAnalysis?: {
    formatConfidence: number;
    categoryConfidence: number;
    bankName?: string;
    reasoning?: string;
  };
}

export interface SkippedRow {
  rowNumber: number;
  data: string[];
  reason: string;
  suggestions?: string[];
}

export interface ProcessedCSV {
  transactions: Transaction[];
  skippedRows: SkippedRow[];
  bankFormat: BankFormat | null;
  aiAnalysis?: BankFormatAnalysis;
  errors: string[];
  warnings: string[];
  summary: {
    totalRows: number;
    totalTransactions: number;
    dateRange: { start: string; end: string };
    totalAmount: number;
    duplicates: number;
    successRate: number;
    bankName?: string;
    aiConfidence?: number;
  };
}

export class CSVProcessor {
  private aiDetector: AIFormatDetector;
  private aiCategorizer: AITransactionCategorizer;

  constructor() {
    this.aiDetector = new AIFormatDetector();
    this.aiCategorizer = new AITransactionCategorizer();
  }

  private generateTransactionId(date: string, amount: number, description: string): string {
    const hash = btoa(`${date}-${amount}-${description}`).replace(/[^a-zA-Z0-9]/g, '');
    return `txn_${hash.substring(0, 12)}`;
  }

  private parseCSV(csvText: string): { headers: string[], rows: string[][], skippedRows: SkippedRow[] } {
    try {
      console.log('📄 Starting comprehensive CSV parsing...');
      
      const normalizedText = csvText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

      if (!normalizedText) {
        throw new Error('CSV file is empty');
      }

      const lines = normalizedText.split('\n');
      console.log(`📊 Found ${lines.length} total lines`);

      // Auto-detect separator by analyzing first few lines
      const detectSeparator = (sampleLines: string[]): string => {
        const separators = [',', ';', '\t', '|'];
        const separatorCounts = separators.map(sep => ({
          separator: sep,
          avgCount: sampleLines.reduce((sum, line) => sum + (line.split(sep).length - 1), 0) / sampleLines.length
        }));
        
        const bestSeparator = separatorCounts
          .filter(s => s.avgCount >= 1)
          .sort((a, b) => b.avgCount - a.avgCount)[0];
        
        return bestSeparator?.separator || ',';
      };

      const sampleLines = lines.slice(0, Math.min(5, lines.length)).filter(line => line.trim());
      const separator = detectSeparator(sampleLines);
      console.log(`🔍 Detected separator: "${separator === '\t' ? '\\t' : separator}"`);

      const parseCSVLine = (line: string, lineNumber: number): { cells: string[], error?: string } => {
        try {
          if (!line.trim()) {
            return { cells: [] };
          }

          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          let quoteChar = '"';
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if ((char === '"' || char === "'") && !inQuotes) {
              inQuotes = true;
              quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
              if (nextChar === quoteChar) {
                current += quoteChar;
                i++;
              } else {
                inQuotes = false;
              }
            } else if (char === separator && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          
          result.push(current.trim());
          
          const cleanedCells = result.map(cell => {
            if ((cell.startsWith('"') && cell.endsWith('"')) || 
                (cell.startsWith("'") && cell.endsWith("'"))) {
              cell = cell.slice(1, -1);
            }
            return cell.trim();
          });

          return { cells: cleanedCells };
        } catch (error) {
          return { 
            cells: line.split(separator).map(c => c.trim()), 
            error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` 
          };
        }
      };

      // Find header row with AI assistance
      let headerRowIndex = -1;
      let headers: string[] = [];
      
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const parseResult = parseCSVLine(lines[i], i + 1);
        if (parseResult.cells.length >= 2 && parseResult.cells.some(cell => cell.length > 0)) {
          const headerTerms = ['date', 'amount', 'description', 'details', 'transaction', 'debit', 'credit', 'balance'];
          const lowerCells = parseResult.cells.map(c => c.toLowerCase());
          const hasHeaderTerms = lowerCells.some(cell => 
            headerTerms.some(term => cell.includes(term))
          );
          
          if (hasHeaderTerms || i === 0) {
            headers = parseResult.cells;
            headerRowIndex = i;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        for (let i = 0; i < Math.min(3, lines.length); i++) {
          const parseResult = parseCSVLine(lines[i], i + 1);
          if (parseResult.cells.length >= 2) {
            headers = parseResult.cells;
            headerRowIndex = i;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('No valid header row found in first 10 lines');
      }

      console.log(`📋 Headers found at row ${headerRowIndex + 1}: ${headers.join(', ')}`);

      // Parse data rows
      const rows: string[][] = [];
      const skippedRows: SkippedRow[] = [];
      
      for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const rowNumber = i + 1;
        
        if (!line.trim()) {
          continue;
        }

        const parseResult = parseCSVLine(line, rowNumber);
        const cells = parseResult.cells;
        
        if (cells.length === 0 || cells.every(cell => !cell.trim())) {
          continue;
        }

        while (cells.length < headers.length) {
          cells.push('');
        }

        const hasAnyData = cells.some(cell => cell.trim().length > 0);
        if (!hasAnyData) {
          continue;
        }

        rows.push(cells);
      }

      console.log(`✅ Comprehensive parsing complete: ${headers.length} headers, ${rows.length} data rows`);
      
      return { headers, rows, skippedRows };
    } catch (error) {
      console.error('❌ CSV parsing error:', error);
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseDate(dateString: string, format?: string, rowNumber?: number): { date: string, warnings: string[] } {
    const warnings: string[] = [];
    
    if (!dateString?.trim()) {
      warnings.push(`Row ${rowNumber || 'unknown'}: Empty date, using today`);
      return { date: new Date().toISOString().split('T')[0], warnings };
    }
    
    const cleanDate = dateString.trim();
    console.log(`🗓️ Parsing date: "${cleanDate}"`);
    
    // Enhanced date patterns supporting multiple formats
    const patterns = [
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy', name: 'DD/MM/YYYY' },
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'mdy', name: 'MM/DD/YYYY (US)' },
      { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd', name: 'YYYY-MM-DD' },
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy', name: 'DD/MM/YY' },
      { regex: /^(\d{2})(\d{2})(\d{4})$/, type: 'dmy', name: 'DDMMYYYY' },
      { regex: /^(\d{4})(\d{2})(\d{2})$/, type: 'ymd', name: 'YYYYMMDD' }
    ];

    for (const pattern of patterns) {
      const match = cleanDate.match(pattern.regex);
      if (match) {
        try {
          let year: string, month: string, day: string;
          
          if (pattern.type === 'ymd') {
            [, year, month, day] = match;
          } else if (pattern.type === 'mdy') {
            [, month, day, year] = match;
            if (parseInt(day) > 12 && parseInt(month) <= 12) {
              [day, month] = [month, day];
              warnings.push(`Row ${rowNumber || 'unknown'}: Assumed DD/MM format due to day > 12`);
            }
          } else {
            [, day, month, year] = match;
            if (year.length === 2) {
              const yearNum = parseInt(year);
              year = yearNum > 50 ? `19${year}` : `20${year}`;
            }
          }
          
          const dayNum = parseInt(day);
          const monthNum = parseInt(month);
          const yearNum = parseInt(year);
          
          if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
            continue;
          }
          
          const dateObj = new Date(yearNum, monthNum - 1, dayNum);
          if (dateObj.getFullYear() === yearNum && 
              dateObj.getMonth() === monthNum - 1 && 
              dateObj.getDate() === dayNum) {
            
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            console.log(`✅ Date parsed as ${pattern.name}: ${formattedDate}`);
            return { date: formattedDate, warnings };
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    try {
      const jsDate = new Date(cleanDate);
      if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() > 1900) {
        warnings.push(`Row ${rowNumber || 'unknown'}: Used fallback date parsing`);
        return { date: jsDate.toISOString().split('T')[0], warnings };
      }
    } catch (error) {
      // Continue to default
    }
    
    warnings.push(`Row ${rowNumber || 'unknown'}: Could not parse date "${cleanDate}", using today`);
    return { date: new Date().toISOString().split('T')[0], warnings };
  }

  private parseAmount(amountString: string, rowNumber?: number): { amount: number, warnings: string[] } {
    const warnings: string[] = [];
    
    if (!amountString?.trim()) {
      return { amount: 0, warnings };
    }
    
    console.log(`💰 Parsing amount: "${amountString}"`);
    
    const original = amountString.trim();
    let cleaned = original.replace(/[£$€¥₹\s]/g, '');
    
    const isNegative = /^\(.*\)$/.test(original) || cleaned.startsWith('-') || original.includes('DR') || original.includes('DEBIT');
    cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '').replace(/DR|DEBIT/gi, '');
    
    if (cleaned.includes('.') && cleaned.includes(',')) {
      cleaned = cleaned.replace(/,/g, '');
    } else if (cleaned.includes(',')) {
      const commaIndex = cleaned.lastIndexOf(',');
      const afterComma = cleaned.substring(commaIndex + 1);
      if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
        cleaned = cleaned.replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    }
    
    const numericValue = parseFloat(cleaned);
    if (isNaN(numericValue)) {
      warnings.push(`Row ${rowNumber || 'unknown'}: Could not parse amount "${original}", using 0`);
      return { amount: 0, warnings };
    }
    
    const finalAmount = isNegative ? -Math.abs(numericValue) : numericValue;
    console.log(`✅ Amount parsed: ${finalAmount}`);
    return { amount: finalAmount, warnings };
  }

  public async processCSV(csvText: string): Promise<ProcessedCSV> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const transactions: Transaction[] = [];
    const allSkippedRows: SkippedRow[] = [];

    try {
      console.log('🔄 Starting AI-powered comprehensive CSV processing...');
      
      const { headers, rows, skippedRows } = this.parseCSV(csvText);
      allSkippedRows.push(...skippedRows);
      
      console.log(`📊 Parsed: ${headers.length} headers, ${rows.length} rows`);

      if (rows.length === 0) {
        warnings.push('No data rows found - file may be empty or contain only headers');
        return this.createEmptyResult(errors, warnings, allSkippedRows);
      }

      // AI-powered bank format detection
      const sampleRows = rows.slice(0, Math.min(10, rows.length));
      const aiAnalysis = await this.aiDetector.detectFormat(headers, sampleRows);
      
      console.log(`🤖 AI Analysis Complete:`, {
        confidence: aiAnalysis.confidence,
        bankName: aiAnalysis.bankName,
        dateFormat: aiAnalysis.dateFormat
      });

      // Use AI-detected column mappings
      const dateMapping = aiAnalysis.columnMappings.date;
      const descMapping = aiAnalysis.columnMappings.description;
      const amountMapping = aiAnalysis.columnMappings.amount;

      console.log(`📍 AI Column Mapping:`);
      console.log(`  Date: ${dateMapping.index >= 0 ? `column ${dateMapping.index} (${Math.round(dateMapping.confidence * 100)}%)` : 'NOT FOUND'}`);
      console.log(`  Description: ${descMapping.index >= 0 ? `column ${descMapping.index} (${Math.round(descMapping.confidence * 100)}%)` : 'NOT FOUND'}`);
      console.log(`  Amount: ${amountMapping.index >= 0 ? `column ${amountMapping.index} (${Math.round(amountMapping.confidence * 100)}%)` : 'NOT FOUND'}`);

      // Require at least 2 out of 3 key columns
      const foundColumns = [dateMapping, descMapping, amountMapping].filter(col => col.index >= 0 && col.confidence > 0.3);
      if (foundColumns.length < 2) {
        const availableColumns = headers.join(', ');
        errors.push(`Insufficient key columns found (need 2/3). Available: ${availableColumns}`);
        return this.createEmptyResult(errors, warnings, allSkippedRows);
      }

      // Process transactions with AI categorization
      let processedCount = 0;
      const dates: string[] = [];
      const rowWarnings: string[] = [];

      // Batch prepare transactions for AI categorization
      const transactionDrafts = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;
        
        try {
          const rawDate = dateMapping.index >= 0 ? row[dateMapping.index]?.trim() || '' : '';
          const description = descMapping.index >= 0 ? row[descMapping.index]?.trim() || '' : '';
          const rawAmount = amountMapping.index >= 0 ? row[amountMapping.index]?.trim() || '' : '';

          if (!rawDate && !description && !rawAmount && row.every(cell => !cell?.trim())) {
            continue;
          }

          const { date, warnings: dateParseWarnings } = this.parseDate(rawDate, aiAnalysis.dateFormat, rowNumber);
          const { amount, warnings: amountParseWarnings } = this.parseAmount(rawAmount, rowNumber);
          
          rowWarnings.push(...dateParseWarnings, ...amountParseWarnings);

          let finalDescription = description || `Transaction ${rowNumber}`;
          if (!description && rawAmount) {
            finalDescription = `Transaction of ${rawAmount}`;
          }
          if (!description && rawDate) {
            finalDescription = `Transaction on ${rawDate}`;
          }

          transactionDrafts.push({
            rowNumber,
            date,
            amount,
            description: finalDescription,
            rawData: { rawDate, rawAmount, description }
          });

        } catch (rowError: any) {
          console.warn(`⚠️ Row ${rowNumber} error:`, rowError);
          allSkippedRows.push({
            rowNumber,
            data: row,
            reason: `Processing error: ${rowError.message}`,
            suggestions: ['Check data format', 'Verify column alignment']
          });
        }
      }

      // Batch AI categorization for better performance
      console.log(`🏷️ Starting batch AI categorization for ${transactionDrafts.length} transactions...`);
      
      const categorizationInput = transactionDrafts.map(draft => ({
        description: draft.description,
        amount: draft.amount
      }));

      const categories = await this.aiCategorizer.batchCategorize(categorizationInput);

      // Build final transactions with AI analysis
      for (let i = 0; i < transactionDrafts.length; i++) {
        const draft = transactionDrafts[i];
        const categoryAnalysis = categories[i];

        const transaction: Transaction = {
          id: this.generateTransactionId(draft.date, draft.amount, draft.description),
          date: draft.date,
          amount: Math.abs(draft.amount),
          description: draft.description.substring(0, 200),
          merchant: categoryAnalysis.merchant,
          category: categoryAnalysis.category,
          isIncome: categoryAnalysis.isIncome,
          confidence: Math.min(dateMapping.confidence, descMapping.confidence, amountMapping.confidence, categoryAnalysis.confidence),
          rowNumber: draft.rowNumber,
          parseWarnings: [],
          tags: categoryAnalysis.tags,
          aiAnalysis: {
            formatConfidence: aiAnalysis.confidence,
            categoryConfidence: categoryAnalysis.confidence,
            bankName: aiAnalysis.bankName,
            reasoning: categoryAnalysis.reasoning
          }
        };

        transactions.push(transaction);
        dates.push(draft.date);
        processedCount++;

        console.log(`✅ Row ${draft.rowNumber}: ${transaction.isIncome ? '+' : '-'}$${transaction.amount} - ${transaction.category} (${Math.round(transaction.confidence * 100)}%)`);
      }

      warnings.push(...rowWarnings);

      // Calculate summary with AI insights
      dates.sort();
      const totalAmount = transactions.reduce((sum, t) => sum + (t.isIncome ? t.amount : -t.amount), 0);
      const successRate = rows.length > 0 ? (processedCount / rows.length) * 100 : 0;
      
      const summary = {
        totalRows: rows.length,
        totalTransactions: transactions.length,
        dateRange: {
          start: dates[0] || '',
          end: dates[dates.length - 1] || ''
        },
        totalAmount,
        duplicates: 0,
        successRate,
        bankName: aiAnalysis.bankName,
        aiConfidence: aiAnalysis.confidence
      };

      console.log(`✅ AI-powered processing complete:`);
      console.log(`  🤖 AI Confidence: ${Math.round(aiAnalysis.confidence * 100)}%`);
      console.log(`  🏦 Bank: ${aiAnalysis.bankName || 'Unknown'}`);
      console.log(`  📊 Success rate: ${successRate.toFixed(1)}%`);
      console.log(`  ✅ Processed: ${processedCount} transactions`);
      console.log(`  ⚠️ Skipped: ${allSkippedRows.length} rows`);

      return {
        transactions,
        skippedRows: allSkippedRows,
        bankFormat: null,
        aiAnalysis,
        errors,
        warnings,
        summary
      };

    } catch (error: any) {
      console.error('❌ AI Processing error:', error);
      errors.push(`AI processing failed: ${error.message}`);
      
      return this.createEmptyResult(errors, warnings, allSkippedRows);
    }
  }

  public createEmptyResult(errors: string[], warnings: string[], skippedRows: SkippedRow[]): ProcessedCSV {
    return {
      transactions: [],
      skippedRows,
      bankFormat: null,
      errors,
      warnings,
      summary: { 
        totalRows: 0, 
        totalTransactions: 0, 
        dateRange: { start: '', end: '' }, 
        totalAmount: 0, 
        duplicates: 0,
        successRate: 0
      }
    };
  }
}
