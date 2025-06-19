
import React from 'react';
import { PieChart, AlertCircle, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

export const BudgetOverview = () => {
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

  const budgetCategories = [
    { name: 'Housing', budgeted: 2500, spent: 2450, color: 'blue', percentage: 32 },
    { name: 'Food & Dining', budgeted: 800, spent: 920, color: 'red', percentage: 15 },
    { name: 'Transportation', budgeted: 600, spent: 580, color: 'green', percentage: 11 },
    { name: 'Utilities', budgeted: 300, spent: 285, color: 'yellow', percentage: 6 },
    { name: 'Entertainment', budgeted: 400, spent: 350, color: 'purple', percentage: 8 },
    { name: 'Shopping', budgeted: 500, spent: 670, color: 'pink', percentage: 12 },
    { name: 'Healthcare', budgeted: 200, spent: 180, color: 'cyan', percentage: 4 },
    { name: 'Savings', budgeted: 1500, spent: 1500, color: 'emerald', percentage: 20 }
  ];

  const totalBudgeted = budgetCategories.reduce((sum, cat) => sum + cat.budgeted, 0);
  const totalSpent = budgetCategories.reduce((sum, cat) => sum + cat.spent, 0);
  const remaining = totalBudgeted - totalSpent;

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
            <p className="text-2xl font-bold text-white">${totalBudgeted.toLocaleString()}</p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <span className="text-purple-400 text-sm font-medium">Current Spend</span>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">Total Spent</h3>
            <p className="text-2xl font-bold text-white">${totalSpent.toLocaleString()}</p>
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
            {budgetCategories.map((category, index) => {
              const isOverBudget = category.spent > category.budgeted;
              const spentPercentage = (category.spent / category.budgeted) * 100;
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
                        ${category.spent} / ${category.budgeted}
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
                      Over budget by ${(category.spent - category.budgeted).toLocaleString()}
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
              Based on your spending patterns, consider reallocating $150 from Shopping to your Emergency Fund. 
              This adjustment would improve your financial health score by 12 points and help you reach your savings goal 1.5 months earlier.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
