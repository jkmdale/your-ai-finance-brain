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

  // Simple CSV processing - this will be enhanced
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',');
  const transactions = [];

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
    const values = lines[i].split(',');
    if (values.length >= 3) {
      const amount = parseFloat(values[2]) || 0;
      transactions.push({
        id: `txn_${Date.now()}_${i}`,
        user_id: user.data.user.id,
        account_id: accountId,
        transaction_date: values[0] || new Date().toISOString().split('T')[0],
        description: values[1] || 'Unknown transaction',
        amount: Math.abs(amount),
        is_income: amount > 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  let processedCount = 0;
  let failedCount = 0;
  const insertedTransactions = [];
  const errors = [];

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