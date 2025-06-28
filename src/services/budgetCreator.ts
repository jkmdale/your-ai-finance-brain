import { supabase } from '@/integrations/supabase/client';
import { keyManagerService } from './keyManagerService';
import { ClaudeAIService, type CategorizationResult } from './claude-ai-service';

interface TransactionSummary {
  category: string;
  totalAmount: number;
  transactionCount: number;
  isIncome: boolean;
  averageAmount: number;
  confidence?: number;
}

interface BudgetCreationResult {
  budgetId: string;
  categoriesCreated: number;
  totalIncome: number;
  totalExpenses: number;
  aiSuggestions?: {
    recommendations: string;
    suggestedGoals: Array<{
      name: string;
      target_amount: number;
      rationale: string;
      priority: 'high' | 'medium' | 'low';
    }>;
  };
  categoryInsights: Array<{
    category: string;
    currentSpending: number;
    suggestedLimit: number;
    reasoning: string;
  }>;
}

export class BudgetCreator {
  private claudeService?: ClaudeAIService;

  constructor(claudeApiKey?: string) {
    if (claudeApiKey) {
      this.claudeService = new ClaudeAIService(claudeApiKey);
    }
  }

  async createBudgetFromTransactions(
    userId: string, 
    transactions: any[], 
    periodName: string = 'Auto-Generated Budget'
  ): Promise<BudgetCreationResult> {
    try {
      // Calculate start and end dates from transactions
      const dates = transactions
        .map(t => new Date(t.transaction_date || t.date))
        .sort((a, b) => a.getTime() - b.getTime());
      
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      // Create or get categories for this user
      const categoryMap = await this.ensureUserCategories(userId, transactions);

      // Group transactions by category with enhanced analysis
      const categoryTotals = this.groupTransactionsByCategory(transactions, categoryMap);
      const categoryInsights = this.generateCategoryInsights(categoryTotals);

      // Get AI suggestions if available
      let aiSuggestions;
      if (this.claudeService) {
        try {
          const totalIncome = Array.from(categoryTotals.values())
            .filter(c => c.isIncome)
            .reduce((sum, c) => sum + c.totalAmount, 0);
          
          const totalExpenses = Array.from(categoryTotals.values())
            .filter(c => !c.isIncome)
            .reduce((sum, c) => sum + c.totalAmount, 0);

          const financialData = {
            totalBalance: 0, // Would need account data
            monthlyIncome: totalIncome,
            monthlyExpenses: totalExpenses,
            transactions: transactions.map(t => ({
              id: t.id,
              description: t.description,
              amount: t.amount,
              date: t.transaction_date || t.date,
              merchant: t.merchant,
              category: t.category,
              is_income: t.is_income
            }))
          };

          aiSuggestions = await this.claudeService.generateSmartBudgetRecommendations(financialData);
        } catch (error) {
          console.warn('AI suggestions failed:', error);
        }
      }

      // Encrypt budget data
      const budgetData = {
        name: periodName,
        total_income: 0,
        total_expenses: 0,
        ai_suggestions: aiSuggestions
      };

      const { encryptedData, metadata } = await keyManagerService.encryptForStorage(budgetData);

      // Create the budget with encrypted data
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          name: '[ENCRYPTED]',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          period_type: 'custom',
          is_active: true,
          total_income: 0,
          total_expenses: 0,
          encrypted_data: encryptedData,
          encryption_metadata: metadata
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Create budget categories with AI-suggested limits
      let totalIncome = 0;
      let totalExpenses = 0;
      let categoriesCreated = 0;

      for (const [categoryId, summary] of categoryTotals.entries()) {
        const insight = categoryInsights.find(i => i.category === summary.category);
        const allocatedAmount = insight?.suggestedLimit || summary.totalAmount;

        const { error: categoryError } = await supabase
          .from('budget_categories')
          .insert({
            budget_id: budget.id,
            category_id: categoryId,
            allocated_amount: allocatedAmount,
            spent_amount: summary.totalAmount
          });

        if (categoryError) {
          console.warn('Error creating budget category:', categoryError);
          continue;
        }

        if (summary.isIncome) {
          totalIncome += summary.totalAmount;
        } else {
          totalExpenses += summary.totalAmount;
        }
        categoriesCreated++;
      }

      // Update budget totals
      const updatedBudgetData = {
        name: periodName,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        ai_suggestions: aiSuggestions
      };

      const { encryptedData: updatedEncrypted, metadata: updatedMetadata } = 
        await keyManagerService.encryptForStorage(updatedBudgetData);

      await supabase
        .from('budgets')
        .update({
          encrypted_data: updatedEncrypted,
          encryption_metadata: updatedMetadata
        })
        .eq('id', budget.id);

      return {
        budgetId: budget.id,
        categoriesCreated,
        totalIncome,
        totalExpenses,
        aiSuggestions,
        categoryInsights
      };

    } catch (error) {
      console.error('Error creating budget from transactions:', error);
      throw error;
    }
  }

  private generateCategoryInsights(categoryTotals: Map<string, TransactionSummary>): Array<{
    category: string;
    currentSpending: number;
    suggestedLimit: number;
    reasoning: string;
  }> {
    const insights = [];
    
    for (const [_, summary] of categoryTotals.entries()) {
      if (summary.isIncome) continue;

      let suggestedLimit = summary.totalAmount;
      let reasoning = 'Maintain current spending level';

      // Apply heuristic rules for common overspending categories
      if (summary.category.toLowerCase().includes('dining') || summary.category.toLowerCase().includes('food')) {
        if (summary.totalAmount > 800) { // High dining spend
          suggestedLimit = summary.totalAmount * 0.8;
          reasoning = 'Consider reducing dining out by 20% and cooking more at home';
        }
      } else if (summary.category.toLowerCase().includes('entertainment')) {
        if (summary.totalAmount > 400) {
          suggestedLimit = summary.totalAmount * 0.85;
          reasoning = 'Look for free entertainment alternatives to reduce spending by 15%';
        }
      } else if (summary.category.toLowerCase().includes('shopping')) {
        if (summary.averageAmount > 200) {
          suggestedLimit = summary.totalAmount * 0.9;
          reasoning = 'Review shopping habits - consider 24-hour rule before purchases';
        }
      }

      insights.push({
        category: summary.category,
        currentSpending: summary.totalAmount,
        suggestedLimit: Math.round(suggestedLimit),
        reasoning
      });
    }

    return insights;
  }

  private async ensureUserCategories(userId: string, transactions: any[]): Promise<Map<string, any>> {
    // Get existing categories
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    const categoryMap = new Map();
    const existingCategoryNames = new Set(existingCategories?.map(c => c.name.toLowerCase()) || []);

    // Add existing categories to map
    existingCategories?.forEach(category => {
      categoryMap.set(category.name.toLowerCase(), category);
    });

    // Extract unique categories from transactions
    const transactionCategories = new Set(
      transactions
        .map(t => t.category?.toLowerCase())
        .filter(c => c && !existingCategoryNames.has(c))
    );

    // Create missing categories
    const newCategories = [];
    for (const categoryName of transactionCategories) {
      newCategories.push({
        user_id: userId,
        name: this.formatCategoryName(categoryName),
        is_income: this.isIncomeCategory(categoryName),
        color: this.getRandomColor(),
        icon: this.getCategoryIcon(categoryName)
      });
    }

    if (newCategories.length > 0) {
      const { data: createdCategories } = await supabase
        .from('categories')
        .insert(newCategories)
        .select();

      // Add new categories to map
      createdCategories?.forEach(category => {
        categoryMap.set(category.name.toLowerCase(), category);
      });
    }

    return categoryMap;
  }

  private groupTransactionsByCategory(transactions: any[], categoryMap: Map<string, any>): Map<string, TransactionSummary> {
    const categoryTotals = new Map<string, TransactionSummary>();

    transactions.forEach(transaction => {
      const categoryName = transaction.category?.toLowerCase() || 'other';
      const category = categoryMap.get(categoryName);
      
      if (!category) return;

      const existing = categoryTotals.get(category.id) || {
        category: category.name,
        totalAmount: 0,
        transactionCount: 0,
        isIncome: category.is_income || transaction.is_income,
        averageAmount: 0
      };

      existing.totalAmount += Math.abs(transaction.amount);
      existing.transactionCount += 1;
      existing.averageAmount = existing.totalAmount / existing.transactionCount;

      categoryTotals.set(category.id, existing);
    });

    return categoryTotals;
  }

  private formatCategoryName(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private isIncomeCategory(categoryName: string): boolean {
    const incomePatterns = ['salary', 'income', 'wage', 'dividend', 'interest', 'refund'];
    return incomePatterns.some(pattern => categoryName.includes(pattern));
  }

  private getRandomColor(): string {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private getCategoryIcon(categoryName: string): string {
    const iconMap: { [key: string]: string } = {
      'housing': '🏠',
      'groceries': '🛒',
      'transport': '🚗',
      'dining': '🍽️',
      'entertainment': '🎬',
      'health': '💊',
      'salary': '💰',
      'other': '📄'
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (categoryName.includes(key)) return icon;
    }
    return '📄';
  }

  // Method to update existing budgets when new transactions are added
  async updateBudgetWithNewTransactions(budgetId: string, newTransactions: any[]): Promise<void> {
    try {
      // Get existing budget
      const { data: budget } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .single();

      if (!budget) throw new Error('Budget not found');

      // Decrypt and update budget data
      const decryptedData = await keyManagerService.decryptFromStorage(
        budget.encrypted_data, 
        budget.encryption_metadata
      );

      // Process new transactions and update categories
      const categoryMap = new Map(); // Would need to fetch existing categories
      const newCategoryTotals = this.groupTransactionsByCategory(newTransactions, categoryMap);

      // Update budget categories with new spending
      for (const [categoryId, summary] of newCategoryTotals.entries()) {
        const { error } = await supabase
          .from('budget_categories')
          .update({
            spent_amount: summary.totalAmount
          })
          .eq('budget_id', budgetId)
          .eq('category_id', categoryId);

        if (error) {
          console.warn(`Error updating budget category: ${error.message}`);
        }
      }

      console.log(`Updated budget ${budgetId} with ${newTransactions.length} new transactions`);
    } catch (error) {
      console.error('Error updating budget with new transactions:', error);
      throw error;
    }
  }
}

export const budgetCreator = new BudgetCreator();
