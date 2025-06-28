
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
    rowDetails?: Array<{ row: number; reason: string; data?: string[]; suggestion?: string }>;
  };
  detailedResults?: {
    totalParsed: number;
    totalUploaded: number;
    batchResults: Array<{ batchNumber: number; attempted: number; succeeded: number; failed: number; errors: string[] }>;
  };
}

const parseDate = (dateString: string, rowNumber: number): { date: string; warning?: string } => {
  if (!dateString?.trim()) {
    return { date: new Date().toISOString().split('T')[0], warning: `Row ${rowNumber}: Empty date, used today` };
  }
  
  const cleanDate = dateString.trim();
  console.log(`🗓️ Row ${rowNumber}: Parsing date "${cleanDate}"`);
  
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
          const finalDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          console.log(`✅ Row ${rowNumber}: Date parsed as ${pattern.name}: ${finalDate}`);
          return { date: finalDate };
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
      const fallbackDate = jsDate.toISOString().split('T')[0];
      console.log(`⚠️ Row ${rowNumber}: Used fallback parsing: ${fallbackDate}`);
      return { 
        date: fallbackDate,
        warning: `Row ${rowNumber}: Used fallback parsing for date: ${cleanDate}`
      };
    }
  } catch (error) {
    // Continue to default
  }
  
  const todayDate = new Date().toISOString().split('T')[0];
  console.log(`❌ Row ${rowNumber}: Could not parse date "${cleanDate}", using today: ${todayDate}`);
  return { 
    date: todayDate,
    warning: `Row ${rowNumber}: Could not parse date "${cleanDate}", used today`
  };
};

const parseAmount = (amountString: string, rowNumber: number): { amount: number; warning?: string } => {
  if (!amountString?.trim()) {
    return { amount: 0 };
  }
  
  const original = amountString.trim();
  console.log(`💰 Row ${rowNumber}: Parsing amount "${original}"`);
  
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
    console.log(`❌ Row ${rowNumber}: Could not parse amount "${original}", using 0`);
    return { 
      amount: 0, 
      warning: `Row ${rowNumber}: Could not parse amount "${original}", used 0`
    };
  }
  
  const finalAmount = isNegative ? -Math.abs(numericValue) : numericValue;
  console.log(`✅ Row ${rowNumber}: Amount parsed: ${finalAmount}`);
  return { amount: finalAmount };
};

const parseCSV = (csvData: string): { headers: string[], rows: string[][], validation: any } => {
  console.log('📄 Starting comprehensive CSV parsing...');
  
  const lines = csvData.trim().split(/\r?\n/);
  console.log(`📊 Found ${lines.length} total lines`);
  
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
    console.log(`🔍 Detected separator: "${best?.separator === '\t' ? '\\t' : best?.separator || ','}"`);
    return best?.separator || ',';
  };

  const nonEmptyLines = lines.filter(line => line.trim());
  const separator = detectSeparator(nonEmptyLines.slice(0, 5));

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '"';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        if (nextChar === quoteChar) {
          current += quoteChar;
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result.map(cell => {
      if ((cell.startsWith('"') && cell.endsWith('"')) || 
          (cell.startsWith("'") && cell.endsWith("'"))) {
        cell = cell.slice(1, -1);
      }
      return cell.trim();
    });
  };

  // Find header row with enhanced detection
  let headerIndex = -1;
  let headers: string[] = [];
  
  for (let i = 0; i < Math.min(10, nonEmptyLines.length); i++) {
    const parsedLine = parseCSVLine(nonEmptyLines[i]);
    if (parsedLine.length >= 2 && parsedLine.some(cell => cell.length > 0)) {
      const headerTerms = ['date', 'amount', 'description', 'details', 'transaction', 'debit', 'credit', 'balance'];
      const lowerCells = parsedLine.map(c => c.toLowerCase());
      const hasHeaderTerms = lowerCells.some(cell => 
        headerTerms.some(term => cell.includes(term))
      );
      
      if (hasHeaderTerms || i === 0) {
        headers = parsedLine;
        headerIndex = i;
        console.log(`📋 Headers found at row ${i + 1}: ${headers.join(', ')}`);
        break;
      }
    }
  }

  if (headerIndex === -1) {
    // Use first non-empty row as headers
    for (let i = 0; i < Math.min(3, nonEmptyLines.length); i++) {
      const parsedLine = parseCSVLine(nonEmptyLines[i]);
      if (parsedLine.length >= 2) {
        headers = parsedLine;
        headerIndex = i;
        console.log(`📋 Using row ${i + 1} as headers: ${headers.join(', ')}`);
        break;
      }
    }
  }

  if (headerIndex === -1) {
    throw new Error('No valid header row found in first 10 lines');
  }

  // Parse ALL data rows - this is crucial
  const dataLines = nonEmptyLines.slice(headerIndex + 1);
  console.log(`📊 Processing ${dataLines.length} data lines...`);
  
  const rows = [];
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line.trim()) continue;
    
    const parsedRow = parseCSVLine(line);
    
    // Skip only completely empty rows
    if (parsedRow.length === 0 || parsedRow.every(cell => !cell.trim())) {
      console.log(`⏭️ Skipping empty row ${headerIndex + i + 2}`);
      continue;
    }
    
    // Pad row to match header length
    while (parsedRow.length < headers.length) {
      parsedRow.push('');
    }
    
    rows.push(parsedRow);
    console.log(`✅ Row ${headerIndex + i + 2}: ${parsedRow.slice(0, 3).join(' | ')}`);
  }
  
  console.log(`✅ Successfully parsed ${rows.length} data rows from ${dataLines.length} lines`);
  
  return { 
    headers, 
    rows, 
    validation: {
      isValid: rows.length > 0,
      totalLines: lines.length,
      dataRows: rows.length,
      separator,
      headerIndex: headerIndex + 1
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
  
  // Expense categories with enhanced patterns
  const expenseCategories = [
    { pattern: /rent|mortgage|property|utilities|electricity|gas|water|internet|phone/, category: 'Housing & Utilities' },
    { pattern: /grocery|supermarket|food|fresh|countdown|paknsave|woolworths|coles|tesco|sainsbury/, category: 'Groceries' },
    { pattern: /uber|taxi|bus|train|fuel|petrol|parking|transport|shell|bp|mobil/, category: 'Transportation' },
    { pattern: /restaurant|cafe|takeaway|delivery|dining|mcdonald|kfc|starbucks|subway/, category: 'Dining Out' },
    { pattern: /netflix|spotify|subscription|entertainment|movie|cinema|games|amazon prime/, category: 'Entertainment' },
    { pattern: /doctor|hospital|pharmacy|medical|health|dental|chemist/, category: 'Healthcare' },
    { pattern: /amazon|shopping|retail|clothing|electronics|warehouse|target|walmart/, category: 'Shopping' },
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

// Enhanced flexible column finder with better scoring
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
                    Math.max(normalizedName.length, normalizedHeader.length) * 0.9;
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
    console.log('🚀 Processing CSV:', fileName, 'for user:', user.id);

    if (!csvData?.trim()) {
      result.fileValidation = { isValid: false, reason: 'Empty CSV data provided' };
      result.errors.push('Empty CSV file');
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse CSV with comprehensive validation
    let parsedCSV;
    try {
      parsedCSV = parseCSV(csvData);
      result.fileValidation = { 
        isValid: true, 
        reason: `Successfully parsed ${parsedCSV.rows.length} rows with ${parsedCSV.headers.length} columns using separator '${parsedCSV.validation.separator}'` 
      };
    } catch (parseError: any) {
      console.error('❌ CSV parsing failed:', parseError);
      result.fileValidation = { isValid: false, reason: parseError.message };
      result.errors.push(`CSV parsing failed: ${parseError.message}`);
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { headers, rows } = parsedCSV;
    console.log(`📊 Successfully parsed: ${headers.length} headers, ${rows.length} rows`);
    
    if (rows.length === 0) {
      result.warnings.push('No data rows found in CSV');
      result.fileValidation!.reason = 'No data rows found';
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enhanced flexible column detection with expanded search terms
    const dateResult = findColumnIndex(headers, [
      'date', 'transactiondate', 'postingdate', 'valuedate', 'transdate', 
      'dated', 'transaction_date', 'posting_date', 'dt', 'timestamp', 'when'
    ]);
    
    const descResult = findColumnIndex(headers, [
      'description', 'details', 'particulars', 'transactiondetails', 'memo', 
      'reference', 'narrative', 'desc', 'payee', 'merchant', 'vendor',
      'transaction', 'detail', 'narration', 'purpose'
    ]);
    
    const amountResult = findColumnIndex(headers, [
      'amount', 'value', 'debit', 'credit', 'transactionamount', 'sum', 'total',
      'amt', 'balance', 'money', 'cash', 'payment', 'withdrawal', 'deposit'
    ]);

    console.log('🔍 Enhanced column detection results:');
    console.log(`  📅 Date: ${dateResult.index >= 0 ? `column ${dateResult.index} (${Math.round(dateResult.confidence * 100)}%) - "${dateResult.matchedName}"` : 'NOT FOUND'}`);
    console.log(`  📝 Description: ${descResult.index >= 0 ? `column ${descResult.index} (${Math.round(descResult.confidence * 100)}%) - "${descResult.matchedName}"` : 'NOT FOUND'}`);
    console.log(`  💰 Amount: ${amountResult.index >= 0 ? `column ${amountResult.index} (${Math.round(amountResult.confidence * 100)}%) - "${amountResult.matchedName}"` : 'NOT FOUND'}`);

    // Require at least 2 out of 3 key columns with reasonable confidence
    const foundColumns = [dateResult, descResult, amountResult].filter(col => col.index >= 0 && col.confidence > 0.3);
    if (foundColumns.length < 2) {
      const availableColumns = headers.join(', ');
      result.errors.push(`Insufficient key columns found (need 2/3 with >30% confidence). Found ${foundColumns.length}/3. Available columns: ${availableColumns}`);
      result.fileValidation!.reason = `Missing required columns. Found ${foundColumns.length}/3 key columns with sufficient confidence`;
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
      console.log('🏦 Creating new bank account for user');
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
    console.log(`📂 Loaded ${categories?.length || 0} user categories`);

    // Process ALL transactions with comprehensive error handling
    const processedTransactions = [];
    const skippedDetails: Array<{ row: number; reason: string; data?: string[]; suggestion?: string }> = [];
    let totalParsed = 0;
    
    console.log(`🔄 Processing ALL ${rows.length} rows with detailed logging...`);
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + parsedCSV.validation.headerIndex + 1;
      totalParsed++;
      
      try {
        // Extract data with enhanced fallbacks
        const rawDate = dateResult.index >= 0 ? row[dateResult.index]?.trim() || '' : '';
        const description = descResult.index >= 0 ? row[descResult.index]?.trim() || '' : '';
        const rawAmount = amountResult.index >= 0 ? row[amountResult.index]?.trim() || '' : '';

        console.log(`📋 Row ${rowNumber}: Processing - Date:"${rawDate}" | Desc:"${description}" | Amount:"${rawAmount}"`);

        // Enhanced validation - only skip truly empty rows
        const hasAnyData = rawDate || description || rawAmount || row.some(cell => cell?.trim());
        if (!hasAnyData) {
          console.log(`⏭️ Row ${rowNumber}: Completely empty, skipping`);
          skippedDetails.push({ 
            row: rowNumber, 
            reason: 'All fields empty', 
            data: row.slice(0, 3),
            suggestion: 'Ensure row contains at least date, description, or amount data'
          });
          result.skipped++;
          continue;
        }

        // Parse with detailed error tracking
        const { date, warning: dateWarning } = parseDate(rawDate, rowNumber);
        const { amount, warning: amountWarning } = parseAmount(rawAmount, rowNumber);
        
        if (dateWarning) {
          result.warnings.push(dateWarning);
          console.log(`⚠️ ${dateWarning}`);
        }
        if (amountWarning) {
          result.warnings.push(amountWarning);
          console.log(`⚠️ ${amountWarning}`);
        }

        // Create description with fallbacks
        let finalDescription = description || `Transaction ${rowNumber}`;
        if (!description && rawAmount) {
          finalDescription = `Transaction of ${rawAmount}`;
        }
        if (!description && rawDate) {
          finalDescription = `Transaction on ${rawDate}`;
        }

        // Enhanced categorization
        const { category, isIncome } = categorizeTransaction(finalDescription, amount);
        const categoryId = categoryMap.get(`${category}_${isIncome}`);
        
        if (!categoryId) {
          console.log(`⚠️ Row ${rowNumber}: No category mapping found for "${category}" (isIncome: ${isIncome})`);
        }
        
        const transactionData = {
          user_id: user.id,
          account_id: accountId,
          category_id: categoryId,
          amount: Math.abs(amount),
          description: finalDescription.substring(0, 200), // Ensure it fits in database
          merchant: finalDescription.split(' ')[0] || null,
          transaction_date: date,
          is_income: isIncome,
          imported_from: 'csv'
        };
        
        processedTransactions.push(transactionData);
        console.log(`✅ Row ${rowNumber}: Prepared for upload - ${isIncome ? '+' : '-'}$${Math.abs(amount)} - ${category}`);
        
      } catch (rowError: any) {
        console.error(`❌ Row ${rowNumber} processing error:`, rowError.message);
        skippedDetails.push({ 
          row: rowNumber, 
          reason: `Processing error: ${rowError.message}`,
          data: row.slice(0, 3),
          suggestion: 'Check data format and ensure fields contain valid values'
        });
        result.skipped++;
      }
    }

    // Add detailed row results to validation
    if (skippedDetails.length > 0) {
      result.fileValidation!.rowDetails = skippedDetails;
    }

    console.log(`📊 Processing complete: ${processedTransactions.length} transactions prepared for upload, ${result.skipped} skipped`);

    if (processedTransactions.length === 0) {
      result.warnings.push(`No valid transactions found. ${result.skipped} rows were skipped.`);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enhanced batch insert with retry logic and detailed error tracking
    const batchSize = 50; // Smaller batches for better error handling
    const batchResults = [];
    let totalUploaded = 0;
    
    console.log(`🔄 Starting batch upload: ${processedTransactions.length} transactions in batches of ${batchSize}`);
    
    for (let i = 0; i < processedTransactions.length; i += batchSize) {
      const batch = processedTransactions.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchResult = {
        batchNumber,
        attempted: batch.length,
        succeeded: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      console.log(`📦 Batch ${batchNumber}: Uploading ${batch.length} transactions (${i + 1}-${i + batch.length})`);
      
      try {
        const { data, error } = await supabaseClient
          .from('transactions')
          .insert(batch)
          .select();

        if (error) {
          console.error(`❌ Batch ${batchNumber} failed:`, error);
          batchResult.failed = batch.length;
          batchResult.errors.push(`Batch insert failed: ${error.message}`);
          
          // Try individual inserts for this batch
          console.log(`🔄 Retrying batch ${batchNumber} with individual inserts...`);
          for (let j = 0; j < batch.length; j++) {
            const transaction = batch[j];
            try {
              const { data: singleData, error: singleError } = await supabaseClient
                .from('transactions')
                .insert([transaction])
                .select();
              
              if (singleError) {
                console.error(`❌ Individual insert failed for transaction ${j + 1}:`, singleError);
                batchResult.errors.push(`Transaction ${i + j + 1}: ${singleError.message}`);
              } else {
                batchResult.succeeded++;
                batchResult.failed--;
                totalUploaded++;
                if (singleData) {
                  result.transactions.push(...singleData);
                }
                console.log(`✅ Individual insert succeeded for transaction ${i + j + 1}`);
              }
            } catch (individualError: any) {
              console.error(`❌ Individual insert exception:`, individualError);
              batchResult.errors.push(`Transaction ${i + j + 1}: ${individualError.message}`);
            }
          }
        } else {
          batchResult.succeeded = batch.length;
          totalUploaded += batch.length;
          if (data) {
            result.transactions.push(...data);
            console.log(`✅ Batch ${batchNumber}: Successfully uploaded ${data.length} transactions`);
          }
        }
      } catch (batchError: any) {
        console.error(`❌ Batch ${batchNumber} exception:`, batchError);
        batchResult.failed = batch.length;
        batchResult.errors.push(`Batch exception: ${batchError.message}`);
      }
      
      batchResults.push(batchResult);
      
      // Add batch errors to main result
      if (batchResult.errors.length > 0) {
        result.errors.push(...batchResult.errors);
      }
    }

    // Add detailed results
    result.detailedResults = {
      totalParsed,
      totalUploaded,
      batchResults
    };

    result.processed = totalUploaded;
    
    console.log(`📊 Upload Summary:`);
    console.log(`  📁 Total parsed: ${totalParsed}`);
    console.log(`  ✅ Successfully uploaded: ${totalUploaded}`);
    console.log(`  ⏭️ Skipped: ${result.skipped}`);
    console.log(`  ❌ Upload errors: ${result.errors.length}`);

    if (totalUploaded > 0) {
      // Update account balance
      const totalAmount = result.transactions.reduce((sum, t) => 
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
      
      console.log(`💰 Updated account balance: ${newBalance} (change: ${totalAmount > 0 ? '+' : ''}${totalAmount})`);
    } else {
      result.warnings.push('No transactions were successfully uploaded despite parsing data');
    }

    console.log(`🎉 Processing complete: ${result.processed} uploaded, ${result.skipped} skipped, ${result.errors.length} errors`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ CSV processing error:', error);
    result.errors.push(error.message || 'Unknown processing error');
    
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
