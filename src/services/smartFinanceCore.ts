/**
 * SmartFinance Core - Main orchestration service
 * Integrates CSV processing, Claude categorization, budget generation, and SMART goals
 */

import { CSVProcessingService } from './csvProcessingService';
import { zeroBudgetGenerator } from './zeroBudgetGenerator';
import { smartGoalsService } from './smartGoalsService';
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
  // New fields for detailed feedback
  skippedRows?: number;
  totalRowsProcessed?: number;
  skippedRowDetails?: Array<{
    rowNumber: number;
    error: string;
    dateValue?: string;
    amountValue?: string;
  }>;
}

export class SmartFinanceCore {
  private csvProcessor = new CSVProcessingService();

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
      errors: [],
      skippedRows: 0,
      totalRowsProcessed: 0,
      skippedRowDetails: []
    };

    try {
      // Stage 1: Process CSV files using new service
      onProgress?.('Processing CSV files...', 10);
      
      const processingResult = await this.csvProcessor.processCSVFiles(files, userId);
      
      result.transactionsProcessed = processingResult.transactions.length;
      result.duplicatesSkipped = processingResult.summary.duplicatesSkipped;
      result.errors.push(...processingResult.summary.errors);
      result.skippedRows = processingResult.summary.skippedRows;
      result.totalRowsProcessed = processingResult.summary.totalRows;
      result.skippedRowDetails = processingResult.summary.skippedRowDetails;
      
      if (processingResult.transactions.length === 0 && processingResult.summary.errors.length > 0) {
        // All rows were skipped due to errors
        result.errors.push(`No transactions could be processed. Please check your CSV format.`);
        result.success = false;
        return result;
      }

      if (processingResult.transactions.length === 0) {
        result.success = true;
        return result;
      }

      // Stage 2: Claude categorization (simulate for now - this would call AI service)
      onProgress?.('AI categorizing transactions...', 30);
      const categorizedTransactions = await this.categorizeTransactions(
        processingResult.transactions,
        (completed, total) => {
          const progress = 30 + (completed / total) * 40;
          onProgress?.(`AI categorizing: ${completed}/${total}`, progress);
        }
      );

      // Stage 3: Save to Supabase
      onProgress?.('Saving to database...', 75);
      await this.saveTransactionsToSupabase(categorizedTransactions, userId);

      // Stage 4: Generate budgets for each month
      onProgress?.('Generating budgets...', 85);
      const months = this.getUniqueMonths(categorizedTransactions);
      const monthlyBudgets = [];

      for (const month of months) {
        const budget = await zeroBudgetGenerator.generateMonthlyBudget(userId, month);
        if (budget) {
          monthlyBudgets.push(month);
        }
      }

      // Stage 5: Generate SMART goals
      onProgress?.('Generating SMART goals...', 95);
      const smartGoals = await this.generateSmartGoals(userId, months);

      // Final stage: Trigger dashboard updates
      onProgress?.('Updating dashboard...', 98);
      
      // Import and trigger dashboard updates
      const { updateDashboardState } = await import('@/modules/dashboard/update');
      updateDashboardState(categorizedTransactions);
      
      onProgress?.('Complete!', 100);

      result.success = true;
      result.budgetGenerated = monthlyBudgets.length > 0;
      result.monthlyBudgets = monthlyBudgets;
      result.smartGoals = smartGoals;

      console.log('✅ Complete workflow finished successfully:', {
        transactions: result.transactionsProcessed,
        budgets: monthlyBudgets.length,
        goals: smartGoals?.length || 0
      });

      return result;
    } catch (error) {
      console.error('❌ SmartFinanceCore workflow error:', error);
      result.errors.push(`Workflow error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
      return result;
    }
  }

  /**
   * Process CSV files for a specific bank
   */
  async processCSVFilesForBank(
    files: FileList,
    bankName: string,
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
      onProgress?.(`Processing ${bankName} CSV files...`, 10);
      
      // Use new CSV processor (it auto-detects bank format anyway)
      const processingResult = await this.csvProcessor.processCSVFiles(files, userId);
      
      result.transactionsProcessed = processingResult.transactions.length;
      result.duplicatesSkipped = processingResult.summary.duplicatesSkipped;
      result.errors.push(...processingResult.summary.errors);

      if (processingResult.transactions.length === 0) {
        result.success = true;
        return result;
      }

      // Categorize transactions
      onProgress?.('AI categorizing transactions...', 30);
      const categorizedTransactions = await this.categorizeTransactions(
        processingResult.transactions,
        (completed, total) => {
          const progress = 30 + (completed / total) * 40;
          onProgress?.(`AI categorizing: ${completed}/${total}`, progress);
        }
      );

      // Save to database
      onProgress?.('Saving to database...', 75);
      await this.saveTransactionsToSupabase(categorizedTransactions, userId);

      onProgress?.('Complete!', 100);
      result.success = true;

    } catch (error: any) {
      console.error(`SmartFinance ${bankName} processing error:`, error);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Process multiple bank CSV files separately
   */
  async processMultipleBankCSVs(
    filesByBank: Map<string, FileList>,
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
      const allTransactions = [];
      let totalProgress = 0;
      const bankCount = filesByBank.size;

      // Process each bank separately using new CSV processor
      for (const [bankName, files] of filesByBank) {
        onProgress?.(`Processing ${bankName} files...`, totalProgress);
        
        const processingResult = await this.csvProcessor.processCSVFiles(files, userId);
        result.transactionsProcessed += processingResult.transactions.length;
        result.duplicatesSkipped += processingResult.summary.duplicatesSkipped;
        result.errors.push(...processingResult.summary.errors);

        if (processingResult.transactions.length > 0) {
          // Categorize transactions for this bank
          const categorizedTransactions = await this.categorizeTransactions(
            processingResult.transactions
          );
          allTransactions.push(...categorizedTransactions);
        }

        totalProgress += (80 / bankCount);
        onProgress?.(`Processed ${bankName}`, totalProgress);
      }

      if (allTransactions.length > 0) {
        // Save all transactions to database
        onProgress?.('Saving all transactions to database...', 85);
        await this.saveTransactionsToSupabase(allTransactions, userId);

        // Generate budgets
        onProgress?.('Generating budgets...', 90);
        const months = this.getUniqueMonths(allTransactions);
        const monthlyBudgets = [];

        for (const month of months) {
          const budget = await zeroBudgetGenerator.generateMonthlyBudget(userId, month);
          const recommendations = await zeroBudgetGenerator.generateBudgetRecommendations(userId, [budget]);
          await zeroBudgetGenerator.saveBudgetToSupabase(userId, budget, recommendations);
          monthlyBudgets.push(month);
        }

        result.monthlyBudgets = monthlyBudgets;
        result.budgetGenerated = true;

        // Generate SMART goals
        onProgress?.('Generating SMART goals...', 95);
        result.smartGoals = await this.generateSmartGoals(userId, monthlyBudgets);
        
        if (result.smartGoals && result.smartGoals.length > 0) {
          await smartGoalsService.saveSmartGoals(userId, result.smartGoals);
        }
      }

      onProgress?.('Complete!', 100);
      result.success = true;

    } catch (error: any) {
      console.error('SmartFinance multi-bank processing error:', error);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Categorize transactions using AI (mock implementation)
   */
  private async categorizeTransactions(
    transactions: any[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<any[]> {
    // Mock categorization - in real implementation this would call Claude API
    const categorized = transactions.map((tx, index) => {
      onProgress?.(index + 1, transactions.length);
      
      // Simple category assignment based on description
      let category = 'Other';
      const desc = tx.description.toLowerCase();
      
      if (desc.includes('groceries') || desc.includes('supermarket') || desc.includes('food')) {
        category = 'Groceries';
      } else if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('gas')) {
        category = 'Transport';
      } else if (desc.includes('rent') || desc.includes('mortgage')) {
        category = 'Housing';
      } else if (desc.includes('salary') || desc.includes('wage')) {
        category = 'Income';
      }
      
      return {
        ...tx,
        category,
        merchant: this.extractMerchant(tx.description),
        is_income: tx.isIncome,
        source_bank: 'CSV Import'
      };
    });
    
    return categorized;
  }

  private extractMerchant(description: string): string {
    // Simple merchant extraction
    const parts = description.split(/\s+/);
    return parts.slice(0, 2).join(' ').substring(0, 50);
  }

  /**
   * Save transactions to Supabase
   */
  private async saveTransactionsToSupabase(transactions: any[], userId: string): Promise<void> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Ensure user has a bank account
    let { data: accounts } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    let accountId: string;
    if (!accounts || accounts.length === 0) {
      const { data: newAccount, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: userId,
          account_name: 'Imported Transactions',
          bank_name: 'Mixed Banks',
          account_type: 'checking',
          currency: 'NZD',
          balance: 0
        })
        .select('id')
        .single();

      if (error) throw error;
      accountId = newAccount.id;
    } else {
      accountId = accounts[0].id;
    }

    // Prepare and insert transactions
    const transactionsToInsert = transactions.map(tx => ({
      user_id: userId,
      account_id: accountId,
      transaction_date: tx.date,
      description: tx.description,
      amount: tx.amount,
      is_income: tx.is_income,
      merchant: tx.merchant || null,
      imported_from: `CSV Upload - ${tx.source_bank}`,
      tags: tx.category === 'Transfer' ? ['transfer'] : null
    }));

    const { error } = await supabase
      .from('transactions')
      .insert(transactionsToInsert);

    if (error) throw error;
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