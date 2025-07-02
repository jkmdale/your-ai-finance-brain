/*
  File: src/modules/import/handleCsvUpload.ts
  Description: Handles CSV upload from UI using Supabase edge function for processing
*/

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Please sign in to upload CSV files');
    }

    // Read file content
    const csvContent = await file.text();
    
    // Validate CSV content
    if (!csvContent.trim()) {
      throw new Error('File is empty');
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Get the session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session found');
    }

    console.log(`Processing CSV file: ${file.name} (${file.size} bytes)`);

    // Call the edge function to process CSV
    const { data, error } = await supabase.functions.invoke('process-csv', {
      body: {
        csvData: csvContent,
        fileName: file.name
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(`Processing failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('No response from processing service');
    }

    console.log('Processing response:', data);

    // Handle the response
    if (data.success) {
      result.success = true;
      result.processed = data.processed || 0;
      result.warnings = data.warnings || [];
      
      if (data.errors && data.errors.length > 0) {
        result.warnings.push(...data.errors);
      }

      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('csv-upload-success', { 
        detail: { 
          fileName: file.name, 
          transactions: data.transactions || [],
          processed: data.processed 
        } 
      }));
      
      console.log(`✅ Successfully processed ${result.processed} transactions from ${file.name}`);
    } else {
      result.errors = data.errors || ['Unknown processing error'];
      if (data.processed > 0) {
        result.processed = data.processed;
        result.warnings.push(`Partially processed: ${data.processed} transactions`);
      }
    }

    return result;
  } catch (err: any) {
    console.error(`❌ CSV Upload Error for ${file.name}:`, err);
    result.errors.push(err.message || 'Unknown error occurred');
    return result;
  }
}
