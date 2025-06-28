import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, PieChart, Target, Calendar, ArrowUpRight, ArrowDownRight, Upload, Plus, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { CSVUpload } from './CSVUpload';
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
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [processingInsights, setProcessingInsights] = useState(false);
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

      // Fetch recent transactions with categories, excluding transfers
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(name, color)
        `)
        .eq('user_id', user.id)
        .not('tags', 'cs', '{transfer}')
        .order('transaction_date', { ascending: false })
        .limit(10);

      console.log('Fetched transactions (excluding transfers):', transactions);

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
                 transactionDate.getFullYear() === currentYear &&
                 (!t.tags || !t.tags.includes('transfer'));
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

        console.log('Calculated stats (excluding transfers):', dashboardStats);

        setStats(dashboardStats);
        setRecentTransactions(transactions);
        
        // Generate AI insights if we have new data
        if (!aiInsights && transactions.length > 5) {
          generateAIInsights(transactions.slice(0, 20));
        }
      } else {
        console.log('No non-transfer transactions found, setting stats to null');
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

  const generateAIInsights = async (transactions: any[]) => {
    if (!transactions.length || processingInsights) return;

    setProcessingInsights(true);
    try {
      console.log('🤖 Generating AI insights for dashboard...');
      
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { 
          message: `Analyze these recent transactions and provide 3-4 key financial insights and actionable recommendations: ${JSON.stringify(transactions.map(t => ({
            date: t.transaction_date,
            amount: t.amount,
            description: t.description,
            category: t.categories?.name,
            is_income: t.is_income
          })))}`,
          type: 'dashboard_insights'
        }
      });

      if (error) throw error;

      setAiInsights(data.response);
      console.log('✅ AI insights generated');
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    } finally {
      setProcessingInsights(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, refreshKey]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'csv-upload-complete') {
        console.log('CSV upload detected, refreshing dashboard...');
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
          setAiInsights(null); // Reset insights to trigger regeneration
        }, 1000);
      }
    };

    const handleCustomEvent = () => {
      console.log('Custom CSV upload event detected, refreshing dashboard...');
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
        setAiInsights(null);
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
      <section className="min-h-screen w-full flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </section>
    );
  }

  if (!stats) {
    return (
      <section className="min-h-screen w-full p-4 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Welcome to Your AI-Powered Financial OS
          </h2>
          <p className="text-lg text-white/70">
            Start your intelligent financial journey by uploading your first transaction file
          </p>
        </div>

        {/* Empty State Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total Balance', icon: DollarSign, color: 'blue' },
            { title: 'Monthly Income', icon: TrendingUp, color: 'green' },
            { title: 'Monthly Expenses', icon: PieChart, color: 'purple' },
            { title: 'Savings Rate', icon: Target, color: 'emerald' }
          ].map((item, index) => {
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

        <CSVUpload />
      </section>
    );
  }

  // Dashboard with real data and AI insights
  return (
    <section className="min-h-screen w-full p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          AI-Powered Financial Intelligence Dashboard
        </h2>
        <p className="text-lg text-white/70">
          Smart insights powered by advanced AI analysis and bank format detection
        </p>
      </div>

      {/* AI Insights Card */}
      {(aiInsights || processingInsights) && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              {processingInsights ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <TrendingUp className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">AI Financial Insights</h3>
              <p className="text-white/60 text-sm">Personalized recommendations based on your spending patterns</p>
            </div>
          </div>
          
          {processingInsights ? (
            <div className="text-white/70">
              <div className="animate-pulse">Analyzing your financial patterns...</div>
            </div>
          ) : (
            <div className="text-white/90 whitespace-pre-line">
              {aiInsights}
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${getColorClasses('blue')} rounded-xl flex items-center justify-center`}>
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="text-white/70 text-sm font-medium mb-1">Total Balance</h3>
          <p className="text-lg font-bold text-white">${stats.totalBalance.toLocaleString()}</p>
          <p className="text-xs text-green-400 mt-1">AI-validated</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${getColorClasses('green')} rounded-xl flex items-center justify-center`}>
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="text-white/70 text-sm font-medium mb-1">Monthly Income</h3>
          <p className="text-lg font-bold text-white">${stats.monthlyIncome.toLocaleString()}</p>
          <p className="text-xs text-green-400 mt-1">Smart categorized</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${getColorClasses('purple')} rounded-xl flex items-center justify-center`}>
              <PieChart className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="text-white/70 text-sm font-medium mb-1">Monthly Expenses</h3>
          <p className="text-lg font-bold text-white">${stats.monthlyExpenses.toLocaleString()}</p>
          <p className="text-xs text-red-400 mt-1">Auto-tracked</p>
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
            {stats.savingsRate > 20 ? 'AI: Excellent!' : 'AI: Optimize'}
          </p>
        </div>
      </div>

      {/* CSV Upload */}
      <CSVUpload />

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl shadow-2xl">
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
              <div className="flex items-center space-x-2">
                <span className="text-white/60 text-sm">{recentTransactions.length} transactions</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="AI-categorized"></div>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            {isMobile ? (
              <div className="space-y-3">
                {recentTransactions.slice(0, 5).map((transaction) => (
                  <TransactionCard key={transaction.id} transaction={transaction} />
                ))}
              </div>
            ) : (
              <TransactionTable transactions={recentTransactions.slice(0, 10)} />
            )}
          </div>
          
          <div className="p-4 border-t border-white/20 text-center">
            <button 
              onClick={() => document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg font-medium"
            >
              View All AI-Categorized Transactions
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
