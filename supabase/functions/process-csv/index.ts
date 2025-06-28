
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

const parseDate = (dateString: string): string => {
  if (!dateString?.trim()) {
    return new Date().toISOString().split('T')[0];
  }
  
  const cleanDate = dateString.trim();
  
  // Handle various date formats
  const patterns = [
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/,
    /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
    /^(\d{2})(\d{2})(\d{4})$/,
    /^(\d{4})(\d{2})(\d{2})$/
  ];

  for (const pattern of patterns) {
    const match = cleanDate.match(pattern);
    if (match) {
      try {
        let day: string, month: string, year: string;
        
        if (pattern.source.includes('(\\d{4})') && pattern.source.indexOf('(\\d{4})') === 1) {
          [, year, month, day] = match;
        } else {
          [, day, month, year] = match;
          if (year.length === 2) {
            year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
          }
        }
        
        const dateObj = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().split('T')[0];
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  try {
    const jsDate = new Date(cleanDate);
    if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() > 1900) {
      return jsDate.toISOString().split('T')[0];
    }
  } catch (error) {
    // Fallback to today
  }
  
  return new Date().toISOString().split('T')[0];
};

const parseAmount = (amountString: string): number => {
  if (!amountString?.trim()) return 0;
  
  let cleaned = amountString.replace(/[£$€¥₹,\s]/g, '').trim();
  const isNegative = /^\(.*\)$/.test(amountString) || cleaned.startsWith('-');
  cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '');
  
  const numericValue = parseFloat(cleaned);
  return isNaN(numericValue) ? 0 : (isNegative ? -Math.abs(numericValue) : numericValue);
};

const parseCSV = (csvData: string): { headers: string[], rows: string[][] } => {
  const lines = csvData.trim().split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV must have header and at least one data row');
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(cell => cell.replace(/^"|"$/g, ''));
  };

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => parseCSVLine(line)).filter(row => row.some(cell => cell.trim()));
  
  return { headers, rows };
};

const categorizeTransaction = (description: string, amount: number): { category: string, isIncome: boolean } => {
  const desc = description.toLowerCase();
  
  // Income patterns
  if (amount > 0) {
    if (/salary|wage|payroll|pay|employment/.test(desc)) return { category: 'Salary', isIncome: true };
    if (/dividend|interest|investment/.test(desc)) return { category: 'Investment Income', isIncome: true };
    if (/refund|reimbursement|cashback/.test(desc)) return { category: 'Refunds', isIncome: true };
    return { category: 'Other Income', isIncome: true };
  }
  
  // Expense categories
  const expenseCategories = [
    { pattern: /rent|mortgage|property|utilities|electricity|gas|water|internet|phone/, category: 'Housing & Utilities' },
    { pattern: /countdown|paknsave|newworld|woolworths|coles|grocery|supermarket|food/, category: 'Groceries' },
    { pattern: /uber|taxi|bus|train|fuel|petrol|parking|transport/, category: 'Transportation' },
    { pattern: /restaurant|cafe|takeaway|delivery|dining|mcdonald|kfc|starbucks/, category: 'Dining Out' },
    { pattern: /netflix|spotify|subscription|entertainment|movie|cinema|games/, category: 'Entertainment' },
    { pattern: /doctor|hospital|pharmacy|medical|health|dental/, category: 'Healthcare' },
    { pattern: /amazon|shopping|retail|clothing|electronics|warehouse/, category: 'Shopping' },
    { pattern: /insurance|life|car|health|home/, category: 'Insurance' },
    { pattern: /transfer|payment|loan|credit|atm|withdrawal/, category: 'Transfers' }
  ];
  
  for (const { pattern, category } of expenseCategories) {
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

    const { csvData, fileName } = await req.json();
    console.log('Processing CSV:', fileName, 'for user:', user.id);

    if (!csvData?.trim()) {
      throw new Error('Empty CSV data provided');
    }

    // Parse CSV with better error handling
    const { headers, rows } = parseCSV(csvData);
    console.log(`Parsed ${headers.length} headers, ${rows.length} rows`);
    
    if (rows.length === 0) {
      throw new Error('No data rows found in CSV');
    }

    // Find column indices with flexible matching
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    const findColumnIndex = (possibleNames: string[]): number => {
      for (const name of possibleNames) {
        const index = normalizedHeaders.findIndex(h => 
          h.includes(name.toLowerCase()) || h === name.toLowerCase()
        );
        if (index >= 0) return index;
      }
      return -1;
    };

    const dateIndex = findColumnIndex(['date', 'transaction date', 'posting date', 'value date']);
    const descIndex = findColumnIndex(['description', 'details', 'particulars', 'memo', 'reference']);
    const amountIndex = findColumnIndex(['amount', 'value', 'debit', 'credit', 'balance']);

    if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
      const missing = [];
      if (dateIndex === -1) missing.push('date');
      if (descIndex === -1) missing.push('description');
      if (amountIndex === -1) missing.push('amount');
      
      throw new Error(`Required columns not found: ${missing.join(', ')}. Available: ${headers.join(', ')}`);
    }

    // Get or create bank account
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

    // Process transactions with better error handling
    const processedTransactions = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        if (row.length <= Math.max(dateIndex, descIndex, amountIndex)) {
          console.warn(`Row ${i + 2}: Insufficient columns`);
          errorCount++;
          continue;
        }

        const rawDate = row[dateIndex]?.trim();
        const description = row[descIndex]?.trim();
        const rawAmount = row[amountIndex]?.trim();

        if (!rawDate || !description || !rawAmount) {
          console.warn(`Row ${i + 2}: Missing required data`);
          errorCount++;
          continue;
        }

        const date = parseDate(rawDate);
        const amount = parseAmount(rawAmount);
        
        if (amount === 0 && rawAmount !== '0' && rawAmount !== '0.00') {
          console.warn(`Row ${i + 2}: Could not parse amount "${rawAmount}"`);
        }

        const { category, isIncome } = categorizeTransaction(description, amount);
        const categoryId = categoryMap.get(`${category}_${isIncome}`);
        
        const transactionData = {
          user_id: user.id,
          account_id: accountId,
          category_id: categoryId,
          amount: Math.abs(amount),
          description,
          merchant: description.split(' ')[0] || null,
          transaction_date: date,
          is_income: isIncome,
          imported_from: 'csv'
        };
        
        processedTransactions.push(transactionData);
        successCount++;
      } catch (rowError: any) {
        console.error(`Row ${i + 2} error:`, rowError);
        errorCount++;
      }
    }

    if (processedTransactions.length === 0) {
      throw new Error(`No valid transactions found. ${errorCount} rows had errors.`);
    }

    // Insert transactions in batches
    const batchSize = 100;
    const insertedTransactions = [];
    
    for (let i = 0; i < processedTransactions.length; i += batchSize) {
      const batch = processedTransactions.slice(i, i + batchSize);
      const { data, error } = await supabaseClient
        .from('transactions')
        .insert(batch)
        .select();

      if (error) {
        console.error('Batch insert error:', error);
        throw new Error(`Failed to insert transactions: ${error.message}`);
      }
      
      if (data) {
        insertedTransactions.push(...data);
      }
    }

    // Update account balance
    const totalAmount = processedTransactions.reduce((sum, t) => 
      sum + (t.is_income ? t.amount : -t.amount), 0
    );

    const { data: currentAccount } = await supabaseClient
      .from('bank_accounts')
      .select('balance')
      .eq('id', accountId)
      .single();

    const newBalance = (currentAccount?.balance || 0) + totalAmount;

    await supabaseClient
      .from('bank_accounts')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    console.log(`Successfully processed ${insertedTransactions.length} transactions, ${errorCount} errors`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: insertedTransactions.length,
      errors: errorCount,
      transactions: insertedTransactions,
      accountBalance: newBalance
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('CSV processing error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process CSV',
      details: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
