/**
 * SmartFinance Core - Main orchestration service
 * Integrates CSV processing, Claude categorization, budget generation, and SMART goals
 */

import { unifiedTransactionProcessor } from './unifiedTransactionProcessor';
import { zeroBudgetGenerator } from './zeroBudgetGenerator';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessingResult {
  success: boolean;
  transactionsProcessed: number;
  duplicatesSkipped: number;
  budgetGenerated: boolean;
  monthlyBudgets: string[]; // Month strings
  errors: string[];
  smartGoals?: Array<{
    name: string;
    target_amount: number;
    deadline: string;
    rationale: string;
  }>;
}

export class SmartFinanceCore {
  /**
   * Complete processing pipeline: CSV -> Categorization -> Budget -> Goals
   */
  async processCompleteWorkflow(
    files: FileList,
    userId: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      success: false,
      transactionsProcessed: 0,
      duplicatesSkipped: 0,
      budgetGenerated: false,
      monthlyBudgets: [],
      errors: []
    };

    try {
      // Stage 1: Process CSV files
      onProgress?.('Processing CSV files...', 10);
      const processingResult = await unifiedTransactionProcessor.processCSVFiles(files, userId);
      
      result.transactionsProcessed = processingResult.transactions.length;
      result.duplicatesSkipped = processingResult.summary.duplicatesSkipped;
      result.errors.push(...processingResult.summary.errors);

      if (processingResult.transactions.length === 0) {
        result.success = true;
        return result;
      }

      // Stage 2: Claude categorization
      onProgress?.('AI categorizing transactions...', 30);
      const categorizedTransactions = await unifiedTransactionProcessor.categorizeWithClaude(
        processingResult.transactions,
        (completed, total) => {
          const progress = 30 + (completed / total) * 40;
          onProgress?.(`AI categorizing: ${completed}/${total}`, progress);
        }
      );

      // Stage 3: Save to Supabase
      onProgress?.('Saving to database...', 75);
      await unifiedTransactionProcessor.saveToSupabase(categorizedTransactions, userId);

      // Stage 4: Generate budgets for each month
      onProgress?.('Generating budgets...', 85);
      const months = this.getUniqueMonths(categorizedTransactions);
      const monthlyBudgets = [];

      for (const month of months) {
        const budget = await zeroBudgetGenerator.generateMonthlyBudget(userId, month);
        const recommendations = await zeroBudgetGenerator.generateBudgetRecommendations(userId, [budget]);
        await zeroBudgetGenerator.saveBudgetToSupabase(userId, budget, recommendations);
        monthlyBudgets.push(month);
      }

      result.monthlyBudgets = monthlyBudgets;
      result.budgetGenerated = true;

      // Stage 5: Generate SMART goals
      onProgress?.('Generating SMART goals...', 95);
      result.smartGoals = await this.generateSmartGoals(userId, monthlyBudgets);

      onProgress?.('Complete!', 100);
      result.success = true;

    } catch (error: any) {
      console.error('SmartFinance workflow error:', error);
      result.errors.push(error.message);
    }

    return result;
  }

  private getUniqueMonths(transactions: any[]): string[] {
    const months = new Set<string>();
    transactions.forEach(tx => {
      const month = tx.date.substring(0, 7); // YYYY-MM
      months.add(month);
    });
    return Array.from(months).sort();
  }

  private async generateSmartGoals(userId: string, months: string[]): Promise<ProcessingResult['smartGoals']> {
    if (months.length === 0) return [];

    try {
      // Get latest budget data
      const latestMonth = months[months.length - 1];
      const budget = await zeroBudgetGenerator.generateMonthlyBudget(userId, latestMonth);

      const goals: ProcessingResult['smartGoals'] = [];

      // Emergency fund goal
      if (budget.savings < budget.totalExpenses * 3) {
        goals.push({
          name: "Build Emergency Fund",
          target_amount: budget.totalExpenses * 4,
          deadline: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          rationale: "Build 4 months of expenses for financial security"
        });
      }

      // Savings rate improvement
      if (budget.savingsRate < 20) {
        const targetMonthlySavings = budget.totalIncome * 0.2;
        goals.push({
          name: "Improve Savings Rate",
          target_amount: targetMonthlySavings,
          deadline: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          rationale: "Increase monthly savings to 20% of income"
        });
      }

      // Category-specific goal (top expense)
      const topExpense = budget.insights.topExpenseCategories[0];
      if (topExpense && topExpense.percentage > 15) {
        goals.push({
          name: `Reduce ${topExpense.name} Spending`,
          target_amount: topExpense.amount * 0.8,
          deadline: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          rationale: `Reduce ${topExpense.name} by 20% to improve budget balance`
        });
      }

      return goals.slice(0, 3); // Max 3 goals
    } catch (error) {
      console.error('Error generating SMART goals:', error);
      return [];
    }
  }
}

export const smartFinanceCore = new SmartFinanceCore();