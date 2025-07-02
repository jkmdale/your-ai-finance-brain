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

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length >= 3) {
      transactions.push({
        id: `txn_${Date.now()}_${i}`,
        user_id: user.data.user.id,
        date: values[0] || new Date().toISOString().split('T')[0],
        description: values[1] || 'Unknown transaction',
        amount: parseFloat(values[2]) || 0,
        is_income: parseFloat(values[2]) > 0,
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