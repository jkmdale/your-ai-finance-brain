/* File: src/modules/goals/recommendations.ts Description: Recommends SMART financial goals based on filtered transaction history and disposable income. */

import { Transaction } from '@/types/Transaction';

export interface SmartGoal {
  category: string;
  description: string;
  amount: number;
  timeframeMonths: number;
  achievabilityRating: 'Easy' | 'Moderate' | 'Challenging' | 'Unrealistic';
  rationale: string;
}

export interface BudgetSummary {
  totalIncome: number;
  totalExpenses: number;
  disposableIncome: number;
  hasDataSurplus: boolean;
  monthlyAverage: {
    income: number;
    expenses: number;
  };
}

export function calculateBudgetSummary(transactions: Transaction[]): BudgetSummary {
  // Filter out transfers and reversals first
  const validTransactions = transactions.filter(tx => 
    tx.category !== 'Transfer' && 
    !tx.description?.toLowerCase().includes('reversal') &&
    !tx.description?.toLowerCase().includes('refund')
  );

  const incomeTransactions = validTransactions.filter(tx => 
    tx.amount > 0 || tx.category?.includes('Income')
  );
  
  const expenseTransactions = validTransactions.filter(tx => 
    tx.amount < 0 && tx.category !== 'Income' && !tx.category?.includes('Income')
  );

  const totalIncome = incomeTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalExpenses = expenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const disposableIncome = totalIncome - totalExpenses;

  // Calculate monthly averages (assume data spans multiple months)
  const monthlyIncome = totalIncome / Math.max(1, Math.ceil(transactions.length / 30));
  const monthlyExpenses = totalExpenses / Math.max(1, Math.ceil(transactions.length / 30));

  return {
    totalIncome,
    totalExpenses,
    disposableIncome,
    hasDataSurplus: disposableIncome > 0,
    monthlyAverage: {
      income: monthlyIncome,
      expenses: monthlyExpenses
    }
  };
}

function determineAchievability(
  goalAmount: number, 
  timeframeMonths: number, 
  monthlyDisposable: number
): 'Easy' | 'Moderate' | 'Challenging' | 'Unrealistic' {
  const monthlyRequired = goalAmount / timeframeMonths;
  const ratio = monthlyRequired / monthlyDisposable;

  if (ratio <= 0.2) return 'Easy';
  if (ratio <= 0.4) return 'Moderate';
  if (ratio <= 0.7) return 'Challenging';
  return 'Unrealistic';
}

export function recommendSmartGoals(transactions: Transaction[]): SmartGoal[] {
  const budgetSummary = calculateBudgetSummary(transactions);
  
  console.log('💰 Budget Analysis:', {
    totalIncome: budgetSummary.totalIncome.toFixed(2),
    totalExpenses: budgetSummary.totalExpenses.toFixed(2),
    disposableIncome: budgetSummary.disposableIncome.toFixed(2),
    hasDataSurplus: budgetSummary.hasDataSurplus
  });

  const goals: SmartGoal[] = [];

  // If no surplus, return a message goal
  if (!budgetSummary.hasDataSurplus || budgetSummary.disposableIncome <= 0) {
    return [{
      category: 'Budget Analysis',
      description: 'Based on current budget, no surplus is available for goal saving. Focus on reducing expenses or increasing income first.',
      amount: 0,
      timeframeMonths: 0,
      achievabilityRating: 'Unrealistic',
      rationale: `Current analysis shows expenses ($${budgetSummary.totalExpenses.toFixed(0)}) exceed or equal income ($${budgetSummary.totalIncome.toFixed(0)}). Priority should be achieving positive cash flow.`
    }];
  }

  const monthlyDisposable = budgetSummary.disposableIncome / Math.max(1, Math.ceil(transactions.length / 30));

  // Emergency Fund Goal (3-6 months of expenses)
  const monthlyExpenses = budgetSummary.monthlyAverage.expenses;
  const emergencyFundTarget = monthlyExpenses * 3; // Start with 3 months
  const emergencyTimeframe = Math.max(6, Math.min(24, Math.ceil(emergencyFundTarget / (monthlyDisposable * 0.3))));
  
  goals.push({
    category: 'Emergency Fund',
    description: `Build an emergency fund covering 3 months of expenses ($${emergencyFundTarget.toFixed(0)}) over ${emergencyTimeframe} months.`,
    amount: emergencyFundTarget,
    timeframeMonths: emergencyTimeframe,
    achievabilityRating: determineAchievability(emergencyFundTarget, emergencyTimeframe, monthlyDisposable),
    rationale: `With monthly disposable income of $${monthlyDisposable.toFixed(0)}, allocating 30% ($${(monthlyDisposable * 0.3).toFixed(0)}) toward emergency savings is realistic and builds financial security.`
  });

  // Savings Goal (20% of disposable income)
  const savingsTarget = monthlyDisposable * 0.2 * 12; // Annual savings target
  const savingsTimeframe = 12;
  
  goals.push({
    category: 'Annual Savings',
    description: `Save $${savingsTarget.toFixed(0)} over the next year by setting aside $${(savingsTarget/12).toFixed(0)} per month.`,
    amount: savingsTarget,
    timeframeMonths: savingsTimeframe,
    achievabilityRating: determineAchievability(savingsTarget, savingsTimeframe, monthlyDisposable),
    rationale: `Allocating 20% of your monthly surplus ($${(monthlyDisposable * 0.2).toFixed(0)}) toward savings follows the 50/30/20 budgeting principle and builds long-term wealth.`
  });

  // Expense Reduction Goal (find biggest discretionary category)
  const expenseCategories: Record<string, number> = {};
  transactions.filter(tx => 
    tx.amount < 0 && 
    tx.category !== 'Transfer' && 
    !tx.category?.includes('Income')
  ).forEach(tx => {
    const category = tx.category || 'Other';
    expenseCategories[category] = (expenseCategories[category] || 0) + Math.abs(tx.amount);
  });

  const topExpenseCategory = Object.entries(expenseCategories)
    .sort(([,a], [,b]) => b - a)[0];

  if (topExpenseCategory && topExpenseCategory[1] > 200) {
    const [category, amount] = topExpenseCategory;
    const reductionTarget = amount * 0.15; // 15% reduction
    const timeframe = 3;
    
    goals.push({
      category: `Reduce ${category}`,
      description: `Reduce ${category} spending by 15% ($${reductionTarget.toFixed(0)}) over the next 3 months.`,
      amount: reductionTarget,
      timeframeMonths: timeframe,
      achievabilityRating: 'Moderate',
      rationale: `${category} is your largest expense category at $${amount.toFixed(0)}. A 15% reduction is achievable and would free up $${(reductionTarget/3).toFixed(0)} per month for other goals.`
    });
  }

  return goals.slice(0, 3); // Return top 3 goals
}