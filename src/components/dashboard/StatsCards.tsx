import React from 'react';
import { DollarSign, TrendingUp, PieChart, Target } from 'lucide-react';
import type { DashboardStats } from '@/types/dashboard';

interface StatsCardsProps {
  stats: DashboardStats;
}

const getColorClasses = (color: string) => {
  const colorMap = {
    blue: 'from-blue-400 to-blue-500',
    green: 'from-green-400 to-green-500',
    purple: 'from-purple-400 to-purple-500',
    emerald: 'from-emerald-400 to-emerald-500'
  };
  return colorMap[color as keyof typeof colorMap] || 'from-gray-400 to-gray-500';
};

export const StatsCards = ({ stats }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${getColorClasses('blue')} rounded-xl flex items-center justify-center`}>
            <DollarSign className="w-5 h-5 text-white" />
          </div>
        </div>
        <h3 className="text-white/70 text-sm font-medium mb-1">Total Balance</h3>
        <p className="text-lg font-bold text-white">${stats.totalBalance.toLocaleString()}</p>
        <p className="text-xs text-green-400 mt-1">AI-calculated</p>
      </div>

      <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${getColorClasses('green')} rounded-xl flex items-center justify-center`}>
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
        </div>
        <h3 className="text-white/70 text-sm font-medium mb-1">Monthly Income</h3>
        <p className="text-lg font-bold text-white">${stats.monthlyIncome.toLocaleString()}</p>
        <p className="text-xs text-green-400 mt-1">Current month</p>
      </div>

      <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${getColorClasses('purple')} rounded-xl flex items-center justify-center`}>
            <PieChart className="w-5 h-5 text-white" />
          </div>
        </div>
        <h3 className="text-white/70 text-sm font-medium mb-1">Monthly Expenses</h3>
        <p className="text-lg font-bold text-white">${stats.monthlyExpenses.toLocaleString()}</p>
        <p className="text-xs text-red-400 mt-1">Current month</p>
      </div>

      <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${getColorClasses('emerald')} rounded-xl flex items-center justify-center`}>
            <Target className="w-5 h-5 text-white" />
          </div>
        </div>
        <h3 className="text-white/70 text-sm font-medium mb-1">Savings Rate</h3>
        <p className="text-lg font-bold text-white">{stats.savingsRate.toFixed(1)}%</p>
        <p className={`text-xs mt-1 ${stats.savingsRate > 20 ? 'text-green-400' : 'text-yellow-400'}`}>
          {stats.savingsRate > 20 ? 'AI: Excellent!' : 'AI: Can improve'}
        </p>
      </div>
    </div>
  );
};