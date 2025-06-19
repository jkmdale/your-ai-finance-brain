
import React from 'react';
import { TrendingUp, DollarSign, PieChart, Target, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { CSVUpload } from './CSVUpload';
import { AICoach } from './AICoach';

export const Dashboard = () => {
  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'from-blue-400 to-blue-500',
      green: 'from-green-400 to-green-500',
      purple: 'from-purple-400 to-purple-500',
      emerald: 'from-emerald-400 to-emerald-500'
    };
    return colorMap[color as keyof typeof colorMap] || 'from-gray-400 to-gray-500';
  };

  const stats = [
    {
      title: 'Total Balance',
      value: '$48,532',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'blue'
    },
    {
      title: 'Monthly Income',
      value: '$8,240',
      change: '+5.2%',
      trend: 'up',
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Monthly Expenses',
      value: '$6,185',
      change: '-3.1%',
      trend: 'down',
      icon: PieChart,
      color: 'purple'
    },
    {
      title: 'Savings Rate',
      value: '24.9%',
      change: '+2.3%',
      trend: 'up',
      icon: Target,
      color: 'emerald'
    }
  ];

  const recentTransactions = [
    { id: 1, description: 'Salary Deposit', amount: 4200, date: '2024-01-15', type: 'income' },
    { id: 2, description: 'Grocery Store', amount: -156.80, date: '2024-01-14', type: 'expense' },
    { id: 3, description: 'Netflix Subscription', amount: -16.99, date: '2024-01-13', type: 'expense' },
    { id: 4, description: 'Investment Dividend', amount: 85.40, date: '2024-01-12', type: 'income' },
    { id: 5, description: 'Gas Station', amount: -67.50, date: '2024-01-11', type: 'expense' }
  ];

  return (
    <section id="dashboard" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Financial Dashboard
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Your complete financial overview with AI-powered insights and automated transaction processing
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${getColorClasses(stat.color)} rounded-xl flex items-center justify-center`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center space-x-1 text-sm ${
                    stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    <span>{stat.change}</span>
                  </div>
                </div>
                <h3 className="text-white/70 text-sm font-medium mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* CSV Upload */}
          <CSVUpload />
          
          {/* AI Coach */}
          <AICoach />
        </div>

        {/* Recent Transactions */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Recent Transactions</h3>
            <button className="text-purple-400 hover:text-purple-300 font-medium text-sm transition-colors duration-200">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-3 px-4 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl hover:bg-white/15 transition-colors duration-200">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'income' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {transaction.type === 'income' ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{transaction.description}</p>
                    <p className="text-white/60 text-sm">{transaction.date}</p>
                  </div>
                </div>
                <span className={`font-semibold ${
                  transaction.type === 'income' ? 'text-green-400' : 'text-white'
                }`}>
                  {transaction.type === 'income' ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
