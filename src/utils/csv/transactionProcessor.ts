
import { Transaction, SkippedRow } from './types';
import { DateParser } from './dateParser';
import { AmountParser } from './amountParser';
import { AIFormatDetector } from '../aiFormatDetector';
import { AITransactionCategorizer } from '../aiTransactionCategorizer';

export class TransactionProcessor {
  private dateParser: DateParser;
  private amountParser: AmountParser;
  private aiCategorizer: AITransactionCategorizer;

  constructor() {
    this.dateParser = new DateParser();
    this.amountParser = new AmountParser();
    this.aiCategorizer = new AITransactionCategorizer();
  }

  private generateTransactionId(date: string, amount: number, description: string): string {
    const hash = btoa(`${date}-${amount}-${description}`).replace(/[^a-zA-Z0-9]/g, '');
    return `txn_${hash.substring(0, 12)}`;
  }

  public async processTransactions(
    headers: string[],
    rows: string[][],
    aiAnalysis: any
  ): Promise<{ transactions: Transaction[], skippedRows: SkippedRow[], warnings: string[] }> {
    const transactions: Transaction[] = [];
    const skippedRows: SkippedRow[] = [];
    const warnings: string[] = [];

    // Use AI-detected column mappings
    const dateMapping = aiAnalysis.columnMappings.date;
    const descMapping = aiAnalysis.columnMappings.description;
    const amountMapping = aiAnalysis.columnMappings.amount;

    console.log(`🔄 Processing ALL ${rows.length} rows...`);

    // Batch prepare ALL transactions for AI categorization
    const transactionDrafts = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 for header and 0-indexing
      
      try {
        const rawDate = dateMapping.index >= 0 ? row[dateMapping.index]?.trim() || '' : '';
        const description = descMapping.index >= 0 ? row[descMapping.index]?.trim() || '' : '';
        const rawAmount = amountMapping.index >= 0 ? row[amountMapping.index]?.trim() || '' : '';

        // Skip only if ALL fields are empty
        if (!rawDate && !description && !rawAmount && row.every(cell => !cell?.trim())) {
          continue;
        }

        const { date, warnings: dateParseWarnings } = this.dateParser.parseDate(rawDate, aiAnalysis.dateFormat, rowNumber);
        const { amount, warnings: amountParseWarnings } = this.amountParser.parseAmount(rawAmount, rowNumber);
        
        warnings.push(...dateParseWarnings, ...amountParseWarnings);

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

        console.log(`📝 Row ${rowNumber}: ${finalDescription} - ${amount}`);

      } catch (rowError: any) {
        console.warn(`⚠️ Row ${rowNumber} error:`, rowError);
        skippedRows.push({
          rowNumber,
          data: row,
          reason: `Processing error: ${rowError.message}`,
          suggestions: ['Check data format', 'Verify column alignment']
        });
      }
    }

    console.log(`🏷️ Starting batch AI categorization for ${transactionDrafts.length} transactions...`);
    
    // Batch AI categorization for better performance
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

      console.log(`✅ Row ${draft.rowNumber}: ${transaction.isIncome ? '+' : '-'}$${transaction.amount} - ${transaction.category} (${Math.round(transaction.confidence * 100)}%)`);
    }

    return { transactions, skippedRows, warnings };
  }
}
