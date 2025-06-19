
import React, { useState } from 'react';
import { Search, Filter, Download, CreditCard, ArrowUp, ArrowDown, MapPin } from 'lucide-react';

export const TransactionHistory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const transactions = [
    {
      id: 1,
      date: '2024-01-15',
      description: 'Grocery Store - Whole Foods',
      category: 'Food & Dining',
      amount: -127.45,
      type: 'expense',
      merchant: 'Whole Foods Market',
      location: 'Auckland, NZ',
      status: 'completed'
    },
    {
      id: 2,
      date: '2024-01-15',
      description: 'Salary Deposit',
      category: 'Income',
      amount: 4250.00,
      type: 'income',
      merchant: 'TechCorp Ltd',
      location: 'Direct Deposit',
      status: 'completed'
    },
    {
      id: 3,
      date: '2024-01-14',
      description: 'Coffee Shop - Local Cafe',
      category: 'Food & Dining',
      amount: -4.50,
      type: 'expense',
      merchant: 'Brew & Bean',
      location: 'Auckland CBD',
      status: 'completed'
    },
    {
      id: 4,
      date: '2024-01-14',
      description: 'Gas Station - Shell',
      category: 'Transportation',
      amount: -75.30,
      type: 'expense',
      merchant: 'Shell Service Station',
      location: 'Auckland, NZ',
      status: 'completed'
    },
    {
      id: 5,
      date: '2024-01-13',
      description: 'Investment Transfer',
      category: 'Investments',
      amount: -500.00,
      type: 'transfer',
      merchant: 'Vanguard NZ',
      location: 'Online Transfer',
      status: 'completed'
    },
    {
      id: 6,
      date: '2024-01-13',
      description: 'Rent Payment',
      category: 'Housing',
      amount: -2450.00,
      type: 'expense',
      merchant: 'Property Management Co',
      location: 'Auckland, NZ',
      status: 'completed'
    }
  ];

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Food & Dining': 'red',
      'Income': 'green',
      'Transportation': 'blue',
      'Housing': 'purple',
      'Investments': 'orange'
    };
    return colors[category] || 'gray';
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Smart Transaction Insights
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            AI-powered transaction categorization with intelligent pattern recognition and spending analytics
          </p>
        </div>

        {/* Transaction Controls */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 mb-8 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-full pl-10 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-full flex items-center space-x-2 transition-all duration-200">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
              <button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-full flex items-center space-x-2 transition-all duration-200">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/20">
            <h3 className="text-xl font-bold text-white">Recent Transactions</h3>
            <p className="text-white/60 text-sm mt-1">Automatically categorized with 95% accuracy</p>
          </div>
          
          <div className="divide-y divide-white/10">
            {transactions.map((transaction) => {
              const categoryColor = getCategoryColor(transaction.category);
              
              return (
                <div key={transaction.id} className="p-6 hover:bg-white/5 transition-all duration-200 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 bg-gradient-to-br from-${categoryColor}-400 to-${categoryColor}-500 rounded-xl flex items-center justify-center`}>
                        {transaction.type === 'income' ? (
                          <ArrowUp className="w-6 h-6 text-white" />
                        ) : transaction.type === 'expense' ? (
                          <ArrowDown className="w-6 h-6 text-white" />
                        ) : (
                          <CreditCard className="w-6 h-6 text-white" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="text-white font-medium">{transaction.description}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${categoryColor}-500/20 text-${categoryColor}-300`}>
                            {transaction.category}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-white/60">
                          <span>{transaction.merchant}</span>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{transaction.location}</span>
                          </div>
                          <span>{new Date(transaction.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${transaction.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                        {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                      </div>
                      <div className="text-sm text-white/60 capitalize">{transaction.status}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="p-6 border-t border-white/20 text-center">
            <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg font-medium">
              Load More Transactions
            </button>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="mt-8 backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <span className="text-purple-300 font-medium">Transaction Insights</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">47</div>
              <div className="text-white/60 text-sm">Transactions this month</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">$2,340</div>
              <div className="text-white/60 text-sm">Average monthly spend</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">8</div>
              <div className="text-white/60 text-sm">Recurring payments</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
