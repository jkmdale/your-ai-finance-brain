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
export interface UploadResult {
  success: boolean;
  fileName: string;
  processed: number;
  errors: string[];
  warnings: string[];
}

export async function handleMultipleFiles(files: FileList): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const result = await handleCsvUpload(file);
      results.push(result);
    } catch (error: any) {
      results.push({
        success: false,
        fileName: file.name,
        processed: 0,
        errors: [error.message],
        warnings: []
      });
    }
  }
  
  return results;
}

export async function handleCsvUpload(file: File): Promise<UploadResult> {
  const result: UploadResult = {
    success: false,
    fileName: file.name,
    processed: 0,
    errors: [],
    warnings: []
  };

  try {
    const raw = await file.text();
    
    // Validate CSV content
    if (!raw.trim()) {
      throw new Error('File is empty');
    }

    const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      result.warnings.push(...parsed.errors.map(e => e.message));
    }

    if (!parsed.data || parsed.data.length === 0) {
      throw new Error('No data found in CSV');
    }

    // Validate headers
    const headers = parsed.meta.fields || [];
    if (headers.length < 2) {
      throw new Error('CSV must have at least 2 columns');
    }

    const transactions = parseBankCSV(file.name, parsed.data, headers);
    
    if (transactions.length === 0) {
      throw new Error('No valid transactions found');
    }

    // Await categorization properly
    const categorized = await categorizeTransactions(transactions);

    await encryptAndStoreTransactions(categorized);
    updateDashboard();
    updateBudgets(categorized);
    recommendGoals(categorized);

    result.success = true;
    result.processed = categorized.length;
    
    console.log(`✅ Successfully processed ${categorized.length} transactions from ${file.name}`);
    return result;
  } catch (err: any) {
    result.errors.push(err.message);
    console.error(`❌ CSV Upload Error for ${file.name}:`, err);
    return result;
  }
}
