
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Transaction {
  date: string;
  description: string;
  amount: number;
  merchant?: string;
}

const categorizeTransaction = (description: string, amount: number): { category: string, isIncome: boolean } => {
  const desc = description.toLowerCase();
  
  // Income patterns
  const incomePatterns = [
    /salary|wage|payroll|income|pay|deposit/,
    /refund|reimbursement|cashback/,
    /dividend|interest|investment/,
    /freelance|contract|commission/
  ];
  
  // Expense categories
  const categoryPatterns = {
    'Housing': /rent|mortgage|property|utilities|electricity|gas|water|internet|phone/,
    'Transportation': /uber|taxi|bus|train|fuel|gas|parking|car|vehicle|transport/,
    'Food & Dining': /restaurant|cafe|food|grocery|supermarket|dining|takeaway|delivery/,
    'Shopping': /amazon|ebay|store|shop|retail|clothing|electronics/,
    'Entertainment': /netflix|spotify|movie|cinema|game|entertainment|subscription/,
    'Healthcare': /doctor|hospital|pharmacy|medical|health|dental/,
    'Utilities': /electricity|gas|water|internet|phone|utility/,
    'Personal Care': /salon|spa|cosmetics|personal|beauty/
  };
  
  // Check if it's income
  const isIncome = amount > 0 || incomePatterns.some(pattern => pattern.test(desc));
  
  if (isIncome) {
    if (/salary|wage|payroll/.test(desc)) return { category: 'Salary', isIncome: true };
    if (/investment|dividend|interest/.test(desc)) return { category: 'Investment Income', isIncome: true };
    return { category: 'Other Income', isIncome: true };
  }
  
  // Categorize expenses
  for (const [category, pattern] of Object.entries(categoryPatterns)) {
    if (pattern.test(desc)) {
      return { category, isIncome: false };
    }
  }
  
  return { category: 'Other', isIncome: false };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { csvData } = await req.json();
    console.log('Processing CSV data for user:', user.id);

    // Parse CSV data
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    
    const transactions: Transaction[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v: string) => v.trim().replace(/"/g, ''));
      
      const transaction: Transaction = {
        date: values[headers.indexOf('date')] || values[0],
        description: values[headers.indexOf('description')] || values[1],
        amount: parseFloat(values[headers.indexOf('amount')] || values[2]) || 0,
        merchant: values[headers.indexOf('merchant')] || ''
      };
      
      if (transaction.description && !isNaN(transaction.amount)) {
        transactions.push(transaction);
      }
    }

    console.log(`Parsed ${transactions.length} transactions`);

    // Get user's bank account (create default if none exists)
    let { data: accounts } = await supabaseClient
      .from('bank_accounts')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    let accountId;
    if (!accounts || accounts.length === 0) {
      const { data: newAccount } = await supabaseClient
        .from('bank_accounts')
        .insert({
          user_id: user.id,
          bank_name: 'CSV Import',
          account_type: 'checking',
          account_name: 'Main Account',
          currency: 'NZD'
        })
        .select('id')
        .single();
      
      accountId = newAccount?.id;
    } else {
      accountId = accounts[0].id;
    }

    // Get user's categories
    const { data: categories } = await supabaseClient
      .from('categories')
      .select('id, name, is_income')
      .eq('user_id', user.id);

    const categoryMap = new Map(categories?.map(c => [`${c.name}_${c.is_income}`, c.id]) || []);

    // Process transactions
    const processedTransactions = [];
    for (const transaction of transactions) {
      const { category, isIncome } = categorizeTransaction(transaction.description, transaction.amount);
      const categoryId = categoryMap.get(`${category}_${isIncome}`);
      
      const transactionData = {
        user_id: user.id,
        account_id: accountId,
        category_id: categoryId,
        amount: Math.abs(transaction.amount),
        description: transaction.description,
        merchant: transaction.merchant,
        transaction_date: transaction.date,
        is_income: isIncome,
        imported_from: 'csv'
      };
      
      processedTransactions.push(transactionData);
    }

    // Insert transactions
    const { data: insertedTransactions, error: insertError } = await supabaseClient
      .from('transactions')
      .insert(processedTransactions)
      .select();

    if (insertError) {
      console.error('Error inserting transactions:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to insert transactions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update account balance
    const totalAmount = processedTransactions.reduce((sum, t) => 
      sum + (t.is_income ? t.amount : -t.amount), 0
    );

    await supabaseClient
      .from('bank_accounts')
      .update({ 
        balance: totalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    console.log(`Successfully processed ${processedTransactions.length} transactions`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: processedTransactions.length,
      transactions: insertedTransactions 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing CSV:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
