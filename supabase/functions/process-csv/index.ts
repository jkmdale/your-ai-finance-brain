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

    // ✅ ENHANCEMENT 3: Enhanced row processing with better error handling
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
          
          try {
            const rawDateValue = cleanedRow[0];
            console.log(`🗓️ Row ${rowNumber}: Processing date "${rawDateValue}"`);
            
            const dateResult = parseDate(rawDateValue, rowNumber);
            transactionDate = dateResult.date;
            if (dateResult.warning) {
              dateWarning = dateResult.warning;
              warnings.push(dateResult.warning);
            }
          } catch (dateError) {
            console.error(`❌ Row ${rowNumber}: Date parsing failed for "${cleanedRow[0]}":`, dateError);
            
            // ✅ ENHANCEMENT 6: Enhanced error messages with raw values
            const errorMessage = `Row ${rowNumber}: Invalid date "${cleanedRow[0]}" - ${dateError.message}`;
            errors.push(errorMessage);
            
            skippedRows.push({
              rowNumber,
              error: errorMessage,
              rawDate: cleanedRow[0],
              delimiter: validation.separator === '\t' ? '\\t' : validation.separator,
              headers: headers.join(' | '),
              rowData: cleanedRow.slice(0, 5) // First 5 fields for debugging
            });
            
            continue; // Skip this row
          }
          
          // ✅ ENHANCEMENT 7: Enhanced amount parsing with cleaning
          const rawAmountValue = cleanedRow[2];
          const cleanedAmount = rawAmountValue.replace(/[$,\s]/g, '');
          const amount = parseFloat(cleanedAmount) || 0;
          
          if (amount === 0) {
            const warningMessage = `Row ${rowNumber}: Amount is 0 or invalid: "${rawAmountValue}" (cleaned: "${cleanedAmount}")`;
            warnings.push(warningMessage);
            console.warn(`⚠️ ${warningMessage}`);
          }

          // Create transaction with enhanced data
          const transaction: Transaction = {
            user_id: user.id,
            account_id: accountId,
            transaction_date: transactionDate,
            description: (cleanedRow[1] || `Transaction ${rowNumber}`).substring(0, 255),
            amount: Math.abs(amount),
            is_income: amount > 0,
            category_id: null, // Will be set by categorization
            merchant: extractMerchant(cleanedRow[1] || ''),
            imported_from: fileName,
            external_id: `${fileName}_${rowNumber}_${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          transactions.push(transaction);
          console.log(`✅ Row ${rowNumber}: Parsed transaction - ${transaction.description} - $${transaction.amount}`);
          
        } else {
          const errorMessage = `Row ${rowNumber}: Insufficient columns (${cleanedRow.length}), requires at least 3`;
          warnings.push(errorMessage);
          console.warn(`⚠️ ${errorMessage}`);
          
          skippedRows.push({
            rowNumber,
            error: errorMessage,
            delimiter: validation.separator === '\t' ? '\\t' : validation.separator,
            headers: headers.join(' | '),
            rowData: cleanedRow
          });
        }
      } catch (rowError) {
        console.error(`❌ Error parsing row ${rowNumber}:`, rowError);
        const errorMessage = `Row ${rowNumber}: ${rowError.message}`;
        errors.push(errorMessage);
        
        skippedRows.push({
          rowNumber,
          error: errorMessage,
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
      // Insert in batches of 100
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
          errors.push(`Batch insert failed: ${insertError.message}`);
        } else {
          processedCount += insertedBatch?.length || 0;
          if (insertedBatch) {
            insertedTransactions.push(...insertedBatch);
          }
        }
      }
    }

    // ✅ ENHANCEMENT 8: Enhanced response with detailed debugging info
    const response = {
      success: processedCount > 0,
      processed: processedCount,
      failed: failedCount,
      skipped: skippedRows.length,
      warnings,
      errors,
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
      skippedRowDetails: skippedRows.slice(0, 10) // First 10 skipped rows for debugging
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
        details: error.message,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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