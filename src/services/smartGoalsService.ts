/**
 * SMART Goals Service
 * Saves AI-generated financial goals to Supabase
 */

import { supabase } from '@/integrations/supabase/client';

export interface SmartGoalData {
  name: string;
  target_amount: number;
  deadline: string;
  rationale: string;
}

export interface SavedSmartGoal {
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

export class SmartGoalsService {
  /**
   * Save AI-generated SMART goals to the database
   */
  async saveSmartGoals(
    userId: string,
    goals: SmartGoalData[]
  ): Promise<SavedSmartGoal[]> {
    if (goals.length === 0) return [];

    console.log(`🎯 Saving ${goals.length} SMART goals for user ${userId}...`);

    try {
      // Determine goal types and priorities based on names and rationale
      const goalEntries = goals.map((goal, index) => {
        const goalType = this.determineGoalType(goal.name, goal.rationale);
        const priority = this.determinePriority(goal.name, goal.rationale, index);

        return {
          user_id: userId,
          name: goal.name,
          target_amount: Math.round(goal.target_amount),
          current_amount: 0, // Start at 0
          target_date: goal.deadline,
          goal_type: goalType,
          priority,
          is_active: true
        };
      });

      // Deactivate existing goals to make room for new ones (keep only 6 active)
      await this.manageActiveGoals(userId);

      // Insert new goals
      const { data, error } = await supabase
        .from('financial_goals')
        .insert(goalEntries)
        .select('*');

      if (error) throw error;

      console.log(`✅ Successfully saved ${data?.length || 0} SMART goals`);
      return data || [];

    } catch (error: any) {
      console.error('❌ Error saving SMART goals:', error);
      throw error;
    }
  }

  /**
   * Update goal progress based on actual spending/saving
   */
  async updateGoalProgress(
    userId: string,
    goalId: string,
    newCurrentAmount: number
  ): Promise<void> {
    const { error } = await supabase
      .from('financial_goals')
      .update({
        current_amount: newCurrentAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Get active goals for a user
   */
  async getActiveGoals(userId: string): Promise<SavedSmartGoal[]> {
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Mark a goal as completed
   */
  async completeGoal(userId: string, goalId: string): Promise<void> {
    const { error } = await supabase
      .from('financial_goals')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Private helper methods

  private determineGoalType(name: string, rationale: string): string {
    const lowerName = name.toLowerCase();
    const lowerRationale = rationale.toLowerCase();

    if (lowerName.includes('emergency') || lowerRationale.includes('emergency')) {
      return 'emergency_fund';
    } else if (lowerName.includes('savings') || lowerName.includes('save') || lowerRationale.includes('savings')) {
      return 'savings';
    } else if (lowerName.includes('debt') || lowerRationale.includes('debt')) {
      return 'debt_reduction';
    } else if (lowerName.includes('investment') || lowerRationale.includes('investment')) {
      return 'investment';
    } else if (lowerName.includes('spending') || lowerName.includes('reduce') || lowerRationale.includes('reduce')) {
      return 'expense_reduction';
    } else if (lowerName.includes('income') || lowerRationale.includes('income')) {
      return 'income_increase';
    } else {
      return 'other';
    }
  }

  private determinePriority(name: string, rationale: string, index: number): number {
    const lowerName = name.toLowerCase();
    const lowerRationale = rationale.toLowerCase();

    // Emergency fund is always highest priority
    if (lowerName.includes('emergency') || lowerRationale.includes('emergency')) {
      return 5;
    }

    // Debt reduction is high priority
    if (lowerName.includes('debt') || lowerRationale.includes('debt')) {
      return 4;
    }

    // Savings goals are medium-high priority
    if (lowerName.includes('savings') || lowerName.includes('save')) {
      return 3;
    }

    // Expense reduction is medium priority
    if (lowerName.includes('reduce') || lowerName.includes('spending')) {
      return 2;
    }

    // Default priority based on order (first goals are more important)
    return Math.max(3 - index, 1);
  }

  private async manageActiveGoals(userId: string): Promise<void> {
    // Get current active goals
    const { data: currentGoals } = await supabase
      .from('financial_goals')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (!currentGoals || currentGoals.length < 6) return; // No need to deactivate if less than 6

    // Keep the 3 most recent/important goals, deactivate the rest
    const goalsToDeactivate = currentGoals.slice(3);
    
    if (goalsToDeactivate.length > 0) {
      const { error } = await supabase
        .from('financial_goals')
        .update({ is_active: false })
        .in('id', goalsToDeactivate.map(g => g.id));

      if (error) {
        console.warn('Warning: Could not deactivate old goals:', error);
      } else {
        console.log(`📋 Deactivated ${goalsToDeactivate.length} old goals to make room for new ones`);
      }
    }
  }

  /**
   * Analyze transactions and update goal progress automatically
   */
  async analyzeAndUpdateGoalProgress(userId: string): Promise<void> {
    try {
      const goals = await this.getActiveGoals(userId);
      if (goals.length === 0) return;

      // Get recent transactions to analyze progress
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('transaction_date', threeMonthsAgo.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false });

      if (!transactions) return;

      // Update each goal based on transaction analysis
      for (const goal of goals) {
        let newCurrentAmount = goal.current_amount;

        switch (goal.goal_type) {
          case 'emergency_fund':
          case 'savings':
            // Calculate total savings (income - expenses)
            const totalIncome = transactions
              .filter(t => t.is_income)
              .reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = transactions
              .filter(t => !t.is_income && !t.tags?.includes('transfer'))
              .reduce((sum, t) => sum + t.amount, 0);
            newCurrentAmount = Math.max(0, totalIncome - totalExpenses);
            break;

          case 'expense_reduction':
            // Find relevant category and calculate reduction
            const categoryName = goal.name.toLowerCase();
            const relevantExpenses = transactions
              .filter(t => !t.is_income && 
                      (t.description.toLowerCase().includes(categoryName) ||
                       t.merchant?.toLowerCase().includes(categoryName)))
              .reduce((sum, t) => sum + t.amount, 0);
            
            // Progress = target - current spending (lower spending = higher progress)
            newCurrentAmount = Math.max(0, goal.target_amount - relevantExpenses);
            break;

          case 'debt_reduction':
            // This would need debt balance tracking - for now, use a simple calculation
            const debtPayments = transactions
              .filter(t => !t.is_income && 
                      (t.description.toLowerCase().includes('loan') ||
                       t.description.toLowerCase().includes('credit card')))
              .reduce((sum, t) => sum + t.amount, 0);
            newCurrentAmount = Math.min(goal.target_amount, debtPayments);
            break;
        }

        // Only update if there's a meaningful change
        if (Math.abs(newCurrentAmount - goal.current_amount) > 10) {
          await this.updateGoalProgress(userId, goal.id, newCurrentAmount);
        }
      }

      console.log(`✅ Updated progress for ${goals.length} goals`);
    } catch (error) {
      console.error('Error analyzing goal progress:', error);
    }
  }
}

export const smartGoalsService = new SmartGoalsService();
