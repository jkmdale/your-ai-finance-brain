// File: supabase/functions/process-csv/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parseDate } from './dateParser.ts';
import { parseCSV } from './csvParser.ts';

// Type definitions for better error handling
interface SkippedRow {
  rowNumber: number;
  error: string;
  rawDate?: string;
  delimiter?: string;
  headers?: string;
  rowData?: any[];
}

interface Transaction {
  user_id: string;
  account_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  is_income: boolean;
  category_id: null;
  merchant: string | null;
  imported_from: string;
  external_id: string;
  created_at: string;
  updated_at: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Main CSV processing endpoint
 * Handles file upload, parsing, and transaction creation with enhanced error handling
 * Returns user-friendly error messages and detailed processing summaries
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        },
      }
    );

    // Get user from session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user?.id) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'User not authenticated', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    const { csvData, fileName } = requestBody;

    if (!csvData || typeof csvData !== 'string') {
      console.error('❌ Invalid CSV data:', { 
        hasCsvData: !!csvData, 
        type: typeof csvData, 
        length: csvData?.length 
      });
      return new Response(
        JSON.stringify({ error: 'No CSV data provided or invalid format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚀 Processing CSV for user ${user.id}: ${fileName} (${csvData.length} chars)`);
    console.log('📊 CSV preview (first 200 chars):', csvData.substring(0, 200));

    // ✅ ENHANCEMENT 1: Use enhanced CSV parser with auto-delimiter detection
    let parsedCSV;
    try {
      parsedCSV = parseCSV(csvData);
      console.log('✅ CSV parsing completed successfully');
      console.log(`📋 Detected delimiter: "${parsedCSV.validation.separator === '\t' ? '\\t' : parsedCSV.validation.separator}"`);
      console.log(`📋 Headers (${parsedCSV.headers.length}):`, parsedCSV.headers);
      console.log(`📊 Data rows: ${parsedCSV.rows.length}`);
    } catch (parseError) {
      console.error('❌ CSV parsing failed:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse CSV file', 
          details: parseError.message,
          delimiter: 'auto-detection failed'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { headers, rows, validation } = parsedCSV;
    const transactions: Transaction[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const skippedRows: SkippedRow[] = [];

    // ✅ ENHANCEMENT 2: Enhanced logging for debugging
    console.log('🔍 CSV Analysis:');
    console.log(`   • Delimiter: "${validation.separator === '\t' ? '\\t (tab)' : validation.separator}"`);
    console.log(`   • Headers: ${headers.join(' | ')}`);
    console.log(`   • Total rows: ${rows.length}`);
    console.log(`   • Header row index: ${validation.headerIndex}`);

    // Detect column indices for NZ banks
    const columnMapping = detectColumnMapping(headers);
    console.log('Detected column mapping:', columnMapping);

    // Ensure user has a default bank account
    let { data: existingAccount, error: accountError } = await supabaseClient
      .from('bank_accounts')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    let accountId = existingAccount?.id;
    
    if (!accountId) {
      // Create a default account for this user
      const { data: newAccount, error: createAccountError } = await supabaseClient
        .from('bank_accounts')
        .insert({
          user_id: user.id,
          account_name: 'Imported Account',
          account_type: 'checking',
          bank_name: detectBankFromFileName(fileName),
          currency: 'NZD',
          balance: 0
        })
        .select('id')
        .single();
      
      if (createAccountError) {
        console.error('Failed to create account:', createAccountError);
        return new Response(
          JSON.stringify({ error: `Failed to create account: ${createAccountError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      accountId = newAccount.id;
      console.log('Created new account:', accountId);
    }

    /**
     * Enhanced row processing with user-friendly error categorization
     * Processes each CSV row and categorizes errors for better user feedback
     */
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      
      try {
        // ✅ ENHANCEMENT 4: Trim and clean all field values
        const cleanedRow = row.map(value => {
          if (typeof value === 'string') {
            return value.replace(/[\u200B\u200C\u200D\uFEFF]/g, '').trim(); // Remove zero-width characters
          }
          return value;
        });

        if (cleanedRow.length >= 3) {
          // ✅ ENHANCEMENT 5: Enhanced date parsing with detailed error reporting
          let transactionDate: string;
          let dateWarning: string | undefined;
          
          const dateValue = getColumnValue(cleanedRow, headers, columnMapping.date);
          
          try {
            console.log(`🗓️ Row ${rowNumber}: Processing date "${dateValue}"`);
            const dateResult = parseDate(dateValue, rowNumber);
            transactionDate = dateResult.date;
            if (dateResult.warning) {
              dateWarning = dateResult.warning;
              warnings.push(dateResult.warning);
            }
          } catch (dateError) {
            console.error(`❌ Row ${rowNumber}: Date parsing failed for "${dateValue}":`, dateError);
            
            // ✅ ENHANCEMENT 6: User-friendly error categorization for skipped rows
            let userFriendlyError = 'Invalid date format';
            if (!dateValue || dateValue.trim() === '') {
              userFriendlyError = 'Missing date - this is normal for some CSV formats';
            } else {
              userFriendlyError = `Invalid date format "${dateValue}" - expected DD/MM/YYYY format`;
            }
            
            skippedRows.push({
              rowNumber,
              error: userFriendlyError,
              rawDate: dateValue,
              delimiter: validation.separator === '\t' ? '\\t' : validation.separator,
              headers: headers.join(' | '),
              rowData: cleanedRow.slice(0, 5) // First 5 fields for debugging
            });
            
            continue; // Skip this row but don't treat as critical error
          }
          
          // ✅ ENHANCEMENT 7: Enhanced amount parsing with user-friendly error handling
          const amountValue = getColumnValue(cleanedRow, headers, columnMapping.amount);
          const cleanedAmount = amountValue.replace(/[$,\s]/g, '');
          const amount = parseFloat(cleanedAmount) || 0;
          
          // Handle missing amounts more gracefully
          if (!amountValue || amountValue.trim() === '') {
            const friendlyError = 'Missing amount - this is normal for some CSV formats';
            const warningMessage = `Row ${rowNumber}: ${friendlyError}`;
            warnings.push(warningMessage);
            
            skippedRows.push({
              rowNumber,
              error: friendlyError,
              delimiter: validation.separator === '\t' ? '\\t' : validation.separator,
              headers: headers.join(' | '),
              rowData: cleanedRow.slice(0, 5)
            });
            continue;
          }
          
          if (amount === 0 && cleanedAmount !== '0') {
            const warningMessage = `Invalid amount format "${amountValue}" - expected numeric value`;
            const fullWarningMessage = `Row ${rowNumber}: ${warningMessage}`;
            warnings.push(fullWarningMessage);
            console.warn(`⚠️ Row ${rowNumber}: ${warningMessage}`);
            
            skippedRows.push({
              rowNumber,
              error: warningMessage,
              delimiter: validation.separator === '\t' ? '\\t' : validation.separator,
              headers: headers.join(' | '),
              rowData: cleanedRow.slice(0, 5)
            });
            continue;
          }

          // Extract description and merchant properly
          const description = getColumnValue(cleanedRow, headers, columnMapping.description);
          const merchant = getColumnValue(cleanedRow, headers, columnMapping.merchant);
          
          // Determine best display text (prioritize merchant over card numbers)
          const displayText = getBestDisplayText(merchant, description);

          // Create transaction with enhanced data
          const transaction: Transaction = {
            user_id: user.id,
            account_id: accountId,
            transaction_date: transactionDate,
            description: displayText.substring(0, 255),
            amount: Math.abs(amount),
            is_income: amount > 0,
            category_id: null, // Will be set by categorization
            merchant: merchant && merchant.trim() ? merchant.trim() : null,
            imported_from: fileName,
            external_id: `${fileName}_${rowNumber}_${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          transactions.push(transaction);
          console.log(`✅ Row ${rowNumber}: Parsed transaction - ${transaction.description} - $${transaction.amount}`);
          
        } else {
          // Handle insufficient columns gracefully
          const friendlyError = 'Missing required data (need at least date, description, and amount)';
          const warningMessage = `Row ${rowNumber}: ${friendlyError}`;
          warnings.push(warningMessage);
          console.warn(`⚠️ Row ${rowNumber}: ${friendlyError}`);
          
          skippedRows.push({
            rowNumber,
            error: friendlyError,
            delimiter: validation.separator === '\t' ? '\\t' : validation.separator,
            headers: headers.join(' | '),
            rowData: cleanedRow
          });
        }
      } catch (rowError) {
        console.error(`❌ Error parsing row ${rowNumber}:`, rowError);
        
        // Provide user-friendly error message instead of technical details
        const friendlyError = 'Row formatting issue - unable to process this row';
        
        skippedRows.push({
          rowNumber,
          error: friendlyError,
          delimiter: validation.separator === '\t' ? '\\t' : validation.separator,
          headers: headers.join(' | '),
          rowData: row
        });
      }
    }

    console.log(`📊 Processing summary: ${transactions.length} transactions parsed, ${errors.length} errors, ${warnings.length} warnings`);

    // Batch insert transactions
    let processedCount = 0;
    let failedCount = 0;
    const insertedTransactions: any[] = [];

    if (transactions.length > 0) {
      // Insert in batches of 100 for optimal performance
      const batchSize = 100;
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        
        const { data: insertedBatch, error: insertError } = await supabaseClient
          .from('transactions')
          .insert(batch)
          .select();

        if (insertError) {
          console.error('❌ Batch insert error:', insertError);
          failedCount += batch.length;
          // Don't expose technical database errors to users
          errors.push(`Unable to save ${batch.length} transactions to database`);
        } else {
          processedCount += insertedBatch?.length || 0;
          if (insertedBatch) {
            insertedTransactions.push(...insertedBatch);
          }
        }
      }
    }

    /**
     * Enhanced response with user-friendly error categorization
     * Provides clear summaries and actionable feedback for users
     */
    const response = {
      success: processedCount > 0,
      processed: processedCount,
      failed: failedCount,
      skipped: skippedRows.length,
      warnings: warnings.filter(w => !w.includes('Row')), // Remove row-specific warnings from global list
      errors: errors.filter(e => e.length > 0), // Only include meaningful errors
      transactions: insertedTransactions.slice(0, 10), // Return first 10 for preview
      totalRows: rows.length,
      fileName,
      // Enhanced debugging information
      csvAnalysis: {
        delimiter: validation.separator === '\t' ? 'tab' : validation.separator,
        headers: headers,
        totalDataRows: rows.length,
        headerRowIndex: validation.headerIndex
      },
      // Enhanced skipped row details with user-friendly categorization
      skippedRowDetails: skippedRows.slice(0, 10).map(row => ({
        rowNumber: row.rowNumber,
        error: row.error,
        category: categorizeSkippedRowError(row.error),
        rawData: row.rawDate || (row.rowData && row.rowData[0]) || 'N/A'
      })),
      // User-friendly summary for display
      userSummary: createUserFriendlySummary(processedCount, skippedRows.length, rows.length)
    };

    console.log('✅ Processing complete:', {
      success: response.success,
      processed: response.processed,
      failed: response.failed,
      skipped: response.skipped,
      delimiter: response.csvAnalysis.delimiter
    });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: 'An unexpected error occurred while processing your file. Please try again.',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Helper function to categorize skipped row errors for user-friendly display
 * @param error - The error message from a skipped row
 * @returns User-friendly category for the error
 */
function categorizeSkippedRowError(error: string): string {
  if (error.includes('Missing date') || error.includes('Missing amount') || error.includes('Missing required')) {
    return 'missing_data';
  } else if (error.includes('Invalid date')) {
    return 'date_format';
  } else if (error.includes('Invalid amount')) {
    return 'amount_format';
  } else {
    return 'formatting';
  }
}

/**
 * Creates a user-friendly summary message for display
 * @param processed - Number of successfully processed transactions
 * @param skipped - Number of skipped rows
 * @param total - Total number of rows
 * @returns User-friendly summary string
 */
function createUserFriendlySummary(processed: number, skipped: number, total: number): string {
  const parts = [];
  
  if (processed > 0) {
    parts.push(`${processed} transactions imported successfully`);
  }
  
  if (skipped > 0) {
    parts.push(`${skipped} rows skipped (missing data)`);
  }
  
  const successRate = total > 0 ? Math.round((processed / total) * 100) : 0;
  
  if (parts.length > 0) {
    return `${parts.join(', ')} • ${successRate}% success rate`;
  } else {
    return 'No valid transactions found in the uploaded file';
  }
}

// Helper functions
function extractMerchant(description: string): string | null {
  if (!description) return null;
  
  // Extract merchant from common patterns
  const cleaned = description.trim();
  
  // Remove common prefixes
  const patterns = [
    /^(EFTPOS|VISA|MASTERCARD|PURCHASE)\s+/i,
    /^(INTERNET BANKING|ONLINE)\s+/i,
  ];
  
  let merchant = cleaned;
  for (const pattern of patterns) {
    merchant = merchant.replace(pattern, '');
  }
  
  return merchant.substring(0, 100) || null;
}

function detectBankFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  
  if (lower.includes('anz')) return 'ANZ';
  if (lower.includes('asb')) return 'ASB';
  if (lower.includes('westpac')) return 'Westpac';
  if (lower.includes('kiwibank')) return 'Kiwibank';
  if (lower.includes('bnz')) return 'BNZ';
  
  return 'Unknown';
}

function detectColumnMapping(headers: string[]): {
  date: number;
  description: number;
  amount: number;
  merchant: number;
} {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Find date column
  const dateIndex = lowerHeaders.findIndex(h => 
    h.includes('date') || h.includes('transaction date') || h.includes('value date')
  );
  
  // Find amount column
  const amountIndex = lowerHeaders.findIndex(h => 
    h.includes('amount') || h.includes('value') || h.includes('debit') || h.includes('credit')
  );
  
  // Find description column (usually second column or contains 'description')
  let descriptionIndex = lowerHeaders.findIndex(h => 
    h.includes('description') || h.includes('details') || h.includes('transaction details')
  );
  if (descriptionIndex === -1 && headers.length > 1) {
    descriptionIndex = 1; // Default to second column
  }
  
  // Find merchant column (prioritize particulars, code, merchant for NZ banks)
  const merchantIndex = lowerHeaders.findIndex(h => 
    h.includes('particulars') || h.includes('code') || h.includes('merchant') || 
    h.includes('other party') || h.includes('payee') || h.includes('narrative')
  );
  
  return {
    date: dateIndex >= 0 ? dateIndex : 0,
    description: descriptionIndex >= 0 ? descriptionIndex : 1,
    amount: amountIndex >= 0 ? amountIndex : 2,
    merchant: merchantIndex >= 0 ? merchantIndex : -1
  };
}

function getColumnValue(values: string[], headers: string[], columnIndex: number): string {
  if (columnIndex >= 0 && columnIndex < values.length) {
    return values[columnIndex] || '';
  }
  return '';
}

function getBestDisplayText(merchant: string, description: string): string {
  // If we have a merchant that's not a card number, use it
  if (merchant && merchant.trim() && !isCardNumber(merchant)) {
    return merchant.trim();
  }
  
  // If description is not a card number, use it
  if (description && description.trim() && !isCardNumber(description)) {
    return description.trim();
  }
  
  // If both are card numbers or empty, prefer merchant, then description
  return (merchant && merchant.trim()) || (description && description.trim()) || 'Unknown Transaction';
}

function isCardNumber(text: string): boolean {
  if (!text) return false;
  
  // Check for card number patterns (e.g., "4835-****-4301 Df", "**** 1234", etc.)
  const cardPatterns = [
    /\d{4}[\s\-\*]*\*{4}[\s\-\*]*\d{4}/,  // 4835-****-4301
    /\*{4}[\s\-]*\d{4}/,                   // **** 1234
    /\d{4}[\s\-]*\*{4}/,                   // 1234 ****
    /\d{4}[\s\-\*]{1,3}\d{4}[\s\-\*]{1,3}\d{4}[\s\-\*]{1,3}\d{4}/, // Full card numbers
  ];
  
  return cardPatterns.some(pattern => pattern.test(text.trim()));
}