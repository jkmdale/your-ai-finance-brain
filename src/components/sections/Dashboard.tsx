
import React from 'react';
import { TrendingUp, DollarSign, Target, PiggyBank, CreditCard, Wallet } from 'lucide-react';

export const Dashboard = () => {
  return (
    <section id="dashboard" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Your Financial Command Center
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Everything you need to understand and control your finances in one intelligent dashboard
          </p>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-400 text-sm font-medium">+12.5%</span>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">Total Balance</h3>
            <p className="text-2xl font-bold text-white">$47,234.56</p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-blue-400 text-sm font-medium">+8.2%</span>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">Monthly Income</h3>
            <p className="text-2xl font-bold text-white">$8,450.00</p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <span className="text-red-400 text-sm font-medium">-3.1%</span>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">Monthly Expenses</h3>
            <p className="text-2xl font-bold text-white">$5,234.78</p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-white" />
              </div>
              <span className="text-orange-400 text-sm font-medium">+15.8%</span>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">Savings Rate</h3>
            <p className="text-2xl font-bold text-white">38.1%</p>
          </div>
        </div>

        {/* Financial Health Score */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Financial Health Score</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium">Excellent</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="relative w-48 h-48 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full p-1">
                  <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white mb-2">847</div>
                      <div className="text-white/70 text-sm">out of 1000</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {[
                { label: 'Emergency Fund', score: 95, color: 'green' },
                { label: 'Debt Management', score: 88, color: 'blue' },
                { label: 'Investment Portfolio', score: 72, color: 'purple' },
                { label: 'Spending Habits', score: 91, color: 'cyan' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-white/80 font-medium">{item.label}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r from-${item.color}-400 to-${item.color}-500 rounded-full transition-all duration-1000`}
                        style={{ width: `${item.score}%` }}
                      ></div>
                    </div>
                    <span className="text-white font-semibold w-8">{item.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
