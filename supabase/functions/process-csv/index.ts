// File: supabase/functions/process-csv/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! }
      },
    }
  );

  const { csvData, fileName } = await req.json();
  const user = await supabaseClient.auth.getUser();

  if (!user || !user.data?.user?.id) {
    return new Response(
      JSON.stringify({ error: 'User not authenticated.' }),
      { status: 401 }
    );
  }

  if (!csvData || typeof csvData !== 'string') {
    return new Response(
      JSON.stringify({ error: 'No CSV data provided' }),
      { status: 400 }
    );
  }

  // Enhanced CSV processing with better parsing
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    return new Response(
      JSON.stringify({ error: 'CSV must have at least header and one data row' }),
      { status: 400 }
    );
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const transactions = [];
  const errors = [];
  
  console.log('CSV Headers:', headers);
  console.log('Total data rows:', lines.length - 1);

  // First ensure user has a default bank account
  const { data: existingAccount } = await supabaseClient
    .from('bank_accounts')
    .select('id')
    .eq('user_id', user.data.user.id)
    .limit(1)
    .single();

  let accountId = existingAccount?.id;
  
  if (!accountId) {
    // Create a default account for this user
    const { data: newAccount, error: accountError } = await supabaseClient
      .from('bank_accounts')
      .insert({
        user_id: user.data.user.id,
        account_name: 'Default Account',
        account_type: 'checking',
        bank_name: 'Imported',
        currency: 'NZD',
        balance: 0
      })
      .select('id')
      .single();
    
    if (accountError) {
      return new Response(
        JSON.stringify({ error: `Failed to create account: ${accountError.message}` }),
        { status: 500 }
      );
    }
    
    accountId = newAccount.id;
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    
    if (values.length >= 3) {
      try {
        // Parse date - try common formats
        let transactionDate;
        const dateStr = values[0];
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            transactionDate = date.toISOString().split('T')[0];
          } else {
            // Try DD/MM/YYYY format
            const parts = dateStr.split(/[-\/]/);
            if (parts.length === 3) {
              const [day, month, year] = parts;
              const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              if (!isNaN(parsedDate.getTime())) {
                transactionDate = parsedDate.toISOString().split('T')[0];
              }
            }
          }
        }
        transactionDate = transactionDate || new Date().toISOString().split('T')[0];

        // Parse amount
        const amountStr = values[2].replace(/[$,]/g, '');
        const amount = parseFloat(amountStr) || 0;
        
        if (amount === 0) {
          console.log(`Row ${i}: Amount is 0 or invalid: "${values[2]}"`);
        }

        const transaction = {
          id: `txn_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: user.data.user.id,
          account_id: accountId,
          transaction_date: transactionDate,
          description: (values[1] || `Transaction ${i}`).substring(0, 200),
          amount: Math.abs(amount),
          is_income: amount > 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        transactions.push(transaction);
        console.log(`Row ${i}: Created transaction - ${transaction.description} - $${transaction.amount}`);
        
      } catch (rowError) {
        console.error(`Error parsing row ${i}:`, rowError, 'Row data:', values);
        errors.push(`Row ${i}: ${rowError.message}`);
      }
    } else {
      console.log(`Row ${i}: Insufficient columns (${values.length}), skipping`);
    }
  }

  console.log(`Parsed ${transactions.length} transactions from ${lines.length - 1} data rows`);

  let processedCount = 0;
  let failedCount = 0;
  const insertedTransactions = [];

  for (const txn of transactions) {
    const { error } = await supabaseClient.from('transactions').insert(txn);
    if (error) {
      failedCount++;
      errors.push(`Insert failed for ${txn.id}: ${error.message}`);
    } else {
      insertedTransactions.push(txn);
      processedCount++;
    }
  }

  return new Response(
    JSON.stringify({
      success: processedCount > 0,
      processed: processedCount,
      failed: failedCount,
      skipped: 0,
      warnings: [],
      errors,
      transactions: insertedTransactions
    }),
    { status: 200 }
  );
});