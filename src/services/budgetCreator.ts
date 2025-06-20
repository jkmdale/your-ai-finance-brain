
import { supabase } from '@/integrations/supabase/client';

interface TransactionSummary {
  category: string;
  totalAmount: number;
  transactionCount: number;
  isIncome: boolean;
}

interface BudgetCreationResult {
  budgetId: string;
  categoriesCreated: number;
  totalIncome: number;
  totalExpenses: number;
}

export class BudgetCreator {
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

      // Create the budget
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          name: periodName,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          period_type: 'custom',
          is_active: true,
          total_income: 0, // Will be calculated
          total_expenses: 0 // Will be calculated
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Group transactions by category
      const categoryTotals = this.groupTransactionsByCategory(transactions, categoryMap);

      // Create budget categories
      let totalIncome = 0;
      let totalExpenses = 0;
      let categoriesCreated = 0;

      for (const [categoryId, summary] of categoryTotals.entries()) {
        const { data: budgetCategory, error: categoryError } = await supabase
          .from('budget_categories')
          .insert({
            budget_id: budget.id,
            category_id: categoryId,
            allocated_amount: summary.totalAmount,
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
      await supabase
        .from('budgets')
        .update({
          total_income: totalIncome,
          total_expenses: totalExpenses
        })
        .eq('id', budget.id);

      return {
        budgetId: budget.id,
        categoriesCreated,
        totalIncome,
        totalExpenses
      };

    } catch (error) {
      console.error('Error creating budget from transactions:', error);
      throw error;
    }
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
        isIncome: category.is_income || transaction.is_income
      };

      existing.totalAmount += Math.abs(transaction.amount);
      existing.transactionCount += 1;

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
}

export const budgetCreator = new BudgetCreator();
