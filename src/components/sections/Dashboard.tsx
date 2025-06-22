
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
}

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [financialHealth, setFinancialHealth] = useState<any>(null);
  const [spendingInsights, setSpendingInsights] = useState<any[]>([]);
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
        // For now, we'll show empty state since we removed encryption logic
        // This will be updated when we implement proper data storage
        setStats(null);
        setRecentTransactions([]);
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

  // Dashboard with real data (placeholder for when data storage is implemented)
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

        {/* This section will be populated when we implement proper data storage */}
        <div className="text-center py-12">
          <p className="text-white/70">Dashboard functionality will be restored once data storage is reimplemented.</p>
        </div>
      </div>
    </section>
  );
};
