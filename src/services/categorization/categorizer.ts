import { ClaudeApiClient } from './api-client';
import { createIncomePrompt, createExpensePrompt } from './prompts';
import { CLAUDE_CONFIG, BUDGET_GROUPS } from './config';
import type { Transaction, CategorizedTransaction, CategorizationResult } from '@/types/categorization';

export class TransactionCategorizer {
  private apiClient: ClaudeApiClient;

  constructor(apiClient: ClaudeApiClient) {
    this.apiClient = apiClient;
  }

  async categorize(transaction: Transaction, retryCount = 0): Promise<CategorizedTransaction> {
    if (!this.apiClient.isConfigured()) {
      throw new Error('Claude API key not configured');
    }

    try {
      const result = transaction.amount > 0 
        ? await this.categorizeIncome(transaction)
        : await this.categorizeExpense(transaction);
      
      return result;
    } catch (error) {
      console.error(`Error categorizing transaction: ${transaction.description}`, error);
      
      // Retry once on failure
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, CLAUDE_CONFIG.RETRY_DELAY));
        return this.categorize(transaction, 1);
      }
      
      // Fallback for failed categorization
      return this.createFallbackCategorization(transaction);
    }
  }

  private async categorizeIncome(transaction: Transaction): Promise<CategorizedTransaction> {
    const prompt = createIncomePrompt(transaction);
    const result = await this.apiClient.callClaude(prompt);
    
    return {
      ...transaction,
      isIncome: result.isIncome || false,
      incomeType: result.incomeType || 'Other',
      category: result.category || 'Other Income',
      budgetGroup: BUDGET_GROUPS.includes(result.budgetGroup as any) ? result.budgetGroup as any : 'Savings',
      smartGoal: result.smartGoal || 'Track income source'
    };
  }

  private async categorizeExpense(transaction: Transaction): Promise<CategorizedTransaction> {
    const prompt = createExpensePrompt(transaction);
    const result = await this.apiClient.callClaude(prompt);
    
    return {
      ...transaction,
      isIncome: false,
      incomeType: null,
      category: result.category || 'Uncategorised',
      budgetGroup: BUDGET_GROUPS.includes(result.budgetGroup as any) ? result.budgetGroup as any : 'Needs',
      smartGoal: result.smartGoal || 'Track spending in this category'
    };
  }

  private createFallbackCategorization(transaction: Transaction): CategorizedTransaction {
    return {
      ...transaction,
      isIncome: transaction.amount > 0,
      incomeType: transaction.amount > 0 ? 'Other' : null,
      category: transaction.amount > 0 ? 'Other Income' : 'Uncategorised',
      budgetGroup: transaction.amount > 0 ? 'Savings' : 'Needs',
      smartGoal: 'Review and categorize manually'
    };
  }
}