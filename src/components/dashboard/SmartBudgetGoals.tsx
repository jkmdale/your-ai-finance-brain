import React, { useEffect, useState } from 'react';
import { Target, TrendingUp, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SmartGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  progress: number;
}

interface BudgetInsight {
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  topExpenseCategory: { name: string; amount: number };
  monthlyBalance: number;
}

export const SmartBudgetGoals = () => {
  const [goals, setGoals] = useState<SmartGoal[]>([]);
  const [budgetInsight, setBudgetInsight] = useState<BudgetInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchGoalsAndInsights();
    
    // Listen for budget updates
    const handleBudgetUpdate = () => {
      setTimeout(() => fetchGoalsAndInsights(), 1500);
    };
    
    window.addEventListener('smartfinance-complete', handleBudgetUpdate);
    return () => window.removeEventListener('smartfinance-complete', handleBudgetUpdate);
  }, [user]);

  const fetchGoalsAndInsights = async () => {
    if (!user) return;

    try {
      // Fetch existing SMART goals
      const { data: existingGoals } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Get budget insights from recent transactions
      const currentMonth = new Date().toISOString().substring(0, 7);
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(name)
        `)
        .eq('user_id', user.id)
        .gte('transaction_date', `${currentMonth}-01`)
        .lt('transaction_date', `${currentMonth}-32`)
        .not('tags', 'cs', '{transfer}');

      if (transactions && transactions.length > 0) {
        const totalIncome = transactions
          .filter(tx => tx.is_income)
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        
        const totalExpenses = transactions
          .filter(tx => !tx.is_income)
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
        const monthlyBalance = totalIncome - totalExpenses;

        // Calculate top expense category
        const expensesByCategory: { [key: string]: number } = {};
        transactions
          .filter(tx => !tx.is_income)
          .forEach(tx => {
            const categoryName = tx.categories?.name || 'Uncategorized';
            expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + Math.abs(tx.amount);
          });

        const topExpenseCategory = Object.entries(expensesByCategory)
          .sort(([, a], [, b]) => b - a)[0];

        const insight: BudgetInsight = {
          totalIncome,
          totalExpenses,
          savingsRate,
          topExpenseCategory: topExpenseCategory ? 
            { name: topExpenseCategory[0], amount: topExpenseCategory[1] } :
            { name: 'None', amount: 0 },
          monthlyBalance
        };

        setBudgetInsight(insight);

        // Generate SMART goals if none exist
        if (!existingGoals || existingGoals.length === 0) {
          await generateSmartGoals(insight);
        } else {
          const goalsWithProgress = existingGoals.map(goal => ({
            id: goal.id,
            name: goal.name,
            target_amount: goal.target_amount,
            current_amount: goal.current_amount,
            deadline: goal.target_date || '',
            rationale: `Financial goal: ${goal.name}`,
            progress: goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0,
            priority: goal.priority === 3 ? 'high' as const : goal.priority === 2 ? 'medium' as const : 'low' as const
          }));
          setGoals(goalsWithProgress);
        }
      }
    } catch (error) {
      console.error('Error fetching goals and insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSmartGoals = async (insight: BudgetInsight) => {
    if (!user) return;

    const generatedGoals: Omit<SmartGoal, 'id' | 'progress'>[] = [];

    // Emergency Fund Goal (if savings rate is low or no emergency fund)
    if (insight.savingsRate < 25 || insight.monthlyBalance < insight.totalExpenses * 0.5) {
      generatedGoals.push({
        name: 'Build Emergency Fund',
        target_amount: Math.round(insight.totalExpenses * 3), // 3 months of expenses
        current_amount: 0,
        deadline: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 months
        rationale: `Build 3 months of expenses ($${Math.round(insight.totalExpenses * 3).toLocaleString()}) for financial security. Currently saving ${insight.savingsRate.toFixed(1)}% of income.`,
        priority: 'high' as const
      });
    }

    // Savings Rate Improvement Goal
    if (insight.savingsRate < 20) {
      const targetMonthlySavings = Math.round(insight.totalIncome * 0.2);
      generatedGoals.push({
        name: 'Achieve 20% Savings Rate',
        target_amount: targetMonthlySavings,
        current_amount: Math.max(0, insight.monthlyBalance),
        deadline: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months
        rationale: `Increase monthly savings to $${targetMonthlySavings.toLocaleString()} (20% of income). Current rate: ${insight.savingsRate.toFixed(1)}%`,
        priority: 'high' as const
      });
    }

    // Top Expense Reduction Goal
    if (insight.topExpenseCategory.amount > insight.totalIncome * 0.15) {
      const reductionTarget = Math.round(insight.topExpenseCategory.amount * 0.8);
      generatedGoals.push({
        name: `Reduce ${insight.topExpenseCategory.name} Spending`,
        target_amount: reductionTarget,
        current_amount: insight.topExpenseCategory.amount,
        deadline: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months
        rationale: `${insight.topExpenseCategory.name} is ${((insight.topExpenseCategory.amount / insight.totalIncome) * 100).toFixed(1)}% of income. Reduce by 20% to $${reductionTarget.toLocaleString()}/month.`,
        priority: 'medium' as const
      });
    }

    // Debt Payoff Goal (if expenses are high relative to income)
    if (insight.savingsRate < 10 && insight.totalExpenses > insight.totalIncome * 0.85) {
      generatedGoals.push({
        name: 'Improve Cash Flow',
        target_amount: Math.round(insight.totalIncome * 0.15), // Target 15% positive cash flow
        current_amount: Math.max(0, insight.monthlyBalance),
        deadline: new Date(Date.now() + 9 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 9 months
        rationale: `Currently spending ${((insight.totalExpenses / insight.totalIncome) * 100).toFixed(1)}% of income. Target positive cash flow of 15%.`,
        priority: 'high' as const
      });
    }

    // Save goals to database
    if (generatedGoals.length > 0) {
      try {
        const goalsToInsert = generatedGoals.slice(0, 3).map(goal => ({ // Limit to 3 goals
          user_id: user.id,
          name: goal.name,
          goal_type: goal.name.toLowerCase().includes('emergency') ? 'emergency' : 
                    goal.name.toLowerCase().includes('savings') ? 'savings' : 'other',
          target_amount: goal.target_amount,
          current_amount: goal.current_amount,
          target_date: goal.deadline,
          priority: goal.priority === 'high' ? 3 : goal.priority === 'medium' ? 2 : 1,
          is_active: true
        }));

        const { data: savedGoals, error } = await supabase
          .from('financial_goals')
          .insert(goalsToInsert)
          .select('*');

        if (error) throw error;

        const goalsWithProgress = savedGoals.map(goal => ({
          ...goal,
          progress: goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0,
          priority: goal.priority === 3 ? 'high' as const : goal.priority === 2 ? 'medium' as const : 'low' as const,
          deadline: goal.target_date,
          rationale: generatedGoals.find(g => g.name === goal.name)?.rationale || ''
        }));

        setGoals(goalsWithProgress);

        toast({
          title: "SMART Goals Generated! 🎯",
          description: `Created ${savedGoals.length} personalized financial goals based on your spending patterns.`,
        });
      } catch (error) {
        console.error('Error saving generated goals:', error);
      }
    }
  };

  const updateGoalProgress = async (goalId: string, newAmount: number) => {
    try {
      const { error } = await supabase
        .from('financial_goals')
        .update({ current_amount: newAmount })
        .eq('id', goalId);

      if (error) throw error;

      setGoals(prev => prev.map(goal => 
        goal.id === goalId 
          ? { ...goal, current_amount: newAmount, progress: (newAmount / goal.target_amount) * 100 }
          : goal
      ));

      toast({
        title: "Goal Updated! ✅",
        description: "Progress has been saved successfully.",
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: "Error",
        description: "Failed to update goal progress.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-white/10 rounded"></div>
            <div className="h-4 bg-white/10 rounded"></div>
            <div className="h-4 bg-white/10 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">SMART Financial Goals</h3>
          <p className="text-sm text-white/70">AI-generated based on your spending patterns</p>
        </div>
      </div>

      {budgetInsight && (
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <h4 className="text-white font-medium mb-3">Budget Insights</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60">Savings Rate:</span>
              <span className={`ml-2 font-medium ${budgetInsight.savingsRate > 20 ? 'text-green-400' : 'text-yellow-400'}`}>
                {budgetInsight.savingsRate.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-white/60">Monthly Balance:</span>
              <span className={`ml-2 font-medium ${budgetInsight.monthlyBalance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${budgetInsight.monthlyBalance.toLocaleString()}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-white/60">Top Expense:</span>
              <span className="ml-2 text-white font-medium">
                {budgetInsight.topExpenseCategory.name} (${budgetInsight.topExpenseCategory.amount.toLocaleString()})
              </span>
            </div>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/70 mb-4">No SMART goals yet</p>
          <p className="text-white/50 text-sm">Upload transactions to generate personalized financial goals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const daysUntilDeadline = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const isUrgent = daysUntilDeadline < 90;
            
            return (
              <div key={goal.id} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-medium flex items-center space-x-2">
                      <span>{goal.name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        goal.priority === 'high' ? 'bg-red-500/20 text-red-300' : 
                        goal.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' : 
                        'bg-green-500/20 text-green-300'
                      }`}>
                        {goal.priority}
                      </span>
                    </h4>
                    <p className="text-white/60 text-sm mt-1">{goal.rationale}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">${goal.target_amount.toLocaleString()}</p>
                    <p className="text-white/60 text-sm">{daysUntilDeadline} days left</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white/80 text-sm">Progress</span>
                    <span className="text-white font-medium">{goal.progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        goal.progress >= 100 ? 'bg-green-400' : 
                        goal.progress >= 50 ? 'bg-yellow-400' : 'bg-blue-400'
                      }`}
                      style={{ width: `${Math.min(100, goal.progress)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-white/60">Current: </span>
                    <span className="text-white font-medium">${goal.current_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isUrgent && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                    {goal.progress >= 100 && <CheckCircle className="w-4 h-4 text-green-400" />}
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                      onClick={() => {
                        const newAmount = prompt('Enter current amount:', goal.current_amount.toString());
                        if (newAmount && !isNaN(Number(newAmount))) {
                          updateGoalProgress(goal.id, Number(newAmount));
                        }
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Update
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};