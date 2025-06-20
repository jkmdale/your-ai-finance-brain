
import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, CreditCard, ArrowUp, ArrowDown, MapPin, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  is_income: boolean;
  merchant?: string;
  categories?: {
    name: string;
    color: string;
  };
}

export const TransactionHistory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('transactions')
          .select(`
            *,
            categories(name, color)
          `)
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .limit(50);

        setTransactions(data || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

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

  if (loading) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
          </div>
        </div>
      </section>
    );
  }

  // Empty state for no transactions
  if (transactions.length === 0) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Transaction History
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Upload your bank transactions to see intelligent categorization and insights
            </p>
          </div>

          {/* Empty State */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-3xl p-12 shadow-2xl text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 opacity-50">
              <CreditCard className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">No Transactions Yet</h3>
            <p className="text-white/70 mb-8 max-w-2xl mx-auto">
              Upload your bank CSV file to automatically categorize transactions, track spending patterns, and unlock AI-powered financial insights.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-white font-medium mb-1">1. Upload CSV</h4>
                <p className="text-white/60 text-sm">Import your bank transactions</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-white font-medium mb-1">2. Auto-Categorize</h4>
                <p className="text-white/60 text-sm">AI categorizes transactions</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <ArrowUp className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-white font-medium mb-1">3. Get Insights</h4>
                <p className="text-white/60 text-sm">View patterns and trends</p>
              </div>
            </div>
            <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 font-medium flex items-center space-x-2 mx-auto">
              <Upload className="w-5 h-5" />
              <span>Upload Your First File</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

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
            <h3 className="text-xl font-bold text-white">Your Transactions</h3>
            <p className="text-white/60 text-sm mt-1">{transactions.length} transactions loaded</p>
          </div>
          
          <div className="divide-y divide-white/10">
            {transactions.map((transaction) => {
              const categoryColor = getCategoryColor(transaction.categories?.name || 'Other');
              
              return (
                <div key={transaction.id} className="p-6 hover:bg-white/5 transition-all duration-200 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 bg-gradient-to-br from-${categoryColor}-400 to-${categoryColor}-500 rounded-xl flex items-center justify-center`}>
                        {transaction.is_income ? (
                          <ArrowUp className="w-6 h-6 text-white" />
                        ) : (
                          <ArrowDown className="w-6 h-6 text-white" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="text-white font-medium">{transaction.description}</h4>
                          {transaction.categories && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${categoryColor}-500/20 text-${categoryColor}-300`}>
                              {transaction.categories.name}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-white/60">
                          <span>{transaction.merchant || 'Unknown Merchant'}</span>
                          <span>{new Date(transaction.transaction_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${transaction.is_income ? 'text-green-400' : 'text-white'}`}>
                        {transaction.is_income ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                      </div>
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

        {/* Transaction Stats */}
        <div className="mt-8 backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <span className="text-purple-300 font-medium">Transaction Insights</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{transactions.length}</div>
              <div className="text-white/60 text-sm">Total transactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                ${transactions.filter(t => t.is_income).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
              </div>
              <div className="text-white/60 text-sm">Total income</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400 mb-1">
                ${transactions.filter(t => !t.is_income).reduce((sum, t) => sum + Math.abs(t.amount), 0).toLocaleString()}
              </div>
              <div className="text-white/60 text-sm">Total expenses</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
