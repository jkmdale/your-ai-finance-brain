
import React, { useEffect, useState } from 'react';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Target, DollarSign, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AIInsight {
  type: 'opportunity' | 'prediction' | 'alert' | 'goal';
  title: string;
  message: string;
  confidence: number;
  color: string;
}

export const AIInsights = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasTransactions, setHasTransactions] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  const getColorClasses = (color: string) => {
    const colorMap = {
      yellow: { bg: 'bg-yellow-400', gradient: 'from-yellow-400 to-yellow-500', text: 'text-yellow-400' },
      blue: { bg: 'bg-blue-400', gradient: 'from-blue-400 to-blue-500', text: 'text-blue-400' },
      orange: { bg: 'bg-orange-400', gradient: 'from-orange-400 to-orange-500', text: 'text-orange-400' },
      green: { bg: 'bg-green-400', gradient: 'from-green-400 to-green-500', text: 'text-green-400' }
    };
    return colorMap[color as keyof typeof colorMap] || { bg: 'bg-gray-400', gradient: 'from-gray-400 to-gray-500', text: 'text-gray-400' };
  };

  const generateInsightsFromData = async (transactions: any[]) => {
    const generatedInsights: AIInsight[] = [];
    
    // Calculate spending patterns
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    const monthlyExpenses = thisMonthTransactions
      .filter(t => !t.is_income && (!t.tags || !t.tags.includes('transfer')))
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyIncome = thisMonthTransactions
      .filter(t => t.is_income)
      .reduce((sum, t) => sum + t.amount, 0);

    // Generate spending optimization insight
    if (monthlyExpenses > 0) {
      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
      
      if (savingsRate < 20) {
        generatedInsights.push({
          type: 'opportunity',
          title: 'Savings Opportunity Detected',
          message: `Your current savings rate is ${savingsRate.toFixed(1)}%. By optimizing your spending patterns, you could potentially increase your savings by 10-15%.`,
          confidence: 85,
          color: 'yellow'
        });
      }
    }

    // Generate cash flow prediction
    if (monthlyIncome > monthlyExpenses) {
      generatedInsights.push({
        type: 'prediction',
        title: 'Positive Cash Flow Trend',
        message: `Your monthly surplus of $${(monthlyIncome - monthlyExpenses).toLocaleString()} indicates healthy financial habits. Consider increasing investment allocation.`,
        confidence: 82,
        color: 'green'
      });
    } else if (monthlyExpenses > monthlyIncome) {
      generatedInsights.push({
        type: 'alert',
        title: 'Budget Deficit Alert',
        message: `You're spending $${(monthlyExpenses - monthlyIncome).toLocaleString()} more than you earn this month. Review discretionary expenses to balance your budget.`,
        confidence: 90,
        color: 'orange'
      });
    }

    // Category-based insights
    const categorySpending: { [key: string]: number } = {};
    thisMonthTransactions
      .filter(t => !t.is_income && t.categories && (!t.tags || !t.tags.includes('transfer')))
      .forEach(t => {
        const categoryName = t.categories.name;
        if (!categorySpending[categoryName]) categorySpending[categoryName] = 0;
        categorySpending[categoryName] += t.amount;
      });

    const topCategory = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)[0];

    if (topCategory && topCategory[1] > monthlyIncome * 0.3) {
      generatedInsights.push({
        type: 'alert',
        title: 'High Category Spending',
        message: `Your ${topCategory[0]} spending ($${topCategory[1].toLocaleString()}) represents ${((topCategory[1] / monthlyIncome) * 100).toFixed(1)}% of your income. Consider setting a budget limit.`,
        confidence: 88,
        color: 'orange'
      });
    }

    return generatedInsights;
  };

  const checkForDataAndGenerateInsights = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check if user has any transactions (excluding transfers)
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(name, color)
        `)
        .eq('user_id', user.id)
        .not('tags', 'cs', '["transfer"]');

      const hasData = transactions && transactions.length > 0;
      setHasTransactions(hasData);

      if (hasData) {
        console.log('Generating AI insights from transaction data...');
        const generatedInsights = await generateInsightsFromData(transactions);
        setInsights(generatedInsights);
      }
    } catch (error) {
      console.error('Error checking user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkForDataAndGenerateInsights();
  }, [user, refreshKey]);

  // 🤖 AI COACH FIX - Listen for CSV uploads to refresh insights and activate AI coach
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'csv-upload-complete') {
        console.log('[AIInsights] 🤖 CSV upload detected via storage, refreshing AI insights...');
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
        }, 2000); // Give time for transaction processing to complete
      }
    };

    const handleCSVUploadComplete = (event: CustomEvent) => {
      console.log('[AIInsights] 🤖 CSV upload complete event detected, activating AI coach...', event.detail);
      const result = event.detail.result;
      
      // Force refresh insights with immediate activation
      if (result.transactionsProcessed > 0) {
        setHasTransactions(true);
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
        }, 2000);
      }
    };

    const handleDashboardRefresh = () => {
      console.log('[AIInsights] 🤖 Dashboard refresh detected, updating AI coach...');
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 1500);
    };

    const handleTransactionsCategorized = () => {
      console.log('[AIInsights] 🤖 Transactions categorized, generating new insights...');
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 1000);
    };

    // Listen for multiple events to ensure AI coach activates
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('csv-upload-complete', handleCSVUploadComplete);
    window.addEventListener('dashboard-refresh', handleDashboardRefresh);
    window.addEventListener('transactions-categorized', handleTransactionsCategorized);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('csv-upload-complete', handleCSVUploadComplete);
      window.removeEventListener('dashboard-refresh', handleDashboardRefresh);
      window.removeEventListener('transactions-categorized', handleTransactionsCategorized);
    };
  }, []);

  if (loading) {
    return (
      <section id="insights" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  // Empty state for users without transaction data
  if (!hasTransactions) {
    return (
      <section id="insights" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 mb-6">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-white/90 text-sm font-medium">AI-Powered Insights</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Your Personal Financial AI Coach
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Upload your transactions to unlock personalized AI insights, predictions, and recommendations
            </p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-3xl p-12 shadow-2xl text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">AI Learning Mode</h3>
            <p className="text-white/70 mb-8 max-w-2xl mx-auto">
              Your AI financial coach is ready to learn from your spending patterns. Upload your transaction data to unlock personalized insights and recommendations.
            </p>

            {/* AI Capabilities Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { name: 'Spending Analysis', icon: TrendingUp, color: 'blue', description: 'Pattern recognition' },
                { name: 'Smart Alerts', icon: AlertTriangle, color: 'orange', description: 'Unusual activity detection' },
                { name: 'Opportunities', icon: Lightbulb, color: 'yellow', description: 'Savings optimization' },
                { name: 'Goal Coaching', icon: Target, color: 'green', description: 'Achievement strategies' }
              ].map((capability, index) => {
                const IconComponent = capability.icon;
                return (
                  <div key={index} className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4">
                    <div className={`w-12 h-12 bg-gradient-to-br from-${capability.color}-400 to-${capability.color}-500 rounded-xl flex items-center justify-center mx-auto mb-3 opacity-50`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-white font-medium mb-1">{capability.name}</h4>
                    <p className="text-white/60 text-xs">{capability.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="backdrop-blur-sm bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-300" />
                <span className="text-purple-300 font-medium">Ready to Learn</span>
              </div>
              <p className="text-white/80 text-sm">
                Upload your bank transactions to activate AI-powered financial insights and personalized coaching.
              </p>
            </div>

            <button 
              onClick={() => document.getElementById('csv-upload-container')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 font-medium"
            >
              Upload Transactions to Start
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="insights" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 mb-6">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="text-white/90 text-sm font-medium">AI-Powered Insights</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Your Personal Financial AI Coach
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            AI analysis based on your actual spending patterns and financial data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {insights.map((insight, index) => {
            const iconMap = {
              opportunity: Lightbulb,
              prediction: TrendingUp,
              alert: AlertTriangle,
              goal: Target
            };
            const IconComponent = iconMap[insight.type];
            const colors = getColorClasses(insight.color);
            return (
              <div key={index} className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-2xl">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">{insight.title}</h3>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 ${colors.bg} rounded-full`}></div>
                        <span className="text-white/60 text-xs">{insight.confidence}% confidence</span>
                      </div>
                    </div>
                    
                    <p className="text-white/80 leading-relaxed mb-4">{insight.message}</p>
                    
                    <div className="flex items-center justify-between">
                      <button className={`${colors.text} hover:opacity-80 font-medium text-sm transition-colors duration-200`}>
                        View Details →
                      </button>
                      <div className="flex space-x-2">
                        <button className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors duration-200">
                          <DollarSign className="w-4 h-4 text-white/60" />
                        </button>
                        <button className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors duration-200">
                          <Target className="w-4 h-4 text-white/60" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Chat Interface Preview */}
        <div className="mt-12 backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Ask Your Financial AI</h3>
              <p className="text-white/60 text-sm">Natural language financial advice</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl rounded-br-sm px-4 py-3 max-w-md">
                <p className="text-white text-sm">"How can I optimize my spending based on my recent transactions?"</p>
              </div>
            </div>
            
            <div className="flex justify-start">
              <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-2xl rounded-bl-sm px-4 py-3 max-w-md">
                <p className="text-white text-sm">I'm analyzing your spending patterns now. Based on your transaction history, I can provide personalized recommendations to help you save more effectively.</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <input 
              type="text" 
              placeholder="Ask me anything about your finances..."
              className="flex-1 bg-white/10 border border-white/20 rounded-full px-6 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
            />
            <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-3 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg">
              <Brain className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
