
import { BankFormat, detectBankFormat } from '../bankFormats';
import { AIFormatDetector, BankFormatAnalysis } from '../aiFormatDetector';
import { ProcessedCSV, SkippedRow } from './types';
import { CSVParser } from './csvParser';
import { TransactionProcessor } from './transactionProcessor';

export class CSVProcessor {
  private aiDetector: AIFormatDetector;
  private csvParser: CSVParser;
  private transactionProcessor: TransactionProcessor;

  constructor() {
    this.aiDetector = new AIFormatDetector();
    this.csvParser = new CSVParser();
    this.transactionProcessor = new TransactionProcessor();
  }

  public async processCSV(csvText: string): Promise<ProcessedCSV> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const allSkippedRows: SkippedRow[] = [];

    try {
      console.log('🔄 Starting AI-powered comprehensive CSV processing...');
      
      const { headers, rows, skippedRows } = this.csvParser.parseCSV(csvText);
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
      const { transactions, skippedRows: processSkipped, warnings: processWarnings } = 
        await this.transactionProcessor.processTransactions(headers, rows, aiAnalysis);

      allSkippedRows.push(...processSkipped);
      warnings.push(...processWarnings);

      // Calculate summary with AI insights
      const dates = transactions.map(t => t.date).sort();
      const totalAmount = transactions.reduce((sum, t) => sum + (t.isIncome ? t.amount : -t.amount), 0);
      const successRate = rows.length > 0 ? (transactions.length / rows.length) * 100 : 0;
      
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
      console.log(`  ✅ Processed: ${transactions.length} transactions`);
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
