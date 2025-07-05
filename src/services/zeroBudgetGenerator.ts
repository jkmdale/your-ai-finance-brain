/**
 * Zero-Based Budget Generator
 * Creates accurate budgets from transaction data with month-specific analysis
 */

import { supabase } from '@/integrations/supabase/client';

export interface MonthlyBudgetData {
  month: string; // YYYY-MM format
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  savingsRate: number;
  categories: {
    [categoryName: string]: {
      amount: number;
      budgetGroup: 'needs' | 'wants' | 'savings';
      transactionCount: number;
      averagePerTransaction: number;
      isIncome: boolean;
    };
  };
  insights: {
    topExpenseCategories: Array<{ name: string; amount: number; percentage: number }>;
    expensesByBudgetGroup: {
      needs: number;
      wants: number;
      savings: number;
    };
    monthOverMonthChange?: {
      incomeChange: number;
      expenseChange: number;
      savingsChange: number;
    };
  };
}

export interface BudgetRecommendations {
  emergencyFundTarget: number;
  monthlyBudgetAllocation: {
    needs: { amount: number; percentage: number };
    wants: { amount: number; percentage: number };
    savings: { amount: number; percentage: number };
  };
  categoryRecommendations: Array<{
    category: string;
    currentSpending: number;
    recommendedLimit: number;
    rationale: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  riskLevel: 'healthy' | 'moderate' | 'concerning' | 'critical';
  actionableSteps: string[];
}

export class ZeroBudgetGenerator {
  /**
   * Generate comprehensive budget data for a specific month
   */
  async generateMonthlyBudget(
    userId: string,
    targetMonth: string // YYYY-MM format
  ): Promise<MonthlyBudgetData> {
    console.log(`💰 Generating zero-based budget for ${targetMonth}...`);

    // Get all transactions for the target month
    const startDate = `${targetMonth}-01`;
    const endDate = new Date(parseInt(targetMonth.split('-')[0]), parseInt(targetMonth.split('-')[1]), 0)
      .toISOString().split('T')[0]; // Last day of month

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        categories(name, color, is_income)
      `)
      .eq('user_id', userId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .not('tags', 'cs', '{transfer}') // Exclude transfers
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    if (!transactions || transactions.length === 0) {
      console.log(`📊 No transactions found for ${targetMonth}`);
      return this.createEmptyBudgetData(targetMonth);
    }

    console.log(`📊 Processing ${transactions.length} transactions for ${targetMonth}`);

    // Categorize and analyze transactions 
    const categorizedData = this.analyzeTransactionsByCategory(transactions);
    
    // Calculate totals
    const totalIncome = this.calculateIncome(categorizedData);
    const totalExpenses = this.calculateExpenses(categorizedData);
    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    // Generate insights
    const insights = this.generateInsights(categorizedData, totalIncome, totalExpenses);

    // Get month-over-month comparison if previous month exists
    const previousMonth = this.getPreviousMonth(targetMonth);
    const monthOverMonthChange = await this.calculateMonthOverMonthChange(
      userId, 
      targetMonth, 
      previousMonth
    );

    return {
      month: targetMonth,
      totalIncome,
      totalExpenses,
      savings,
      savingsRate,
      categories: categorizedData,
      insights: {
        ...insights,
        monthOverMonthChange
      }
    };
  }

  /**
   * Generate budget recommendations based on transaction history
   */
  async generateBudgetRecommendations(
    userId: string,
    monthlyBudgets: MonthlyBudgetData[]
  ): Promise<BudgetRecommendations> {
    if (monthlyBudgets.length === 0) {
      throw new Error('No monthly budget data available for recommendations');
    }

    console.log(`🎯 Generating budget recommendations based on ${monthlyBudgets.length} months of data...`);

    // Calculate averages from recent months
    const recentMonths = monthlyBudgets.slice(0, 3); // Last 3 months
    const avgIncome = recentMonths.reduce((sum, m) => sum + m.totalIncome, 0) / recentMonths.length;
    const avgExpenses = recentMonths.reduce((sum, m) => sum + m.totalExpenses, 0) / recentMonths.length;
    const avgSavingsRate = recentMonths.reduce((sum, m) => sum + m.savingsRate, 0) / recentMonths.length;

    // Calculate emergency fund target (3-6 months of expenses)
    const emergencyFundTarget = avgExpenses * 4; // 4 months as middle ground

    // Analyze spending by budget groups
    const avgExpensesByGroup = this.calculateAverageExpensesByGroup(recentMonths);

    // Generate 50/30/20 rule recommendations based on actual income
    const budgetAllocation = this.generate503020Allocation(avgIncome);

    // Generate category-specific recommendations
    const categoryRecommendations = this.generateCategoryRecommendations(recentMonths, avgIncome);

    // Assess financial risk level
    const riskLevel = this.assessFinancialRisk(avgIncome, avgExpenses, avgSavingsRate, avgExpensesByGroup);

    // Generate actionable steps
    const actionableSteps = this.generateActionableSteps(
      riskLevel,
      avgSavingsRate,
      avgExpensesByGroup,
      avgIncome
    );

    return {
      emergencyFundTarget,
      monthlyBudgetAllocation: budgetAllocation,
      categoryRecommendations,
      riskLevel,
      actionableSteps
    };
  }

  /**
   * Create/update budget in Supabase based on generated recommendations
   */
  async saveBudgetToSupabase(
    userId: string,
    monthlyBudget: MonthlyBudgetData,
    recommendations: BudgetRecommendations
  ): Promise<string> {
    console.log(`💾 Saving budget for ${monthlyBudget.month} to Supabase...`);

    // Check if budget already exists for this month
    const { data: existingBudget } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', userId)
      .eq('start_date', `${monthlyBudget.month}-01`)
      .eq('is_active', true)
      .single();

    let budgetId: string;

    if (existingBudget) {
      // Update existing budget
      const { error } = await supabase
        .from('budgets')
        .update({
          total_income: monthlyBudget.totalIncome,
          total_expenses: monthlyBudget.totalExpenses,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingBudget.id);

      if (error) throw error;
      budgetId = existingBudget.id;
      console.log(`✅ Updated existing budget: ${budgetId}`);
    } else {
      // Create new budget
      const endDate = new Date(
        parseInt(monthlyBudget.month.split('-')[0]), 
        parseInt(monthlyBudget.month.split('-')[1]), 
        0
      ).toISOString().split('T')[0];

      const { data: newBudget, error } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          name: `Budget for ${monthlyBudget.month}`,
          start_date: `${monthlyBudget.month}-01`,
          end_date: endDate,
          period_type: 'monthly',
          total_income: monthlyBudget.totalIncome,
          total_expenses: monthlyBudget.totalExpenses,
          is_active: true
        })
        .select('id')
        .single();

      if (error) throw error;
      budgetId = newBudget.id;
      console.log(`✅ Created new budget: ${budgetId}`);
    }

    // Save budget categories with recommendations
    await this.saveBudgetCategories(budgetId, monthlyBudget, recommendations, userId);

    return budgetId;
  }

  // Private helper methods

  private analyzeTransactionsByCategory(transactions: any[]): MonthlyBudgetData['categories'] {
    const categories: MonthlyBudgetData['categories'] = {};

    for (const transaction of transactions) {
      const categoryName = transaction.categories?.name || 'Uncategorized';
      const isIncome = transaction.is_income;
      const amount = Math.abs(transaction.amount);
      
      // Determine budget group from tags
      const budgetGroup = this.determineBudgetGroup(transaction.tags, isIncome);

      if (!categories[categoryName]) {
        categories[categoryName] = {
          amount: 0,
          budgetGroup,
          transactionCount: 0,
          averagePerTransaction: 0,
          isIncome
        };
      }

      categories[categoryName].amount += amount;
      categories[categoryName].transactionCount += 1;
      categories[categoryName].averagePerTransaction = 
        categories[categoryName].amount / categories[categoryName].transactionCount;
    }

    return categories;
  }

  private determineBudgetGroup(tags: string[] | null, isIncome: boolean): 'needs' | 'wants' | 'savings' {
    if (isIncome) return 'savings'; // Income goes to savings potential
    if (!tags || tags.length === 0) return 'wants'; // Default to wants if no tags
    
    const tag = tags[0].toLowerCase();
    if (['needs', 'wants', 'savings'].includes(tag)) {
      return tag as 'needs' | 'wants' | 'savings';
    }
    
    return 'wants'; // Default
  }

  private calculateIncome(categories: MonthlyBudgetData['categories']): number {
    return Object.values(categories)
      .filter(cat => cat.isIncome)
      .reduce((sum, cat) => sum + cat.amount, 0);
  }

  private calculateExpenses(categories: MonthlyBudgetData['categories']): number {
    return Object.values(categories)
      .filter(cat => !cat.isIncome)
      .reduce((sum, cat) => sum + cat.amount, 0);
  }

  private generateInsights(
    categories: MonthlyBudgetData['categories'],
    totalIncome: number,
    totalExpenses: number
  ): MonthlyBudgetData['insights'] {
    // Top expense categories
    const expenseCategories = Object.entries(categories)
      .filter(([_, cat]) => !cat.isIncome)
      .sort(([_, a], [__, b]) => b.amount - a.amount)
      .slice(0, 5);

    const topExpenseCategories = expenseCategories.map(([name, cat]) => ({
      name,
      amount: cat.amount,
      percentage: totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0
    }));

    // Expenses by budget group
    const expensesByBudgetGroup = {
      needs: 0,
      wants: 0,
      savings: 0
    };

    Object.values(categories).forEach(cat => {
      if (!cat.isIncome) {
        expensesByBudgetGroup[cat.budgetGroup] += cat.amount;
      }
    });

    return {
      topExpenseCategories,
      expensesByBudgetGroup
    };
  }

  private async calculateMonthOverMonthChange(
    userId: string,
    currentMonth: string,
    previousMonth: string
  ): Promise<MonthlyBudgetData['insights']['monthOverMonthChange']> {
    try {
      const previousBudget = await this.generateMonthlyBudget(userId, previousMonth);
      
      return {
        incomeChange: ((this.calculateIncome(previousBudget.categories) - previousBudget.totalIncome) / previousBudget.totalIncome) * 100,
        expenseChange: ((this.calculateExpenses(previousBudget.categories) - previousBudget.totalExpenses) / previousBudget.totalExpenses) * 100,
        savingsChange: ((previousBudget.savings - previousBudget.savings) / Math.abs(previousBudget.savings || 1)) * 100
      };
    } catch (error) {
      console.warn('Could not calculate month-over-month change:', error);
      return undefined;
    }
  }

  private getPreviousMonth(month: string): string {
    const [year, monthNum] = month.split('-').map(Number);
    const prevDate = new Date(year, monthNum - 2); // monthNum is 1-based, so -2 gets previous month
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  }

  private calculateAverageExpensesByGroup(monthlyBudgets: MonthlyBudgetData[]): { needs: number; wants: number; savings: number } {
    const totals = { needs: 0, wants: 0, savings: 0 };
    
    monthlyBudgets.forEach(budget => {
      totals.needs += budget.insights.expensesByBudgetGroup.needs;
      totals.wants += budget.insights.expensesByBudgetGroup.wants;
      totals.savings += budget.insights.expensesByBudgetGroup.savings;
    });

    return {
      needs: totals.needs / monthlyBudgets.length,
      wants: totals.wants / monthlyBudgets.length,
      savings: totals.savings / monthlyBudgets.length
    };
  }

  private generate503020Allocation(avgIncome: number): BudgetRecommendations['monthlyBudgetAllocation'] {
    return {
      needs: { amount: avgIncome * 0.5, percentage: 50 },
      wants: { amount: avgIncome * 0.3, percentage: 30 },
      savings: { amount: avgIncome * 0.2, percentage: 20 }
    };
  }

  private generateCategoryRecommendations(
    recentMonths: MonthlyBudgetData[],
    avgIncome: number
  ): BudgetRecommendations['categoryRecommendations'] {
    const recommendations: BudgetRecommendations['categoryRecommendations'] = [];
    
    // Collect all categories across months
    const categoryTotals: { [name: string]: { total: number; count: number; budgetGroup: string; isIncome: boolean } } = {};
    
    recentMonths.forEach(month => {
      Object.entries(month.categories).forEach(([name, cat]) => {
        if (!categoryTotals[name]) {
          categoryTotals[name] = { total: 0, count: 0, budgetGroup: cat.budgetGroup, isIncome: cat.isIncome };
        }
        categoryTotals[name].total += cat.amount;
        categoryTotals[name].count += 1;
      });
    });

    // Generate recommendations for top expense categories
    const topExpenseCategories = Object.entries(categoryTotals)
      .filter(([_, data]) => !data.isIncome)
      .sort(([_, a], [__, b]) => b.total - a.total)
      .slice(0, 8);

    topExpenseCategories.forEach(([categoryName, data]) => {
      const avgSpending = data.total / data.count;
      const percentageOfIncome = (avgSpending / avgIncome) * 100;
      
      let recommendedLimit = avgSpending;
      let rationale = 'Maintain current spending level';
      let priority: 'high' | 'medium' | 'low' = 'low';

      // Apply category-specific rules
      if (categoryName.toLowerCase().includes('dining') || categoryName.toLowerCase().includes('food')) {
        if (percentageOfIncome > 15) {
          recommendedLimit = avgSpending * 0.8;
          rationale = 'Dining expenses are above recommended 10-15% of income. Try cooking more meals at home.';
          priority = 'high';
        }
      } else if (categoryName.toLowerCase().includes('entertainment')) {
        if (percentageOfIncome > 10) {
          recommendedLimit = avgSpending * 0.75;
          rationale = 'Entertainment spending exceeds 10% of income. Look for free activities and limit subscriptions.';
          priority = 'medium';
        }
      } else if (categoryName.toLowerCase().includes('shopping')) {
        if (percentageOfIncome > 8) {
          recommendedLimit = avgSpending * 0.7;
          rationale = 'Shopping expenses are high. Implement a 24-hour rule before non-essential purchases.';
          priority = 'medium';
        }
      } else if (data.budgetGroup === 'wants' && percentageOfIncome > 12) {
        recommendedLimit = avgSpending * 0.85;
        rationale = 'This discretionary category is consuming a large portion of income. Consider reducing by 15%.';
        priority = 'medium';
      }

      recommendations.push({
        category: categoryName,
        currentSpending: avgSpending,
        recommendedLimit: Math.round(recommendedLimit),
        rationale,
        priority
      });
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private assessFinancialRisk(
    avgIncome: number,
    avgExpenses: number,
    avgSavingsRate: number,
    expensesByGroup: { needs: number; wants: number; savings: number }
  ): 'healthy' | 'moderate' | 'concerning' | 'critical' {
    // Critical: Spending more than earning
    if (avgExpenses > avgIncome) return 'critical';
    
    // Concerning: Very low savings rate or high discretionary spending
    if (avgSavingsRate < 5 || (expensesByGroup.wants / avgIncome) > 0.4) return 'concerning';
    
    // Moderate: Below recommended savings rate
    if (avgSavingsRate < 15 || (expensesByGroup.needs / avgIncome) > 0.6) return 'moderate';
    
    // Healthy: Good savings rate and balanced spending
    return 'healthy';
  }

  private generateActionableSteps(
    riskLevel: BudgetRecommendations['riskLevel'],
    avgSavingsRate: number,
    expensesByGroup: { needs: number; wants: number; savings: number },
    avgIncome: number
  ): string[] {
    const steps: string[] = [];

    switch (riskLevel) {
      case 'critical':
        steps.push('🚨 URGENT: You\'re spending more than you earn. Immediately review and cut non-essential expenses.');
        steps.push('💰 Focus on increasing income through side hustles or requesting a raise.');
        steps.push('🏠 Review housing costs - consider downsizing if rent/mortgage exceeds 30% of income.');
        break;
        
      case 'concerning':
        steps.push('⚠️ Build an emergency fund of at least $1,000 before other financial goals.');
        steps.push('📱 Cancel unused subscriptions and memberships.');
        steps.push('🍽️ Reduce dining out by 50% and cook more meals at home.');
        break;
        
      case 'moderate':
        steps.push('📈 Increase savings rate to at least 15% of income.');
        steps.push('🎯 Set up automatic transfers to savings account.');
        steps.push('💡 Look for ways to reduce utility and recurring expenses.');
        break;
        
      case 'healthy':
        steps.push('🎉 Great job maintaining healthy finances!');
        steps.push('🚀 Consider increasing investments or retirement contributions.');
        steps.push('🎯 Set specific financial goals like home ownership or vacation fund.');
        break;
    }

    // Add specific recommendations based on spending patterns
    const wantsPercentage = (expensesByGroup.wants / avgIncome) * 100;
    if (wantsPercentage > 35) {
      steps.push(`🛍️ Your discretionary spending is ${wantsPercentage.toFixed(0)}% of income. Aim for 30% or less.`);
    }

    if (avgSavingsRate < 10) {
      steps.push('💰 Try the "pay yourself first" strategy - save money immediately when you receive income.');
    }

    return steps;
  }

  private async saveBudgetCategories(
    budgetId: string,
    monthlyBudget: MonthlyBudgetData,
    recommendations: BudgetRecommendations,
    userId: string
  ): Promise<void> {
    // Get user's categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', userId);

    const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);

    // Prepare budget categories data
    const budgetCategories = Object.entries(monthlyBudget.categories).map(([name, data]) => {
      const categoryId = categoryMap.get(name);
      const recommendation = recommendations.categoryRecommendations.find(r => r.category === name);
      
      return {
        budget_id: budgetId,
        category_id: categoryId,
        allocated_amount: recommendation?.recommendedLimit || data.amount,
        spent_amount: data.amount
      };
    }).filter(cat => cat.category_id); // Only include categories we found in the database

    // Delete existing budget categories
    await supabase
      .from('budget_categories')
      .delete()
      .eq('budget_id', budgetId);

    // Insert new budget categories
    if (budgetCategories.length > 0) {
      const { error } = await supabase
        .from('budget_categories')
        .insert(budgetCategories);

      if (error) throw error;
      console.log(`✅ Saved ${budgetCategories.length} budget categories`);
    }
  }

  private createEmptyBudgetData(month: string): MonthlyBudgetData {
    return {
      month,
      totalIncome: 0,
      totalExpenses: 0,
      savings: 0,
      savingsRate: 0,
      categories: {},
      insights: {
        topExpenseCategories: [],
        expensesByBudgetGroup: { needs: 0, wants: 0, savings: 0 }
      }
    };
  }
}

export const zeroBudgetGenerator = new ZeroBudgetGenerator();