
import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, PieChart, Target, Calendar, ArrowUpRight, ArrowDownRight, Upload, Plus, AlertTriangle } from 'lucide-react';
import { CSVUpload } from './CSVUpload';
import { AICoach } from './AICoach';
import { TransactionCard } from '@/components/ui/transaction-card';
import { TransactionTable } from '@/components/ui/transaction-table';
import { FinancialHealthCard } from '@/components/ui/financial-health-card';
import { SpendingInsights } from '@/components/ui/spending-insights';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  transactionCount: number;
  isValidated: boolean;
  warnings: string[];
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  is_income: boolean;
  merchant?: string;
  categories?: {
    name: string;
    color: string;
  };
}

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'from-blue-400 to-blue-500',
      green: 'from-green-400 to-green-500',
      purple: 'from-purple-400 to-purple-500',
      emerald: 'from-emerald-400 to-emerald-500'
    };
    return colorMap[color as keyof typeof colorMap] || 'from-gray-400 to-gray-500';
  };

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching dashboard data for user:', user.id);

      // Fetch recent transactions with categories
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(name, color)
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(10);

      console.log('Fetched transactions:', transactions);

      // Fetch bank accounts for balance
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('user_id', user.id)
        .eq('is_active', true);

      console.log('Fetched accounts:', accounts);

      if (transactions && transactions.length > 0) {
        // Calculate current month's income and expenses
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const currentMonthTransactions = transactions.filter(t => {
          const transactionDate = new Date(t.transaction_date);
          return transactionDate.getMonth() === currentMonth && 
                 transactionDate.getFullYear() === currentYear;
        });

        const monthlyIncome = currentMonthTransactions
          .filter(t => t.is_income)
          .reduce((sum, t) => sum + t.amount, 0);

        const monthlyExpenses = currentMonthTransactions
          .filter(t => !t.is_income)
          .reduce((sum, t) => sum + t.amount, 0);

        const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
        const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

        const dashboardStats: DashboardStats = {
          totalBalance,
          monthlyIncome,
          monthlyExpenses,
          savingsRate,
          transactionCount: transactions.length,
          isValidated: true,
          warnings: []
        };

        console.log('Calculated stats:', dashboardStats);

        setStats(dashboardStats);
        setRecentTransactions(transactions);
      } else {
        console.log('No transactions found, setting stats to null');
        setStats(null);
        setRecentTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setStats(null);
      setRecentTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, refreshKey]);

  // Listen for CSV uploads to refresh dashboard data
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'csv-upload-complete') {
        console.log('CSV upload detected, refreshing dashboard...');
        // Refresh dashboard data after CSV upload
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
        }, 1000); // Give time for data to be processed
      }
    };

    // Listen for custom event from CSV upload
    const handleCustomEvent = () => {
      console.log('Custom CSV upload event detected, refreshing dashboard...');
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 1000);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('csv-upload-complete', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('csv-upload-complete', handleCustomEvent);
    };
  }, []);

  if (loading) {
    return (
      <section id="dashboard" className="py-8 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
          </div>
        </div>
      </section>
    );
  }

  // Empty state for new users
  if (!stats) {
    return (
      <section id="dashboard" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Welcome to Your Financial OS
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Start your intelligent financial journey by uploading your first transaction file
            </p>
          </div>

          {/* Empty State Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { title: 'Total Balance', icon: DollarSign, color: 'blue' },
              { title: 'Monthly Income', icon: TrendingUp, color: 'green' },
              { title: 'Monthly Expenses', icon: PieChart, color: 'purple' },
              { title: 'Savings Rate', icon: Target, color: 'emerald' }
            ].map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getColorClasses(item.color)} rounded-xl flex items-center justify-center opacity-50`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-white/70 text-sm font-medium mb-1">{item.title}</h3>
                  <p className="text-xl font-bold text-white/50">--</p>
                  <p className="text-xs text-white/40 mt-1">Upload data to see stats</p>
                </div>
              );
            })}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* CSV Upload */}
            <CSVUpload />
            
            {/* AI Coach */}
            <div id="insights">
              <AICoach />
            </div>
          </div>

          {/* Empty Transactions */}
          <div id="transactions" className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                <ArrowUpRight className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Transactions Yet</h3>
              <p className="text-white/70 mb-6">
                Upload your bank CSV file to see your transaction history and start tracking your financial patterns
              </p>
              <button 
                onClick={() => document.getElementById('csv-upload-container')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 font-medium flex items-center space-x-2 mx-auto"
              >
                <Upload className="w-5 h-5" />
                <span>Upload Your First File</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Dashboard with real data
  return (
    <section id="dashboard" className="py-8 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Financial Intelligence Dashboard
          </h2>
          <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto">
            AI-powered analysis with secure authentication and smart insights
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${getColorClasses('blue')} rounded-xl flex items-center justify-center`}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">Total Balance</h3>
            <p className="text-xl font-bold text-white">${stats.totalBalance.toLocaleString()}</p>
            <p className="text-xs text-green-400 mt-1">+2.5% this month</p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${getColorClasses('green')} rounded-xl flex items-center justify-center`}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">Monthly Income</h3>
            <p className="text-xl font-bold text-white">${stats.monthlyIncome.toLocaleString()}</p>
            <p className="text-xs text-green-400 mt-1">This month</p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${getColorClasses('purple')} rounded-xl flex items-center justify-center`}>
                <PieChart className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">Monthly Expenses</h3>
            <p className="text-xl font-bold text-white">${stats.monthlyExpenses.toLocaleString()}</p>
            <p className="text-xs text-red-400 mt-1">This month</p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${getColorClasses('emerald')} rounded-xl flex items-center justify-center`}>
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-white/70 text-sm font-medium mb-1">Savings Rate</h3>
            <p className="text-xl font-bold text-white">{stats.savingsRate.toFixed(1)}%</p>
            <p className={`text-xs mt-1 ${stats.savingsRate > 20 ? 'text-green-400' : 'text-yellow-400'}`}>
              {stats.savingsRate > 20 ? 'Excellent!' : 'Room to improve'}
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* CSV Upload */}
          <CSVUpload />
          
          {/* AI Coach */}
          <div id="insights">
            <AICoach />
          </div>
        </div>

        {/* Recent Transactions */}
        <div id="transactions" className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-bold text-white">Recent Transactions</h3>
              <span className="text-white/60 text-sm">{recentTransactions.length} transactions</span>
            </div>
          </div>
          
          <div className="p-3 sm:p-6">
            {isMobile ? (
              // Mobile Card Layout
              <div className="space-y-3">
                {recentTransactions.slice(0, 5).map((transaction) => (
                  <TransactionCard key={transaction.id} transaction={transaction} />
                ))}
              </div>
            ) : (
              // Desktop Table Layout
              <TransactionTable transactions={recentTransactions.slice(0, 10)} />
            )}
          </div>
          
          {recentTransactions.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-white/20 text-center">
              <button 
                onClick={() => document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg font-medium text-sm sm:text-base"
              >
                View All Transactions
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
