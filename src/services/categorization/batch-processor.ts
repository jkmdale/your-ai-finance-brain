import { TransactionCategorizer } from './categorizer';
import { CLAUDE_CONFIG } from './config';
import type { Transaction, CategorizedTransaction, CategorizationProgress } from '@/types/categorization';

export class BatchProcessor {
  private categorizer: TransactionCategorizer;

  constructor(categorizer: TransactionCategorizer) {
    this.categorizer = categorizer;
  }

  async processBatch(
    transactions: Transaction[], 
    onProgress: (progress: CategorizationProgress) => void
  ): Promise<CategorizedTransaction[]> {
    const results: CategorizedTransaction[] = [];
    let completed = 0;
    let failed = 0;

    // Process transactions in batches to avoid rate limits
    for (let i = 0; i < transactions.length; i += CLAUDE_CONFIG.BATCH_SIZE) {
      const batch = transactions.slice(i, i + CLAUDE_CONFIG.BATCH_SIZE);
      
      const batchPromises = batch.map(async (transaction) => {
        try {
          const result = await this.categorizer.categorize(transaction);
          completed++;
          return result;
        } catch (error) {
          failed++;
          console.error('Failed to categorize transaction:', transaction.description, error);
          return this.createFailedCategorization(transaction);
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Update progress
      onProgress({
        total: transactions.length,
        completed,
        failed
      });

      // Small delay between batches to respect rate limits
      if (i + CLAUDE_CONFIG.BATCH_SIZE < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  private createFailedCategorization(transaction: Transaction): CategorizedTransaction {
    return {
      ...transaction,
      isIncome: transaction.amount > 0,
      incomeType: transaction.amount > 0 ? 'Other' : null,
      category: 'Uncategorised',
      budgetGroup: 'Needs',
      smartGoal: 'Failed to categorize'
    };
  }
}