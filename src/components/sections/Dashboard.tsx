import React, { useEffect } from 'react';
import { CSVUpload } from './CSVUpload';
import { AICoach } from './AICoach'; // Add AI Coach import
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAIInsights } from '@/hooks/useAIInsights';
import { DashboardEvents } from '@/components/dashboard/DashboardEvents';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { AIInsightsCard } from '@/components/dashboard/AIInsightsCard';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { BudgetBreakdown } from '@/components/dashboard/BudgetBreakdown';
import { SmartBudgetGoals } from '@/components/dashboard/SmartBudgetGoals';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

export const Dashboard = () => {
  const {
    stats,
    recentTransactions,
    loading,
    error,
    lastDataRefresh,
    triggerRefresh,
    refreshKey
  } = useDashboardData();

  const {
    aiInsights,
    processingInsights,
    generateAIInsights,
    resetInsights,
    error: aiError
  } = useAIInsights();

  // Generate AI insights when we have new data
  useEffect(() => {
    if (refreshKey > 0 || (!aiInsights && recentTransactions.length > 5)) {
      generateAIInsights(recentTransactions.slice(0, 20));
    }
  }, [refreshKey, recentTransactions, aiInsights, generateAIInsights]);

  // 🔄 DASHBOARD REFRESH FIX - Listen for CSV upload events and trigger refresh
  useEffect(() => {
    const handleDashboardRefresh = (event: CustomEvent) => {
      console.log('[Dashboard] 🔄 CSV upload complete, refreshing dashboard...', event.detail);
      triggerRefresh();
    };

    const handleCSVUploadComplete = (event: CustomEvent) => {
      console.log('[Dashboard] 📊 CSV upload complete, triggering AI insights...', event.detail);
      const result = event.detail.result;
      
      // Force refresh dashboard data
      triggerRefresh();
      
      // Trigger AI insights generation if transactions were processed
      if (result.transactionsProcessed > 0) {
        setTimeout(() => {
          generateAIInsights(recentTransactions.slice(0, 20));
        }, 2000); // Wait for data to be refreshed
      }
    };

    // Listen for dashboard refresh events
    window.addEventListener('dashboard-refresh', handleDashboardRefresh);
    window.addEventListener('csv-upload-complete', handleCSVUploadComplete);

    return () => {
      window.removeEventListener('dashboard-refresh', handleDashboardRefresh);
      window.removeEventListener('csv-upload-complete', handleCSVUploadComplete);
    };
  }, [triggerRefresh, generateAIInsights, recentTransactions]);

  if (loading) {
    return <LoadingState lastDataRefresh={lastDataRefresh} />;
  }

  // Show error state if there's an error
  if (error) {
    return (
      <section className="min-h-screen w-full flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Financial Data</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <Button 
            onClick={triggerRefresh}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          {lastDataRefresh && (
            <p className="text-white/50 text-sm mt-4">
              Last successful refresh: {lastDataRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
      </section>
    );
  }

  if (!stats) {
    return <EmptyState lastDataRefresh={lastDataRefresh} onRetry={triggerRefresh} />;
  }

  return (
    <>
      <DashboardEvents 
        onRefresh={triggerRefresh} 
        onResetInsights={resetInsights} 
      />
      
      <section className="min-h-screen w-full max-w-full p-4 space-y-6 overflow-x-hidden">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            AI-Powered Financial Intelligence Dashboard
          </h2>
          <p className="text-lg text-white/70">
            Smart insights powered by advanced AI analysis and bank format detection
          </p>
          {lastDataRefresh && (
            <p className="text-white/50 text-sm mt-2">
              Data refreshed: {lastDataRefresh.toLocaleTimeString()} • {stats.transactionCount} transactions analyzed from Supabase
            </p>
          )}
        </div>

        <AIInsightsCard 
          aiInsights={aiInsights} 
          processingInsights={processingInsights}
          error={aiError}
        />

        <StatsCards stats={stats} />

        <CSVUpload />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BudgetBreakdown />
          <SmartBudgetGoals />
        </div>

        {/* AI Coach Section */}
        <div className="mt-6">
          <AICoach />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <RecentTransactions 
            recentTransactions={recentTransactions} 
            stats={stats} 
          />
        </div>
      </section>
    </>
  );
};