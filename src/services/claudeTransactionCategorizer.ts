import { ClaudeApiClient } from './categorization/api-client';
import { TransactionCategorizer } from './categorization/categorizer';
import { BatchProcessor } from './categorization/batch-processor';
import { CategorizationCache } from './categorization/cache';
import type { Transaction, CategorizedTransaction, CategorizationProgress } from '@/types/categorization';

export class ClaudeTransactionCategorizer {
  private apiClient: ClaudeApiClient;
  private categorizer: TransactionCategorizer;
  private batchProcessor: BatchProcessor;
  private cache: CategorizationCache;

  constructor() {
    this.apiClient = new ClaudeApiClient();
    this.categorizer = new TransactionCategorizer(this.apiClient);
    this.batchProcessor = new BatchProcessor(this.categorizer);
    this.cache = new CategorizationCache();
  }

  public async categorizeTransactions(
    transactions: Transaction[],
    onProgress: (progress: CategorizationProgress) => void
  ): Promise<CategorizedTransaction[]> {
    console.log(`🧠 Starting Claude categorization for ${transactions.length} transactions...`);
    
    if (!this.apiClient.isConfigured()) {
      throw new Error('Claude API key not configured. Please set CLAUDE_API_KEY in Supabase secrets.');
    }

    if (transactions.length === 0) {
      return [];
    }

    const categorizedTransactions = await this.batchProcessor.processBatch(transactions, onProgress);
    
    // Store categorized transactions in cache
    this.cache.store(categorizedTransactions);
    
    console.log(`✅ Claude categorization complete: ${categorizedTransactions.length} transactions processed`);
    
    return categorizedTransactions;
  }

  public getCachedCategorizedTransactions(): CategorizedTransaction[] {
    return this.cache.retrieve();
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

export const claudeTransactionCategorizer = new ClaudeTransactionCategorizer();

// Re-export types for backward compatibility
export type { Transaction, CategorizedTransaction, CategorizationProgress } from '@/types/categorization';