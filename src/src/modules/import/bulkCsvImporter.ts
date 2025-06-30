/* File: src/modules/import/bulkCsvImporter.ts Description: Handles bulk CSV imports from NZ banks (ANZ, ASB, Westpac, Kiwibank, NZ Bank), triggers categorization, dashboard update, budget sync, and SMART goals recommendation. */

import Papa from 'papaparse'; import { categorizeTransactions } from '../ai/categorizer'; import { updateDashboard } from '../dashboard/update'; import { updateBudgets } from '../budget/update'; import { recommendGoals } from '../goals/recommender'; import { encryptAndStoreTransactions } from '../storage/encryptedStorage'; import { parseBankCSV } from './parsers/bankCsvParser';

interface BulkImportResult { success: boolean; errors: string[]; importedCount: number; }

/**

Imports and processes multiple CSV files from different NZ banks */ export async function bulkImportCSVs(files: File[]): Promise<BulkImportResult> { const errors: string[] = []; let allTransactions: any[] = [];


for (const file of files) { try { const text = await file.text(); const parsed = Papa.parse(text, { header: true, skipEmptyLines: true }); if (parsed.errors.length > 0) { errors.push(Parse error in ${file.name}: ${parsed.errors[0].message}); continue; } const normalized = parseBankCSV(file.name, parsed.data); allTransactions = allTransactions.concat(normalized); } catch (err) { errors.push(Error processing ${file.name}: ${(err as Error).message}); } }

if (allTransactions.length > 0) { const categorized = categorizeTransactions(allTransactions); await encryptAndStoreTransactions(categorized); updateDashboard(); updateBudgets(categorized); recommendGoals(categorized); }

return { success: errors.length === 0, errors, importedCount: allTransactions.length, }; }

