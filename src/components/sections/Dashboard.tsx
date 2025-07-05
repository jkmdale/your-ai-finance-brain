import React, { useEffect } from 'react';
import { CSVUpload } from './CSVUpload';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAIInsights } from '@/hooks/useAIInsights';
import { DashboardEvents } from '@/components/dashboard/DashboardEvents';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { AIInsightsCard } from '@/components/dashboard/AIInsightsCard';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { SmartGoalsCard } from '@/components/dashboard/SmartGoalsCard';

export const Dashboard = () => {
  const {
    stats,
    recentTransactions,
    loading,
    lastDataRefresh,
    triggerRefresh,
    refreshKey
  } = useDashboardData();

  const {
    aiInsights,
    processingInsights,
    generateAIInsights,
    resetInsights,
    error
  } = useAIInsights();

  // Generate AI insights when we have new data
  useEffect(() => {
    if (refreshKey > 0 || (!aiInsights && recentTransactions.length > 5)) {
      generateAIInsights(recentTransactions.slice(0, 20));
    }
  }, [refreshKey, recentTransactions, aiInsights, generateAIInsights]);

  if (loading) {
    return <LoadingState lastDataRefresh={lastDataRefresh} />;
  }

  if (!stats) {
    return <EmptyState lastDataRefresh={lastDataRefresh} />;
  }

  return (
    <>
      <DashboardEvents 
        onRefresh={triggerRefresh} 
        onResetInsights={resetInsights} 
      />
      
      <section className="min-h-screen w-full p-4 space-y-6">
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
          error={error}
        />

        <StatsCards stats={stats} />

        <CSVUpload />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SmartGoalsCard />
          <RecentTransactions 
            recentTransactions={recentTransactions} 
            stats={stats} 
          />
        </div>
      </section>
    </>
  );
};