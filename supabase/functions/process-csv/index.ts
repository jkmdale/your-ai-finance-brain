// File: supabase/functions/process-csv/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('📊 CSV preview:', csvData.substring(0, 200));

    // Enhanced CSV processing
    const lines = csvData.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return new Response(
        JSON.stringify({ error: 'CSV must have at least header and one data row' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse headers with better CSV handling
    const headers = parseCSVLine(lines[0]);
    const transactions = [];
    const errors = [];
    const warnings = [];
    
    console.log('CSV Headers:', headers);
    console.log('Total data rows:', lines.length - 1);

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

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const values = parseCSVLine(line);
        
        if (values.length >= 3) {
          // Enhanced date parsing
          const transactionDate = parseDate(values[0]) || new Date().toISOString().split('T')[0];
          
          // Enhanced amount parsing
          const amountStr = values[2].replace(/[$,\s]/g, '');
          const amount = parseFloat(amountStr) || 0;
          
          if (amount === 0) {
            warnings.push(`Row ${i}: Amount is 0 or invalid: "${values[2]}"`);
          }

          // Create transaction with enhanced data
          const transaction = {
            user_id: user.id,
            account_id: accountId,
            transaction_date: transactionDate,
            description: (values[1] || `Transaction ${i}`).substring(0, 255),
            amount: Math.abs(amount),
            is_income: amount > 0,
            category_id: null, // Will be set by categorization
            merchant: extractMerchant(values[1] || ''),
            imported_from: fileName,
            external_id: `${fileName}_${i}_${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          transactions.push(transaction);
          console.log(`Row ${i}: Parsed transaction - ${transaction.description} - $${transaction.amount}`);
          
        } else {
          warnings.push(`Row ${i}: Insufficient columns (${values.length}), requires at least 3`);
        }
      } catch (rowError) {
        console.error(`Error parsing row ${i}:`, rowError);
        errors.push(`Row ${i}: ${rowError.message}`);
      }
    }

    console.log(`Parsed ${transactions.length} transactions from ${lines.length - 1} data rows`);

    // Batch insert transactions
    let processedCount = 0;
    let failedCount = 0;
    const insertedTransactions = [];

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
          console.error('Batch insert error:', insertError);
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

    const response = {
      success: processedCount > 0,
      processed: processedCount,
      failed: failedCount,
      skipped: 0,
      warnings,
      errors,
      transactions: insertedTransactions.slice(0, 10), // Return first 10 for preview
      totalRows: lines.length - 1,
      fileName
    };

    console.log('Processing complete:', response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
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
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, ''));
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  const cleanDateStr = String(dateStr).trim();
  if (!cleanDateStr) return null;
  
  // NZ bank date format patterns
  const patterns = [
    // DD/MM/YYYY (most common NZ format)
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy' },
    // DD/MM/YY (2-digit year)
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy2' },
    // YYYY-MM-DD (ISO format)
    { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd' },
    // Compact formats: DDMMYYYY, YYYYMMDD
    { regex: /^(\d{2})(\d{2})(\d{4})$/, type: 'dmy_compact' },
    { regex: /^(\d{4})(\d{2})(\d{2})$/, type: 'ymd_compact' }
  ];

  for (const pattern of patterns) {
    const match = cleanDateStr.match(pattern.regex);
    if (match) {
      try {
        let day: number, month: number, year: number;
        
        if (pattern.type === 'ymd' || pattern.type === 'ymd_compact') {
          [, year, month, day] = match.map(Number);
        } else if (pattern.type === 'dmy2') {
          [, day, month, year] = match.map(Number);
          // Convert 2-digit year to 4-digit (assume 50+ = 19xx, otherwise 20xx)
          year = year > 50 ? 1900 + year : 2000 + year;
        } else {
          [, day, month, year] = match.map(Number);
        }
        
        // Validate ranges
        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
          continue;
        }
        
        // Create date object (month is 0-indexed in JS)
        const date = new Date(year, month - 1, day);
        
        // Verify the date is valid (handles leap years, month days, etc.)
        if (date.getFullYear() === year && 
            date.getMonth() === month - 1 && 
            date.getDate() === day) {
          return date.toISOString().split('T')[0];
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return null;
}

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