import React, { useEffect, useState } from 'react';
import { PieChart, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BudgetData {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  savingsRate: number;
  budgetAllocation: {
    needs: { amount: number; percentage: number };
    wants: { amount: number; percentage: number };
    savings: { amount: number; percentage: number };
  };
  categories: {
    [categoryName: string]: {
      amount: number;
      budgetGroup: 'needs' | 'wants' | 'savings';
      isIncome: boolean;
    };
  };
}

export const BudgetBreakdown = () => {
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchBudgetData();
    
    // Listen for budget updates
    const handleBudgetUpdate = () => {
      setTimeout(() => fetchBudgetData(), 1000);
    };
    
    window.addEventListener('smartfinance-complete', handleBudgetUpdate);
    return () => window.removeEventListener('smartfinance-complete', handleBudgetUpdate);
  }, [user]);

  const fetchBudgetData = async () => {
    if (!user) return;

    try {
      // Get current month
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
      
      // Fetch transactions for current month
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(name, is_income)
        `)
        .eq('user_id', user.id)
        .gte('transaction_date', `${currentMonth}-01`)
        .lt('transaction_date', `${currentMonth}-32`)
        .not('tags', 'cs', '{transfer}'); // Exclude transfers

      if (!transactions || transactions.length === 0) {
        setBudgetData(null);
        return;
      }

      // Calculate budget breakdown
      const categoryTotals: { [key: string]: { amount: number; budgetGroup: 'needs' | 'wants' | 'savings'; isIncome: boolean } } = {};
      
      let totalIncome = 0;
      let totalExpenses = 0;
      
      transactions.forEach(tx => {
        const categoryName = tx.categories?.name || 'Uncategorized';
        const amount = Math.abs(tx.amount);
        const isIncome = tx.is_income;
        
        // Determine budget group from tags or category analysis
        let budgetGroup: 'needs' | 'wants' | 'savings' = 'wants';
        if (tx.tags && tx.tags.length > 0) {
          const tag = tx.tags[0];
          if (['needs', 'wants', 'savings'].includes(tag)) {
            budgetGroup = tag as 'needs' | 'wants' | 'savings';
          }
        } else {
          // Fallback categorization based on category name
          budgetGroup = categorizeBudgetGroup(categoryName, isIncome);
        }

        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = { amount: 0, budgetGroup, isIncome };
        }
        
        categoryTotals[categoryName].amount += amount;
        
        if (isIncome) {
          totalIncome += amount;
        } else {
          totalExpenses += amount;
        }
      });

      // Calculate 50/30/20 allocation based on actual income
      const budgetAllocation = {
        needs: { amount: totalIncome * 0.5, percentage: 50 },
        wants: { amount: totalIncome * 0.3, percentage: 30 },
        savings: { amount: totalIncome * 0.2, percentage: 20 }
      };

      const savings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

      setBudgetData({
        month: currentMonth,
        totalIncome,
        totalExpenses,
        savings,
        savingsRate,
        budgetAllocation,
        categories: categoryTotals
      });
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const categorizeBudgetGroup = (categoryName: string, isIncome: boolean): 'needs' | 'wants' | 'savings' => {
    if (isIncome) return 'savings';
    
    const name = categoryName.toLowerCase();
    
    // Needs (essentials)
    if (name.includes('rent') || name.includes('mortgage') || name.includes('utilities') || 
        name.includes('insurance') || name.includes('groceries') || name.includes('healthcare') ||
        name.includes('transport') || name.includes('fuel')) {
      return 'needs';
    }
    
    // Savings/Investment
    if (name.includes('saving') || name.includes('investment') || name.includes('retirement')) {
      return 'savings';
    }
    
    // Everything else is wants
    return 'wants';
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded mb-4"></div>
          <div className="h-4 bg-white/10 rounded mb-2"></div>
          <div className="h-4 bg-white/10 rounded mb-2"></div>
          <div className="h-4 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (!budgetData) {
    return (
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center">
            <PieChart className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Zero-Based Budget</h3>
        </div>
        <p className="text-white/70 text-sm">Upload transactions to see your AI-generated budget breakdown</p>
      </div>
    );
  }

  // Calculate actual spending by budget group
  const actualSpending = {
    needs: 0,
    wants: 0,
    savings: budgetData.savings > 0 ? budgetData.savings : 0
  };

  Object.values(budgetData.categories).forEach(cat => {
    if (!cat.isIncome) {
      actualSpending[cat.budgetGroup] += cat.amount;
    }
  });

  const remainingBalance = budgetData.totalIncome - budgetData.totalExpenses;

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center">
            <PieChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Zero-Based Budget</h3>
            <p className="text-sm text-white/70">AI-Generated for {budgetData.month}</p>
          </div>
        </div>
        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
          Math.abs(remainingBalance) < 50 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {Math.abs(remainingBalance) < 50 ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          <span>{Math.abs(remainingBalance) < 50 ? 'Balanced' : 'Needs Adjustment'}</span>
        </div>
      </div>

      {/* Budget Allocation Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-sm">Needs (50%)</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="space-y-1">
            <p className="text-white font-semibold">${budgetData.budgetAllocation.needs.amount.toLocaleString()}</p>
            <p className="text-xs text-white/60">Actual: ${actualSpending.needs.toLocaleString()}</p>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div 
                className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (actualSpending.needs / budgetData.budgetAllocation.needs.amount) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-sm">Wants (30%)</span>
            <TrendingDown className="w-4 h-4 text-purple-400" />
          </div>
          <div className="space-y-1">
            <p className="text-white font-semibold">${budgetData.budgetAllocation.wants.amount.toLocaleString()}</p>
            <p className="text-xs text-white/60">Actual: ${actualSpending.wants.toLocaleString()}</p>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div 
                className="bg-purple-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (actualSpending.wants / budgetData.budgetAllocation.wants.amount) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-sm">Savings (20%)</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="space-y-1">
            <p className="text-white font-semibold">${budgetData.budgetAllocation.savings.amount.toLocaleString()}</p>
            <p className="text-xs text-white/60">Actual: ${actualSpending.savings.toLocaleString()}</p>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div 
                className="bg-green-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (actualSpending.savings / budgetData.budgetAllocation.savings.amount) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Zero-Based Status */}
      <div className="bg-white/5 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-medium">Budget Balance</span>
          <span className={`font-bold ${remainingBalance === 0 ? 'text-green-400' : remainingBalance > 0 ? 'text-blue-400' : 'text-red-400'}`}>
            ${remainingBalance.toLocaleString()}
          </span>
        </div>
        <div className="text-xs text-white/60">
          {remainingBalance === 0 && "Perfect! Every dollar is allocated."}
          {remainingBalance > 0 && "Surplus - consider increasing savings or debt payments."}
          {remainingBalance < 0 && "Deficit - review and reduce expenses."}
        </div>
      </div>

      {/* Top Categories */}
      <div className="mt-4">
        <h4 className="text-white font-medium mb-3">Top Expense Categories</h4>
        <div className="space-y-2">
          {Object.entries(budgetData.categories)
            .filter(([_, cat]) => !cat.isIncome)
            .sort(([_, a], [__, b]) => b.amount - a.amount)
            .slice(0, 5)
            .map(([name, cat]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    cat.budgetGroup === 'needs' ? 'bg-blue-400' : 
                    cat.budgetGroup === 'wants' ? 'bg-purple-400' : 'bg-green-400'
                  }`} />
                  <span className="text-white/80">{name}</span>
                </div>
                <span className="text-white font-medium">${cat.amount.toLocaleString()}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};