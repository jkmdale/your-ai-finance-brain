import { supabase } from '@/integrations/supabase/client';

export interface Transaction {
  date: string;
  description: string;
  amount: number;
}

export interface CategorizedTransaction extends Transaction {
  category: string;
  budgetGroup: 'Needs' | 'Wants' | 'Savings';
  smartGoal: string;
  isIncome: boolean;
  incomeType: string | null;
}

export interface CategorizationProgress {
  total: number;
  completed: number;
  failed: number;
}

export class ClaudeTransactionCategorizer {
  private readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
  private readonly MODEL = 'claude-3-haiku-20240307';
  private readonly MAX_TOKENS = 300;
  private readonly BATCH_SIZE = 10; // Process in batches to avoid rate limits
  private readonly RETRY_DELAY = 1000; // 1 second delay between retries

  private claudeApiKey: string | null = null;

  constructor() {
    // Claude API key should be set in Supabase secrets
    this.initializeApiKey();
  }

  private async initializeApiKey() {
    try {
      const { data, error } = await supabase.functions.invoke('claude-api-proxy', {
        body: { action: 'get-api-key' }
      });
      
      if (!error && data?.apiKey) {
        this.claudeApiKey = 'configured'; // Use proxy instead of direct key
      }
    } catch (error) {
      console.warn('Could not retrieve Claude API key from Supabase');
    }
  }

  private async categorizeTransaction(transaction: Transaction, retryCount = 0): Promise<CategorizedTransaction> {
    if (!this.claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    // Enhanced income classification for positive amounts
    if (transaction.amount > 0) {
      const prompt = `You are a financial assistant classifying bank transactions.

This transaction is a positive credit. Please identify:
- Is it true income (or a transfer/refund)?
- What type of income is it?
- What category and budget group?

Respond with:
{
  "isIncome": true | false,
  "incomeType": "Salary" | "Interest" | "Refund" | "Gift" | "Business Revenue" | "Transfer" | "Other",
  "category": "category_name",
  "budgetGroup": "Needs" | "Wants" | "Savings",
  "smartGoal": "specific goal suggestion",
  "reason": "Short explanation why"
}

Transaction: "${transaction.description}" - $${Math.abs(transaction.amount)} on ${transaction.date}`;

      try {
        const { data: responseData, error } = await supabase.functions.invoke('claude-api-proxy', {
          body: {
            prompt: prompt,
            model: this.MODEL,
            max_tokens: this.MAX_TOKENS
          }
        });

        if (error) throw new Error(`Supabase function error: ${error.message}`);

        const content = responseData?.content?.[0]?.text;
        if (!content) throw new Error('No content in Claude response');

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in Claude response');

        const result = JSON.parse(jsonMatch[0]);
        
        return {
          ...transaction,
          isIncome: result.isIncome || false,
          incomeType: result.incomeType || 'Other',
          category: result.category || 'Other Income',
          budgetGroup: ['Needs', 'Wants', 'Savings'].includes(result.budgetGroup) ? result.budgetGroup : 'Savings',
          smartGoal: result.smartGoal || 'Track income source'
        };

      } catch (error) {
        console.error(`Error categorizing income transaction: ${transaction.description}`, error);
        
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          return this.categorizeTransaction(transaction, 1);
        }
        
        return {
          ...transaction,
          isIncome: true,
          incomeType: 'Other',
          category: 'Other Income',
          budgetGroup: 'Savings',
          smartGoal: 'Review and categorize manually'
        };
      }
    } else {
      // Regular expense categorization for negative amounts
      const prompt = `Transaction: '${transaction.description}' for $${Math.abs(transaction.amount)} on ${transaction.date}.

What category is this? (e.g. groceries, rent, entertainment, transport, dining, utilities, shopping, healthcare)
What budget group? (Needs, Wants, or Savings)
Any SMART financial goal suggestion?

Please respond in this exact JSON format:
{
  "category": "category_name",
  "budgetGroup": "Needs|Wants|Savings", 
  "smartGoal": "specific goal suggestion"
}`;

      try {
        const { data: responseData, error } = await supabase.functions.invoke('claude-api-proxy', {
          body: {
            prompt: prompt,
            model: this.MODEL,
            max_tokens: this.MAX_TOKENS
          }
        });

        if (error) throw new Error(`Supabase function error: ${error.message}`);

        const content = responseData?.content?.[0]?.text;
        if (!content) throw new Error('No content in Claude response');

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in Claude response');

        const result = JSON.parse(jsonMatch[0]);
        
        return {
          ...transaction,
          isIncome: false,
          incomeType: null,
          category: result.category || 'Uncategorised',
          budgetGroup: ['Needs', 'Wants', 'Savings'].includes(result.budgetGroup) ? result.budgetGroup : 'Needs',
          smartGoal: result.smartGoal || 'Track spending in this category'
        };

      } catch (error) {
        console.error(`Error categorizing expense transaction: ${transaction.description}`, error);
        
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          return this.categorizeTransaction(transaction, 1);
        }
        
        return {
          ...transaction,
          isIncome: false,
          incomeType: null,
          category: 'Uncategorised',
          budgetGroup: 'Needs',
          smartGoal: 'Review and categorize manually'
        };
      }
    }
  }

  private async processBatch(
    transactions: Transaction[], 
    onProgress: (progress: CategorizationProgress) => void
  ): Promise<CategorizedTransaction[]> {
    const results: CategorizedTransaction[] = [];
    let completed = 0;
    let failed = 0;

    // Process transactions in batches to avoid rate limits
    for (let i = 0; i < transactions.length; i += this.BATCH_SIZE) {
      const batch = transactions.slice(i, i + this.BATCH_SIZE);
      
      const batchPromises = batch.map(async (transaction) => {
        try {
          const result = await this.categorizeTransaction(transaction);
          completed++;
          return result;
        } catch (error) {
          failed++;
          console.error('Failed to categorize transaction:', transaction.description, error);
          return {
            ...transaction,
            isIncome: transaction.amount > 0,
            incomeType: transaction.amount > 0 ? 'Other' : null,
            category: 'Uncategorised',
            budgetGroup: 'Needs' as const,
            smartGoal: 'Failed to categorize'
          };
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
      if (i + this.BATCH_SIZE < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  public async categorizeTransactions(
    transactions: Transaction[],
    onProgress: (progress: CategorizationProgress) => void
  ): Promise<CategorizedTransaction[]> {
    console.log(`🧠 Starting Claude categorization for ${transactions.length} transactions...`);
    
    if (!this.claudeApiKey) {
      throw new Error('Claude API key not configured. Please set CLAUDE_API_KEY in Supabase secrets.');
    }

    if (transactions.length === 0) {
      return [];
    }

    const categorizedTransactions = await this.processBatch(transactions, onProgress);
    
    // Store categorized transactions in localStorage
    localStorage.setItem('categorizedTransactions', JSON.stringify(categorizedTransactions));
    
    console.log(`✅ Claude categorization complete: ${categorizedTransactions.length} transactions processed`);
    
    return categorizedTransactions;
  }

  public getCachedCategorizedTransactions(): CategorizedTransaction[] {
    try {
      const cached = localStorage.getItem('categorizedTransactions');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error reading cached categorized transactions:', error);
      return [];
    }
  }

  public clearCache(): void {
    localStorage.removeItem('categorizedTransactions');
  }
}

export const claudeTransactionCategorizer = new ClaudeTransactionCategorizer();