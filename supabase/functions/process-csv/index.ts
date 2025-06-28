
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

interface ProcessingResult {
  success: boolean;
  processed: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  transactions: any[];
  accountBalance: number;
  fileValidation?: {
    isValid: boolean;
    reason?: string;
    rowDetails?: Array<{ row: number; reason: string; data?: string[] }>;
  };
}

const parseDate = (dateString: string): { date: string; warning?: string } => {
  if (!dateString?.trim()) {
    return { date: new Date().toISOString().split('T')[0], warning: 'Empty date, used today' };
  }
  
  const cleanDate = dateString.trim();
  
  // Enhanced date patterns - support multiple formats
  const patterns = [
    // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy', name: 'DD/MM/YYYY' },
    // MM/DD/YYYY (US format)
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'mdy', name: 'MM/DD/YYYY' },
    // YYYY-MM-DD, YYYY/MM/DD
    { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd', name: 'YYYY-MM-DD' },
    // DD/MM/YY
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy', name: 'DD/MM/YY' },
    // Compact formats
    { regex: /^(\d{2})(\d{2})(\d{4})$/, type: 'dmy', name: 'DDMMYYYY' },
    { regex: /^(\d{4})(\d{2})(\d{2})$/, type: 'ymd', name: 'YYYYMMDD' }
  ];

  for (const pattern of patterns) {
    const match = cleanDate.match(pattern.regex);
    if (match) {
      try {
        let day: string, month: string, year: string;
        
        if (pattern.type === 'ymd') {
          [, year, month, day] = match;
        } else if (pattern.type === 'mdy') {
          [, month, day, year] = match;
          // Handle ambiguous dates - if day > 12, assume DD/MM
          if (parseInt(day) > 12 && parseInt(month) <= 12) {
            [day, month] = [month, day];
          }
        } else {
          [, day, month, year] = match;
          if (year.length === 2) {
            year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
          }
        }
        
        // Validate ranges
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        
        if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
          continue;
        }
        
        const dateObj = new Date(yearNum, monthNum - 1, dayNum);
        if (dateObj.getFullYear() === yearNum && 
            dateObj.getMonth() === monthNum - 1 && 
            dateObj.getDate() === dayNum) {
          return { date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` };
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  // JavaScript fallback
  try {
    const jsDate = new Date(cleanDate);
    if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() > 1900) {
      return { 
        date: jsDate.toISOString().split('T')[0],
        warning: `Used fallback parsing for date: ${cleanDate}`
      };
    }
  } catch (error) {
    // Continue to default
  }
  
  return { 
    date: new Date().toISOString().split('T')[0],
    warning: `Could not parse date "${cleanDate}", used today`
  };
};

const parseAmount = (amountString: string): { amount: number; warning?: string } => {
  if (!amountString?.trim()) {
    return { amount: 0 };
  }
  
  const original = amountString.trim();
  let cleaned = original.replace(/[£$€¥₹\s]/g, '');
  
  // Handle negative indicators
  const isNegative = /^\(.*\)$/.test(original) || cleaned.startsWith('-') || 
                    original.toUpperCase().includes('DR') || original.toUpperCase().includes('DEBIT');
  cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '').replace(/DR|DEBIT/gi, '');
  
  // Handle decimal separators
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    const commaIndex = cleaned.lastIndexOf(',');
    const afterComma = cleaned.substring(commaIndex + 1);
    if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  const numericValue = parseFloat(cleaned);
  if (isNaN(numericValue)) {
    return { 
      amount: 0, 
      warning: `Could not parse amount "${original}", used 0`
    };
  }
  
  return { amount: isNegative ? -Math.abs(numericValue) : numericValue };
};

const parseCSV = (csvData: string): { headers: string[], rows: string[][], validation: any } => {
  const lines = csvData.trim().split(/\r?\n/);
  
  if (lines.length < 1) {
    throw new Error('CSV file is empty');
  }

  // Auto-detect separator
  const detectSeparator = (sampleLines: string[]): string => {
    const separators = [',', ';', '\t', '|'];
    const scores = separators.map(sep => ({
      separator: sep,
      avgCount: sampleLines.reduce((sum, line) => sum + (line.split(sep).length - 1), 0) / sampleLines.length
    }));
    
    const best = scores.filter(s => s.avgCount >= 1).sort((a, b) => b.avgCount - a.avgCount)[0];
    return best?.separator || ',';
  };

  const nonEmptyLines = lines.filter(line => line.trim());
  const separator = detectSeparator(nonEmptyLines.slice(0, 5));

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
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(cell => cell.replace(/^"|"$/g, ''));
  };

  // Find header row
  let headerIndex = 0;
  let headers: string[] = [];
  
  for (let i = 0; i < Math.min(5, nonEmptyLines.length); i++) {
    const parsedLine = parseCSVLine(nonEmptyLines[i]);
    if (parsedLine.length >= 2 && parsedLine.some(cell => cell.length > 0)) {
      headers = parsedLine;
      headerIndex = i;
      break;
    }
  }

  if (headers.length === 0) {
    throw new Error('No valid header row found');
  }

  // Parse data rows
  const dataLines = nonEmptyLines.slice(headerIndex + 1);
  const rows = dataLines
    .map(line => parseCSVLine(line))
    .filter(row => row.some(cell => cell.trim()))
    .map(row => {
      // Pad row to match header length
      while (row.length < headers.length) {
        row.push('');
      }
      return row;
    });
  
  return { 
    headers, 
    rows, 
    validation: {
      isValid: rows.length > 0,
      totalLines: lines.length,
      dataRows: rows.length,
      separator,
      headerIndex
    }
  };
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
  
  // Expense categories with fallback
  const expenseCategories = [
    { pattern: /rent|mortgage|property|utilities|electricity|gas|water|internet|phone/, category: 'Housing & Utilities' },
    { pattern: /grocery|supermarket|food|fresh|countdown|paknsave|woolworths|coles/, category: 'Groceries' },
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
  
  return { category: 'Uncategorised', isIncome: false };
};

// Enhanced flexible column finder
const findColumnIndex = (headers: string[], possibleNames: string[]): { index: number, confidence: number, matchedName?: string } => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  
  let bestMatch = { index: -1, confidence: 0, matchedName: '' };
  
  headers.forEach((header, index) => {
    const normalizedHeader = normalizedHeaders[index];
    
    for (const name of possibleNames) {
      const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      let confidence = 0;
      
      // Exact match
      if (normalizedHeader === normalizedName) {
        confidence = 1.0;
      }
      // Contains match
      else if (normalizedHeader.includes(normalizedName) || normalizedName.includes(normalizedHeader)) {
        confidence = Math.min(normalizedName.length, normalizedHeader.length) / 
                    Math.max(normalizedName.length, normalizedHeader.length);
      }
      // Word match
      else {
        const words1 = normalizedHeader.split(/\W+/);
        const words2 = normalizedName.split(/\W+/);
        const commonWords = words1.filter(w => words2.includes(w) && w.length > 2);
        if (commonWords.length > 0) {
          confidence = (commonWords.length / Math.max(words1.length, words2.length)) * 0.7;
        }
      }
      
      if (confidence > bestMatch.confidence) {
        bestMatch = { index, confidence, matchedName: header };
      }
    }
  });
  
  return bestMatch;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const result: ProcessingResult = {
    success: false,
    processed: 0,
    skipped: 0,
    errors: [],
    warnings: [],
    transactions: [],
    accountBalance: 0
  };

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      result.errors.push('Authentication required');
      return new Response(JSON.stringify(result), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { csvData, fileName } = await req.json();
    console.log('Processing CSV:', fileName, 'for user:', user.id);

    if (!csvData?.trim()) {
      result.fileValidation = { isValid: false, reason: 'Empty CSV data provided' };
      result.errors.push('Empty CSV file');
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse CSV with enhanced validation
    let parsedCSV;
    try {
      parsedCSV = parseCSV(csvData);
      result.fileValidation = { 
        isValid: true, 
        reason: `Successfully parsed ${parsedCSV.rows.length} rows with ${parsedCSV.headers.length} columns` 
      };
    } catch (parseError: any) {
      result.fileValidation = { isValid: false, reason: parseError.message };
      result.errors.push(`CSV parsing failed: ${parseError.message}`);
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { headers, rows } = parsedCSV;
    console.log(`Parsed ${headers.length} headers, ${rows.length} rows`);
    
    if (rows.length === 0) {
      result.warnings.push('No data rows found in CSV');
      result.fileValidation!.reason = 'No data rows found';
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enhanced flexible column detection
    const dateResult = findColumnIndex(headers, [
      'date', 'transactiondate', 'postingdate', 'valuedate', 'transdate', 
      'dated', 'transaction_date', 'posting_date', 'dt'
    ]);
    
    const descResult = findColumnIndex(headers, [
      'description', 'details', 'particulars', 'transactiondetails', 'memo', 
      'reference', 'narrative', 'desc', 'payee', 'merchant', 'vendor'
    ]);
    
    const amountResult = findColumnIndex(headers, [
      'amount', 'value', 'debit', 'credit', 'transactionamount', 'sum', 'total',
      'amt', 'balance', 'money', 'cash', 'payment'
    ]);

    console.log('Column detection results:');
    console.log(`Date: index ${dateResult.index}, confidence ${dateResult.confidence}`);
    console.log(`Description: index ${descResult.index}, confidence ${descResult.confidence}`);
    console.log(`Amount: index ${amountResult.index}, confidence ${amountResult.confidence}`);

    // Require at least 2 out of 3 key columns with reasonable confidence
    const foundColumns = [dateResult, descResult, amountResult].filter(col => col.index >= 0 && col.confidence > 0.3);
    if (foundColumns.length < 2) {
      const availableColumns = headers.join(', ');
      result.errors.push(`Insufficient key columns found (need 2/3). Available: ${availableColumns}`);
      result.fileValidation!.reason = `Missing required columns. Found ${foundColumns.length}/3 key columns`;
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

    // Get user's categories for mapping
    const { data: categories } = await supabaseClient
      .from('categories')
      .select('id, name, is_income')
      .eq('user_id', user.id);

    const categoryMap = new Map(categories?.map(c => [`${c.name}_${c.is_income}`, c.id]) || []);

    // Process transactions with enhanced fault tolerance
    const processedTransactions = [];
    const skippedDetails: Array<{ row: number; reason: string; data?: string[] }> = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 for header and 0-indexing
      
      try {
        // Extract data with fallbacks
        const rawDate = dateResult.index >= 0 ? row[dateResult.index]?.trim() || '' : '';
        const description = descResult.index >= 0 ? row[descResult.index]?.trim() || '' : `Transaction ${rowNumber}`;
        const rawAmount = amountResult.index >= 0 ? row[amountResult.index]?.trim() || '' : '';

        // Skip only completely empty rows
        if (!rawDate && !description && !rawAmount) {
          skippedDetails.push({ row: rowNumber, reason: 'All key fields empty', data: row.slice(0, 3) });
          result.skipped++;
          continue;
        }

        // Parse with warnings
        const { date, warning: dateWarning } = parseDate(rawDate);
        const { amount, warning: amountWarning } = parseAmount(rawAmount);
        
        if (dateWarning) result.warnings.push(`Row ${rowNumber}: ${dateWarning}`);
        if (amountWarning) result.warnings.push(`Row ${rowNumber}: ${amountWarning}`);

        // Use fallbacks for missing data
        const finalDescription = description || `Transaction ${rowNumber}`;
        const { category, isIncome } = categorizeTransaction(finalDescription, amount);
        const categoryId = categoryMap.get(`${category}_${isIncome}`);
        
        const transactionData = {
          user_id: user.id,
          account_id: accountId,
          category_id: categoryId,
          amount: Math.abs(amount),
          description: finalDescription,
          merchant: finalDescription.split(' ')[0] || null,
          transaction_date: date,
          is_income: isIncome,
          imported_from: 'csv'
        };
        
        processedTransactions.push(transactionData);
        result.processed++;
        
      } catch (rowError: any) {
        console.error(`Row ${rowNumber} error:`, rowError);
        skippedDetails.push({ 
          row: rowNumber, 
          reason: `Processing error: ${rowError.message}`,
          data: row.slice(0, 3) 
        });
        result.skipped++;
      }
    }

    // Add row-level details to validation
    if (skippedDetails.length > 0) {
      result.fileValidation!.rowDetails = skippedDetails;
    }

    if (processedTransactions.length === 0) {
      result.warnings.push(`No valid transactions found. ${result.skipped} rows were skipped.`);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert transactions in batches
    const batchSize = 100;
    
    for (let i = 0; i < processedTransactions.length; i += batchSize) {
      const batch = processedTransactions.slice(i, i + batchSize);
      const { data, error } = await supabaseClient
        .from('transactions')
        .insert(batch)
        .select();

      if (error) {
        console.error('Batch insert error:', error);
        result.errors.push(`Database insert failed: ${error.message}`);
        break;
      }
      
      if (data) {
        result.transactions.push(...data);
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

    result.success = true;
    result.accountBalance = newBalance;

    console.log(`Successfully processed ${result.processed} transactions, ${result.skipped} skipped`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('CSV processing error:', error);
    result.errors.push(error.message || 'Unknown processing error');
    
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
