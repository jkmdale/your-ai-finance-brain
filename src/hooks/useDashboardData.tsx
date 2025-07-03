import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardStats, Transaction } from '@/types/dashboard';

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastDataRefresh, setLastDataRefresh] = useState<Date | null>(null);
  const { user } = useAuth();

  const generateBudget = (transactions: any[]) => {
    const totals = { Needs: 0, Wants: 0, Savings: 0 };
    transactions.forEach(tx => {
      // Extract budget group from tags array or notes field
      const budgetGroup = tx.tags?.[0] || tx.notes;
      if (totals[budgetGroup as keyof typeof totals] !== undefined) {
        totals[budgetGroup as keyof typeof totals] += Math.abs(tx.amount || 0);
      }
    });
    return totals;
  };

  const fetchDashboardData = async (forceRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log(`🔄 Loading dashboard data from Supabase ${forceRefresh ? '(forced refresh)' : ''}`);

      // Add a small delay if this is a forced refresh to ensure DB operations are complete
      if (forceRefresh) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Fetch ALL transactions from Supabase
      const { data: allTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(name, color)
        `)
        .eq('user_id', user.id)
        .not('tags', 'cs', '{transfer}')
        .order('transaction_date', { ascending: false });

      if (transactionsError) {
        console.error('❌ Error fetching transactions:', transactionsError);
        throw transactionsError;
      }

      console.log(`📊 Fetched ${allTransactions?.length || 0} transactions from Supabase`);

      // Fetch current active budgets for more accurate balance calculation
      const { data: budgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('📋 Active budget found:', budgets?.length > 0);

      // Fetch bank accounts for balance
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('user_id', user.id)
        .eq('is_active', true);

      console.log('🏦 Bank accounts:', accounts?.length || 0);

      if (allTransactions && allTransactions.length > 0) {
        // Get recent transactions for display (limit 10)
        const recentTransactionsData = allTransactions.slice(0, 10);

        // Calculate stats using ALL transactions for accuracy
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Get current month transactions
        const currentMonthTransactions = allTransactions.filter(t => {
          const transactionDate = new Date(t.transaction_date);
          return transactionDate.getMonth() === currentMonth && 
                 transactionDate.getFullYear() === currentYear &&
                 (!t.tags || !t.tags.includes('transfer'));
        });

        // Calculate totals from current month using is_income field
        const monthlyIncome = currentMonthTransactions
          .filter(t => t.is_income === true)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const monthlyExpenses = currentMonthTransactions
          .filter(t => t.is_income === false)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        // Use budget total balance if available, otherwise use bank accounts, or calculate from transactions
        const totalBalance = budgets && budgets.length > 0 
          ? (budgets[0].total_income || 0) - (budgets[0].total_expenses || 0)
          : accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 
            allTransactions.reduce((sum, t) => sum + t.amount, 0);

        const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

        // Generate budget summary from tags (budgetGroup)
        const budgetSummary = generateBudget(allTransactions);
        console.log('📊 Budget Summary from Supabase:', budgetSummary);

        const dashboardStats: DashboardStats = {
          totalBalance,
          monthlyIncome,
          monthlyExpenses,
          savingsRate,
          transactionCount: allTransactions.length,
          isValidated: true,
          warnings: []
        };

        console.log('📈 Calculated dashboard stats from Supabase:', {
          ...dashboardStats,
          budgetSummary,
          currentMonthTransactions: currentMonthTransactions.length,
          totalTransactions: allTransactions.length
        });

        setStats(dashboardStats);
        setRecentTransactions(recentTransactionsData);
        setLastDataRefresh(new Date());
        
      } else {
        console.log('📊 No transactions found in Supabase');
        setStats(null);
        setRecentTransactions([]);
        setLastDataRefresh(new Date());
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data from Supabase:', error);
      setStats(null);
      setRecentTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    console.log('🔄 Dashboard useEffect triggered - initial load');
    fetchDashboardData();
  }, [user]);

  // Separate effect for refresh key changes
  useEffect(() => {
    if (refreshKey > 0) {
      console.log(`🔄 Dashboard refresh triggered (key: ${refreshKey})`);
      fetchDashboardData(true);
    }
  }, [refreshKey]);

  return {
    stats,
    recentTransactions,
    loading,
    lastDataRefresh,
    triggerRefresh,
    refreshKey
  };
};