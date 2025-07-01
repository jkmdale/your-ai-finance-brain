/*
  File: src/modules/import/handleCsvUpload.ts
  Description: Handles CSV upload from UI, processes parsing, triggers categorization, storage, and all downstream dashboard effects.
*/

import Papa from 'papaparse';
import { parseBankCSV } from './parsers/bankCsvParser';
import { categorizeTransactions } from '../ai/categorizer';
import { updateDashboard } from '../dashboard/update';
import { updateBudgets } from '../budget/update';
import { recommendGoals } from '../goals/recommender';
import { encryptAndStoreTransactions } from '../storage/encryptedStorage';

/**
 * Upload + process single CSV file end-to-end
 */
export async function handleCsvUpload(file: File): Promise<void> {
  try {
    const raw = await file.text();
    const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      throw new Error(`CSV Parse error: ${parsed.errors[0].message}`);
    }

    const transactions = parseBankCSV(file.name, parsed.data);
    const categorized = categorizeTransactions(transactions);

    await encryptAndStoreTransactions(categorized);
    updateDashboard();
    updateBudgets(categorized);
    recommendGoals(categorized);

    console.log(`✅ Successfully processed ${categorized.length} transactions.`);
  } catch (err) {
    console.error('❌ CSV Upload Error:', err);
    throw err;
  }
}
