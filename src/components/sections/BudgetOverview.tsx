import React, { useEffect, useState } from 'react';
import { PieChart, AlertCircle, TrendingDown, TrendingUp, DollarSign, Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BudgetCategory {
  name: string;
  allocated: number;
  spent: number;
  color: string;
  percentage: number;
}

interface BudgetData {
  totalBudgeted: number;
  totalSpent: number;
  categories: BudgetCategory[];
}

export const BudgetOverview = () => {
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: { bg: 'bg-blue-400', gradient: 'from-blue-400 to-blue-500' },
      red: { bg: 'bg-red-400', gradient: 'from-red-400 to-red-500' },
      green: { bg: 'bg-green-400', gradient: 'from-green-400 to-green-500' },
      yellow: { bg: 'bg-yellow-400', gradient: 'from-yellow-400 to-yellow-500' },
      purple: { bg: 'bg-purple-400', gradient: 'from-purple-400 to-purple-500' },
      pink: { bg: 'bg-pink-400', gradient: 'from-pink-400 to-pink-500' },
      cyan: { bg: 'bg-cyan-400', gradient: 'from-cyan-400 to-cyan-500' },
      emerald: { bg: 'bg-emerald-400', gradient: 'from-emerald-400 to-emerald-500' }
    };
    return colorMap[color as keyof typeof colorMap] || { bg: 'bg-gray-400', gradient: 'from-gray-400 to-gray-500' };
  };

  const colorPalette = ['blue', 'red', 'green', 'yellow', 'purple', 'pink', 'cyan', 'emerald'];

  useEffect(() => {
    const fetchBudgetData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get active budget with categories
        const { data: budgets } = await supabase
          .from('budgets')
          .select(`
            *,
            budget_categories(
              allocated_amount,
              spent_amount,
              categories(name, color)
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!budgets || budgets.length === 0) {
          setBudgetData(null);
          setLoading(false);
          return;
        }

        const budget = budgets[0];
        const categories: BudgetCategory[] = budget.budget_categories?.map((bc: any, index: number) => ({
          name: bc.categories?.name || 'Unknown',
          allocated: bc.allocated_amount || 0,
          spent: bc.spent_amount || 0,
          color: colorPalette[index % colorPalette.length],
          percentage: Math.round(((bc.allocated_amount || 0) / (budget.total_income || 1)) * 100)
        })) || [];

        const totalBudgeted = categories.reduce((sum, cat) => sum + cat.allocated, 0);
        const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);

        setBudgetData({
          totalBudgeted,
          totalSpent,
          categories
        });
      } catch (error) {
        console.error('Error fetching budget data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetData();
  }, [user, refreshKey]);

  // Listen for CSV uploads to refresh budget data
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'csv-upload-complete') {
        // Refresh budget data after CSV upload
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
        }, 2000); // Give time for budget creation to complete
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (loading) {
    return (
      <section id="budget" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (!budgetData) {
    return (
      <section id="budget" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Smart Budget Intelligence
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto mb-8">
              Create your first budget to unlock AI-powered insights and recommendations
            </p>
            <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-12 shadow-2xl max-w-2xl mx-auto">
              <div className="flex flex-col items-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                  <PieChart className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-2">Ready to Start Budgeting?</h3>
                  <p className="text-white/80 mb-6">
                    Upload your bank transactions to automatically create budgets and track your spending with AI-powered insights.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                  <button 
                    onClick={() => document.getElementById('csv-upload-container')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Upload Transactions</span>
                  </button>
                  <button className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 border border-white/30">
                    Manual Setup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const remaining = budgetData.totalBudgeted - budgetData.totalSpent;

  return (
    <section id="budget" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Smart Budget Intelligence
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            AI-powered budget optimization with real-time variance analysis and predictive adjustments
          </p>
        </div>

        {/* Budget Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-blue-400 text-sm font-medium">Monthly Budget</span>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">Total Budgeted</h3>
            <p className="text-2xl font-bold text-white">${budgetData.totalBudgeted.toLocaleString()}</p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <span className="text-purple-400 text-sm font-medium">Current Spend</span>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">Total Spent</h3>
            <p className="text-2xl font-bold text-white">${budgetData.totalSpent.toLocaleString()}</p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${remaining >= 0 ? 'from-green-400 to-green-500' : 'from-red-400 to-red-500'} rounded-xl flex items-center justify-center`}>
                {remaining >= 0 ? <TrendingUp className="w-6 h-6 text-white" /> : <AlertCircle className="w-6 h-6 text-white" />}
              </div>
              <span className={`text-sm font-medium ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {remaining >= 0 ? 'Under Budget' : 'Over Budget'}
              </span>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">Remaining</h3>
            <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-white' : 'text-red-400'}`}>
              ${Math.abs(remaining).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Budget Categories */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-white">Budget Breakdown</h3>
            <div className="flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-purple-400" />
              <span className="text-white/70 text-sm">Real-time tracking</span>
            </div>
          </div>

          <div className="space-y-4">
            {budgetData.categories.map((category, index) => {
              const isOverBudget = category.spent > category.allocated;
              const spentPercentage = category.allocated > 0 ? (category.spent / category.allocated) * 100 : 0;
              const colors = getColorClasses(category.color);
              
              return (
                <div key={index} className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 ${colors.bg} rounded-full`}></div>
                      <span className="text-white font-medium">{category.name}</span>
                      {isOverBudget && <AlertCircle className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${isOverBudget ? 'text-red-400' : 'text-white'}`}>
                        ${category.spent.toLocaleString()} / ${category.allocated.toLocaleString()}
                      </span>
                      <div className="text-xs text-white/60">
                        {spentPercentage.toFixed(0)}% used
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-1000 ${isOverBudget ? 'animate-pulse' : ''}`}
                      style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                    ></div>
                  </div>
                  
                  {isOverBudget && (
                    <div className="mt-2 text-xs text-red-300 bg-red-500/10 rounded-lg px-3 py-1">
                      Over budget by ${(category.spent - category.allocated).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-6 backdrop-blur-sm bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-xl">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-purple-300 font-medium">AI Budget Optimization</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">
              Based on your spending patterns, consider reallocating funds from overspent categories to savings. 
              Your AI coach can provide personalized recommendations to optimize your budget and reach your financial goals faster.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
