import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, DollarSign, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { calculateBudgetSummary, recommendSmartGoals } from '@/modules/goals/recommendations';
import { smartGoalsService } from '@/services/smartGoalsService';

interface SmartGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  goal_type: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export const SmartGoalsCard = () => {
  const [goals, setGoals] = useState<SmartGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSmartGoals();
      
      // Listen for SmartFinance completion to refresh goals
      const handleSmartFinanceComplete = () => {
        setTimeout(() => fetchSmartGoals(), 3000);
      };

      // Listen for CSV upload completion to regenerate goals
      const handleCsvComplete = async (event: any) => {
        if (!user) return;
        
        setLoading(true);
        try {
          // Get recent transactions from Supabase
          const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: false })
            .limit(200);

          if (transactions && transactions.length > 0) {
            // Transform to Transaction format for goal recommendations
            const formattedTransactions = transactions.map((t: any) => ({
              date: t.transaction_date,
              description: t.description,
              amount: t.amount,
              type: t.amount > 0 ? 'credit' : 'debit' as 'debit' | 'credit',
              account: 'imported',
              category: t.notes || 'Other'
            }));

            // Generate new goals based on actual transaction data with disposable income logic
            const newGoals = recommendSmartGoals(formattedTransactions);
            
            // Save to database if valid goals exist
            if (newGoals.length > 0) {
              const goalsForSaving = newGoals
                .filter(g => g.amount > 0)
                .map(goal => ({
                  name: goal.description,
                  target_amount: goal.amount,
                  deadline: new Date(Date.now() + goal.timeframeMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  rationale: goal.rationale
                }));
              
              if (goalsForSaving.length > 0) {
                await smartGoalsService.saveSmartGoals(user.id, goalsForSaving);
                console.log(`🎯 Generated and saved ${goalsForSaving.length} SMART goals based on transaction analysis`);
              }
            }
            
            // Refresh the goals display
            await fetchSmartGoals();
          }
        } catch (error) {
          console.error('Error generating goals after CSV upload:', error);
        } finally {
          setLoading(false);
        }
      };
      
      window.addEventListener('smartfinance-complete', handleSmartFinanceComplete);
      window.addEventListener('csv-upload-complete', handleCsvComplete);
      
      return () => {
        window.removeEventListener('smartfinance-complete', handleSmartFinanceComplete);
        window.removeEventListener('csv-upload-complete', handleCsvComplete);
      };
    }
  }, [user]);

  const fetchSmartGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching SMART goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (current: number, target: number): number => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilTarget = (targetDate: string): number => {
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPriorityColor = (priority: number): string => {
    if (priority >= 3) return 'text-red-400 bg-red-500/20';
    if (priority >= 2) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-green-400 bg-green-500/20';
  };

  const getPriorityLabel = (priority: number): string => {
    if (priority >= 3) return 'High';
    if (priority >= 2) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <Target className="w-6 h-6 text-purple-400 animate-pulse" />
          <h3 className="text-xl font-semibold text-white">SMART Goals</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <Target className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-semibold text-white">SMART Goals</h3>
        </div>
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/70 mb-2">No SMART goals yet</p>
          <p className="text-white/50 text-sm">Upload your bank statements to generate AI-powered financial goals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Target className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-semibold text-white">SMART Goals</h3>
        </div>
        <span className="text-white/60 text-sm">AI-Generated</span>
      </div>

      <div className="space-y-4">
        {goals.map((goal) => {
          const progress = calculateProgress(goal.current_amount, goal.target_amount);
          const daysUntil = getDaysUntilTarget(goal.target_date);
          const isCompleted = progress >= 100;
          const isOverdue = daysUntil < 0 && !isCompleted;

          return (
            <div key={goal.id} className={`bg-white/5 rounded-lg p-4 border-l-4 ${
              isCompleted ? 'border-green-400' : 
              isOverdue ? 'border-red-400' : 
              'border-purple-400'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-white font-medium">{goal.name}</h4>
                    {isCompleted && <CheckCircle className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-white/70">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-3 h-3" />
                      <span>{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span className={isOverdue ? 'text-red-400' : ''}>
                        {isOverdue ? `${Math.abs(daysUntil)} days overdue` : 
                         daysUntil === 0 ? 'Due today' : 
                         `${daysUntil} days left`}
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(goal.priority)}`}>
                  {getPriorityLabel(goal.priority)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-green-400' : 
                      progress > 75 ? 'bg-yellow-400' : 
                      'bg-purple-400'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Goal Type and Target Date */}
              <div className="flex items-center justify-between text-xs text-white/50">
                <span className="capitalize">{goal.goal_type.replace('_', ' ')}</span>
                <span>Target: {formatDate(goal.target_date)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {goals.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">
              {goals.filter(g => calculateProgress(g.current_amount, g.target_amount) >= 100).length} of {goals.length} completed
            </span>
            <button className="text-purple-400 hover:text-purple-300 flex items-center space-x-1 transition-colors">
              <span>View All Goals</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};