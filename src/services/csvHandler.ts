// src/services/csvHandler.ts - Modern CSV processing service

import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

export interface CSVProcessResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  warnings: string[];
  transactions?: any[];
}

export async function processCSVFiles(files: FileList): Promise<CSVProcessResult> {
  if (!files.length) {
    throw new Error('No files provided');
  }

  const results: CSVProcessResult = {
    success: false,
    processed: 0,
    failed: 0,
    errors: [],
    warnings: [],
    transactions: []
  };

  try {
    for (const file of Array.from(files)) {
      console.log(`📄 Processing file: ${file.name}`);
      
      const fileContent = await file.text();
      
      const { data, error } = await supabase.functions.invoke('process-csv', {
        body: {
          csvData: fileContent,
          fileName: file.name
        }
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        results.errors.push(`${file.name}: ${error.message}`);
        results.failed++;
        continue;
      }

      if (data?.error) {
        console.error('❌ CSV processing error:', data.error);
        results.errors.push(`${file.name}: ${data.error}`);
        results.failed++;
        continue;
      }

      // Add successful results
      results.processed += data.processed || 0;
      
      if (data.transactions) {
        results.transactions!.push(...data.transactions);
      }

      if (data.warnings?.length > 0) {
        results.warnings.push(...data.warnings);
      }

      console.log(`✅ Processed ${data.processed} transactions from ${file.name}`);
    }

    results.success = results.processed > 0;
    return results;

  } catch (error) {
    console.error('❌ CSV processing error:', error);
    results.errors.push(error.message);
    return results;
  }
}

// Legacy function for backward compatibility
export async function handleCSVUpload(files: FileList): Promise<void> {
  const result = await processCSVFiles(files);
  
  if (!result.success) {
    throw new Error(result.errors.join('; ') || 'Processing failed');
  }

  // Dispatch event for dashboard
  window.dispatchEvent(new CustomEvent('csv-data-ready', {
    detail: {
      transactions: result.transactions,
      processed: result.processed
    }
  }));
}