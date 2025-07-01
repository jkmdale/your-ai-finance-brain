// src/modules/import/controller.ts import { parseBankCSV } from '@parsers/bankCsvParser' import { categorizeTransactions } from '@/modules/categorization' import { updateBudgetFromTransactions } from '@/modules/budget' import { updateDashboardState } from '@/modules/dashboard' import { recommendSmartGoals } from '@/modules/goals' import { encryptAndStoreTransactions } from '@/modules/storage/secureStore'

import type { Transaction } from '@/types/Transaction'

export async function handleBulkImport(filename: string, rawData: any[][]): Promise<void> { try { // 1. Parse const transactions: Transaction[] = parseBankCSV(filename, rawData)

// 2. Categorize
const categorized = categorizeTransactions(transactions)

// 3. Budget update
updateBudgetFromTransactions(categorized)

// 4. Dashboard
updateDashboardState(categorized)

// 5. SMART goal engine
recommendSmartGoals(categorized)

// 6. Secure local storage (IndexedDB + AES-256)
await encryptAndStoreTransactions(categorized)

console.info('✅ Import pipeline complete')

} catch (err) { console.error('❌ Bulk import failed:', err) throw err } }

