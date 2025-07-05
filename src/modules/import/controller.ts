// src/modules/import/controller.ts
import { parseBankCSV } from '@/modules/import/parsers/bankCsvParser';
import { categorizeTransactions } from '@/modules/ai/categorizer';
import { updateBudgetFromTransactions } from '@/modules/budget/update';
import { updateDashboardState } from '@/modules/dashboard/update';
import { recommendSmartGoals } from '@/modules/goals/recommendations';
import { encryptAndStoreTransactions } from '@/modules/storage/secureStore';
import { smartGoalsService } from '@/services/smartGoalsService';

import type { Transaction } from '@/types/Transaction';

export async function handleBulkImport(filename: string, rawData: any[][]): Promise<void> {
  try {
    // 1. Parse
    const transactions: Transaction[] = parseBankCSV(filename, rawData);

    // 2. Categorize (await the Promise)
    const categorized = await categorizeTransactions(transactions);

    // 3. Budget update
    updateBudgetFromTransactions(categorized);

    // 4. Dashboard
    updateDashboardState(categorized);

    // 5. SMART goal engine with improved disposable income logic
    const smartGoals = recommendSmartGoals(categorized);
    
    // Save goals to database if there are valid goals
    try {
      if (smartGoals.length > 0) {
        const goalsForSaving = smartGoals
          .filter(g => g.amount > 0) // Only save goals with actual targets
          .map(goal => ({
            name: goal.description,
            target_amount: goal.amount,
            deadline: new Date(Date.now() + goal.timeframeMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            rationale: goal.rationale
          }));
        
        console.log(`🎯 Generated ${goalsForSaving.length} SMART goals for saving`);
      }
    } catch (goalError) {
      console.warn('Could not process goals:', goalError);
    }

    // 6. Secure local storage (IndexedDB + AES-256)
    await encryptAndStoreTransactions(categorized);

    console.info('✅ Import pipeline complete');

  } catch (err) {
    console.error('❌ Bulk import failed:', err);
    throw err;
  }
}