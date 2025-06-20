import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, PieChart, Target, Calendar, ArrowUpRight, ArrowDownRight, Upload, Plus } from 'lucide-react';
import { CSVUpload } from './CSVUpload';
import { AICoach } from './AICoach';
import { TransactionCard } from '@/components/ui/transaction-card';
import { TransactionTable } from '@/components/ui/transaction-table';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  transactionCount: number;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  is_income: boolean;
  merchant?: string;
}

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's transactions
        const { data: transactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .limit(5);

        if (!transactions || transactions.length === 0) {
          setStats(null);
          setRecentTransactions([]);
          setLoading(false);
          return;
        }

        // Calculate stats from real data
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('amount, is_income, transaction_date')
          .eq('user_id', user.id);

        if (allTransactions && allTransactions.length > 0) {
          const totalIncome = allTransactions
            .filter(t => t.is_income)
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          const totalExpenses = allTransactions
            .filter(t => !t.is_income)
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

          const totalBalance = totalIncome - totalExpenses;
          const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

          setStats({
            totalBalance,
            monthlyIncome: totalIncome,
            monthlyExpenses: totalExpenses,
            savingsRate,
            transactionCount: allTransactions.length
          });
        }

        setRecentTransactions(transactions || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

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
              <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 font-medium flex items-center space-x-2 mx-auto">
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
  const statsData = [
    {
      title: 'Total Balance',
      value: `$${stats.totalBalance.toLocaleString()}`,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'blue'
    },
    {
      title: 'Monthly Income',
      value: `$${stats.monthlyIncome.toLocaleString()}`,
      change: '+5.2%',
      trend: 'up',
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Monthly Expenses',
      value: `$${stats.monthlyExpenses.toLocaleString()}`,
      change: '-3.1%',
      trend: 'down',
      icon: PieChart,
      color: 'purple'
    },
    {
      title: 'Savings Rate',
      value: `${stats.savingsRate.toFixed(1)}%`,
      change: '+2.3%',
      trend: 'up',
      icon: Target,
      color: 'emerald'
    }
  ];

  return (
    <section id="dashboard" className="py-8 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Financial Dashboard
          </h2>
          <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto">
            Your complete financial overview with AI-powered insights and automated transaction processing
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
          {statsData.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-xl sm:rounded-2xl p-3 sm:p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-2xl">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className={`w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br ${getColorClasses(stat.color)} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                    <IconComponent className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className={`flex items-center space-x-1 text-xs sm:text-sm ${
                    stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                    <span className="hidden sm:inline">{stat.change}</span>
                  </div>
                </div>
                <h3 className="text-white/70 text-xs sm:text-sm font-medium mb-1">{stat.title}</h3>
                <p className="text-lg sm:text-2xl font-bold text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* CSV Upload */}
          <CSVUpload />
          
          {/* AI Coach */}
          <div id="insights">
            <AICoach />
          </div>
        </div>

        {/* Recent Transactions */}
        <div id="transactions" className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/20">
            <h3 className="text-lg sm:text-xl font-semibold text-white">Recent Transactions</h3>
            <button className="text-purple-400 hover:text-purple-300 font-medium text-sm transition-colors duration-200">
              View All
            </button>
          </div>

          <div className="p-3 sm:p-6">
            {isMobile ? (
              // Mobile Card Layout
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <TransactionCard key={transaction.id} transaction={transaction} />
                ))}
              </div>
            ) : (
              // Desktop Table Layout
              <TransactionTable transactions={recentTransactions} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
