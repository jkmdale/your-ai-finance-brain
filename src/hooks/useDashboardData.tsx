import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppState } from '@/store/appState';
import { transactionClassifier } from '@/utils/transactionClassifier';
import type { DashboardStats, Transaction } from '@/types/dashboard';

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastDataRefresh, setLastDataRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeMonth, setActiveMonth, setTotalTransactions } = useAppState();

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

    const TIMEOUT_MS = 10000; // 10 second timeout
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Loading dashboard data from Supabase ${forceRefresh ? '(forced refresh)' : ''}`);
      setError(null);

      // Check network connectivity first
      if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // Add a small delay if this is a forced refresh to ensure DB operations are complete
      if (forceRefresh) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Dashboard data loading timed out after 10 seconds. This might be due to a slow internet connection or server issues.'));
        }, TIMEOUT_MS);
      });

      // Fetch ALL transactions from Supabase with timeout
      const dataPromise = supabase
        .from('transactions')
        .select(`
          *,
          categories(name, color)
        `)
        .eq('user_id', user.id)
        .not('tags', 'cs', '{transfer}')
        .order('transaction_date', { ascending: false });

      const { data: allTransactions, error: transactionsError } = await Promise.race([
        dataPromise,
        timeoutPromise
      ]) as any;

      if (transactionsError) {
        console.error('❌ Error fetching transactions:', transactionsError);
        
        // Categorize different types of errors
        if (transactionsError.message?.includes('JWT')) {
          throw new Error('Session expired. Please refresh the page and sign in again.');
        } else if (transactionsError.message?.includes('network')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        } else if (transactionsError.message?.includes('timeout')) {
          throw new Error('Request timed out. Please try again.');
        } else {
          throw new Error(`Database error: ${transactionsError.message}`);
        }
      }

      console.log(`📊 Fetched ${allTransactions?.length || 0} transactions from Supabase in ${Date.now() - startTime}ms`);

      // Fetch current active budgets for more accurate balance calculation
      const budgetPromise = supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: budgets } = await Promise.race([
        budgetPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Budget fetch timeout')), 5000))
      ]) as any;

      console.log('📋 Active budget found:', budgets?.length > 0);

      // Fetch bank accounts for balance
      const accountPromise = supabase
        .from('bank_accounts')
        .select('balance')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const { data: accounts } = await Promise.race([
        accountPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Account fetch timeout')), 5000))
      ]) as any;

      console.log('🏦 Bank accounts:', accounts?.length || 0);

      if (allTransactions && allTransactions.length > 0) {
        // Use the new enhanced transaction classifier
        const classifiedTransactions = transactionClassifier.classifyTransactions(allTransactions);
        
        // Calculate monthly summary using the classifier
        const monthlySummary = transactionClassifier.calculateMonthlySummary(classifiedTransactions);
        
        // Set active month based on the classified data
        setActiveMonth(monthlySummary.month);
        setTotalTransactions(allTransactions.length);

        // Get recent transactions for display (limit 10)
        const recentTransactionsData = allTransactions.slice(0, 10);

        // Use budget total balance if available, otherwise calculate from transactions
        const totalBalance = budgets && budgets.length > 0 
          ? (budgets[0].total_income || 0) - (budgets[0].total_expenses || 0)
          : accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 
            monthlySummary.balance;

        // Generate budget summary from tags (budgetGroup)
        const budgetSummary = generateBudget(allTransactions);
        console.log('📊 Budget Summary from Supabase:', budgetSummary);

        const dashboardStats: DashboardStats = {
          totalBalance,
          monthlyIncome: monthlySummary.income,
          monthlyExpenses: monthlySummary.expenses,
          savingsRate: monthlySummary.savingsRate,
          transactionCount: monthlySummary.transactionCount,
          isValidated: true,
          warnings: []
        };

        console.log('📈 Enhanced dashboard stats from classifier:', {
          ...dashboardStats,
          budgetSummary,
          month: monthlySummary.month,
          incomeTransactions: monthlySummary.incomeTransactions.length,
          expenseTransactions: monthlySummary.expenseTransactions.length,
          transfersExcluded: monthlySummary.transferTransactions.length,
          reversalsExcluded: monthlySummary.reversalTransactions.length
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
      let errorMessage = 'An unexpected error occurred while loading your financial data.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Add additional context for common issues
      if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network and try again.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage += ' This might be due to a slow internet connection or server issues.';
      }
      
      setError(errorMessage);
      
      // Set empty data but still mark as "loaded" to prevent infinite loading
      setStats(null);
      setRecentTransactions([]);
      setLastDataRefresh(new Date());
    } finally {
      setLoading(false);
    }
  };

  // Add a safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Dashboard loading safety timeout reached - forcing loading to false');
        setLoading(false);
        setError('Loading timed out. Please try refreshing the page.');
      }
    }, 15000); // 15 second safety timeout

    return () => clearTimeout(safetyTimeout);
  }, [loading]);

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    console.log('🔄 Dashboard useEffect triggered - initial load');
    fetchDashboardData();

    // Listen for SmartFinance completion events
    const handleSmartFinanceComplete = () => {
      console.log('🎉 SmartFinance processing complete - refreshing dashboard');
      setTimeout(() => {
        fetchDashboardData(true);
      }, 2000); // Small delay to ensure database writes are complete
    };

    window.addEventListener('smartfinance-complete', handleSmartFinanceComplete);

    return () => {
      window.removeEventListener('smartfinance-complete', handleSmartFinanceComplete);
    };
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
    error,
    lastDataRefresh,
    triggerRefresh,
    refreshKey
  };
};