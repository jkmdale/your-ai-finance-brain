import React from 'react';
import { DollarSign, TrendingUp, PieChart, Target } from 'lucide-react';

const getColorClasses = (color: string) => {
  const colorMap = {
    blue: 'from-blue-400 to-blue-500',
    green: 'from-green-400 to-green-500',
    purple: 'from-purple-400 to-purple-500',
    emerald: 'from-emerald-400 to-emerald-500'
  };
  return colorMap[color as keyof typeof colorMap] || 'from-gray-400 to-gray-500';
};

export const EmptyStateCards = () => {
  const cards = [
    { title: 'Total Balance', icon: DollarSign, color: 'blue' },
    { title: 'Monthly Income', icon: TrendingUp, color: 'green' },
    { title: 'Monthly Expenses', icon: PieChart, color: 'purple' },
    { title: 'Savings Rate', icon: Target, color: 'emerald' }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((item, index) => {
        const IconComponent = item.icon;
        return (
          <div key={index} className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${getColorClasses(item.color)} rounded-xl flex items-center justify-center opacity-50`}>
                <IconComponent className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">{item.title}</h3>
            <p className="text-lg font-bold text-white/50">--</p>
            <p className="text-xs text-white/40 mt-1">Upload data to see AI insights</p>
          </div>
        );
      })}
    </div>
  );
};