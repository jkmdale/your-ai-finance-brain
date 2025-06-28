
import { supabase } from '@/integrations/supabase/client';

interface IncrementalUpdateOptions {
  userId: string;
  newTransactions: any[];
  preserveExisting: boolean;
}

export class IncrementalUpdateService {
  
  async updateBudgetsIncrementally(options: IncrementalUpdateOptions) {
    const { userId, newTransactions, preserveExisting = true } = options;
    
    if (!preserveExisting) {
      console.log('🔄 Creating fresh budget (not preserving existing)');
      return null;
    }

    try {
      console.log('📊 Updating existing budgets incrementally...');
      
      // Get current active budget
      const { data: existingBudgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!existingBudgets || existingBudgets.length === 0) {
        console.log('No existing budget found, will create new one');
        return null;
      }

      const currentBudget = existingBudgets[0];
      
      // Calculate new totals from new transactions
      const newIncome = newTransactions
        .filter(t => t.is_income)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const newExpenses = newTransactions
        .filter(t => !t.is_income)
        .reduce((sum, t) => sum + t.amount, 0);

      // Update budget with incremental amounts
      const { data: updatedBudget, error } = await supabase
        .from('budgets')
        .update({
          total_income: (currentBudget.total_income || 0) + newIncome,
          total_expenses: (currentBudget.total_expenses || 0) + newExpenses,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentBudget.id)
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Updated existing budget: +$${newIncome} income, +$${newExpenses} expenses`);
      return updatedBudget;
      
    } catch (error) {
      console.error('❌ Error updating budget incrementally:', error);
      return null;
    }
  }

  async updateGoalsIncrementally(options: IncrementalUpdateOptions) {
    const { userId, newTransactions, preserveExisting = true } = options;
    
    if (!preserveExisting) {
      console.log('🎯 Creating fresh goals (not preserving existing)');
      return { aiRecommendations: null, createdGoals: [] };
    }

    try {
      console.log('🎯 Updating existing goals incrementally...');
      
      // Get existing active goals
      const { data: existingGoals } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      // Calculate new savings from transactions
      const newIncome = newTransactions
        .filter(t => t.is_income)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const newExpenses = newTransactions
        .filter(t => !t.is_income)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const newSavings = newIncome - newExpenses;

      if (existingGoals && existingGoals.length > 0 && newSavings > 0) {
        // Update savings goals with new progress
        const savingsGoals = existingGoals.filter(g => 
          g.goal_type === 'savings' && g.current_amount < g.target_amount
        );

        for (const goal of savingsGoals) {
          const progressToAdd = Math.min(newSavings * 0.1, goal.target_amount - goal.current_amount);
          
          if (progressToAdd > 0) {
            await supabase
              .from('financial_goals')
              .update({
                current_amount: goal.current_amount + progressToAdd,
                updated_at: new Date().toISOString()
              })
              .eq('id', goal.id);
            
            console.log(`✅ Updated goal "${goal.name}": +$${progressToAdd.toFixed(2)}`);
          }
        }
      }

      return {
        aiRecommendations: 'Existing goals updated with new transaction data',
        createdGoals: existingGoals || []
      };
      
    } catch (error) {
      console.error('❌ Error updating goals incrementally:', error);
      return { aiRecommendations: null, createdGoals: [] };
    }
  }

  async shouldPreserveExistingData(userId: string): Promise<boolean> {
    try {
      // Check if user has existing transactions
      const { data: existingTransactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      return existingTransactions && existingTransactions.length > 0;
    } catch (error) {
      console.error('Error checking existing data:', error);
      return false;
    }
  }
}

export const incrementalUpdateService = new IncrementalUpdateService();
