
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ProcessingResult } from './types.ts'
import { parseDate } from './dateParser.ts'
import { parseAmount } from './amountParser.ts'
import { parseCSV } from './csvParser.ts'
import { findColumnIndex } from './columnMapper.ts'
import { categorizeTransaction } from './categorizer.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    console.log(`📋 Headers: ${headers.join(', ')}`);
    
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
      'dated', 'transaction_date', 'posting_date', 'dt', 'timestamp', 'when',
      'processdate', 'settledate', 'bookingdate'
    ]);
    
    const descResult = findColumnIndex(headers, [
      'description', 'details', 'particulars', 'transactiondetails', 'memo', 
      'reference', 'narrative', 'desc', 'payee', 'merchant', 'vendor',
      'transaction', 'detail', 'narration', 'purpose', 'comment', 'note',
      'transactiondescription', 'transactiondetail'
    ]);
    
    const amountResult = findColumnIndex(headers, [
      'amount', 'value', 'debit', 'credit', 'transactionamount', 'sum', 'total',
      'amt', 'balance', 'money', 'cash', 'payment', 'withdrawal', 'deposit',
      'transactionvalue', 'netamount', 'grossamount'
    ]);

    console.log('🔍 Enhanced column detection results:');
    console.log(`  📅 Date: ${dateResult.index >= 0 ? `column ${dateResult.index} (${Math.round(dateResult.confidence * 100)}%) - "${dateResult.matchedName}"` : 'NOT FOUND'}`);
    console.log(`  📝 Description: ${descResult.index >= 0 ? `column ${descResult.index} (${Math.round(descResult.confidence * 100)}%) - "${descResult.matchedName}"` : 'NOT FOUND'}`);
    console.log(`  💰 Amount: ${amountResult.index >= 0 ? `column ${amountResult.index} (${Math.round(amountResult.confidence * 100)}%) - "${amountResult.matchedName}"` : 'NOT FOUND'}`);

    // More lenient column requirements - only need 1 column to proceed
    const foundColumns = [dateResult, descResult, amountResult].filter(col => col.index >= 0 && col.confidence > 0.2);
    if (foundColumns.length < 1) {
      const availableColumns = headers.join(', ');
      result.errors.push(`No recognizable columns found. Available columns: ${availableColumns}`);
      result.fileValidation!.reason = `Could not identify any required columns (date, description, or amount) from available columns`;
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
      const { data: newAccount, error: accountError } = await supabaseClient
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
      
      if (accountError) {
        console.error('❌ Failed to create bank account:', accountError);
        result.errors.push(`Failed to create bank account: ${accountError.message}`);
        return new Response(JSON.stringify(result), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      accountId = newAccount?.id;
    } else {
      accountId = accounts[0].id;
    }

    if (!accountId) {
      result.errors.push('Could not create or find bank account');
      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

        // More flexible validation - allow rows with at least some data
        const hasUsefulData = rawDate || description || rawAmount;
        if (!hasUsefulData) {
          console.log(`⏭️ Row ${rowNumber}: No useful data, skipping`);
          skippedDetails.push({ 
            row: rowNumber, 
            reason: 'No useful data found', 
            data: row.slice(0, 3),
            suggestion: 'Ensure row contains date, description, or amount data'
          });
          result.skipped++;
          continue;
        }

        // Parse with detailed error tracking
        const { date, warning: dateWarning } = parseDate(rawDate || new Date().toISOString().split('T')[0], rowNumber);
        const { amount, warning: amountWarning } = parseAmount(rawAmount || '0', rowNumber);
        
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
        
        // If still no meaningful description, use first non-empty cell
        if (finalDescription === `Transaction ${rowNumber}`) {
          const firstData = row.find(cell => cell?.trim());
          if (firstData) {
            finalDescription = `${firstData.trim().substring(0, 50)}`;
          }
        }

        // Enhanced categorization
        const { category, isIncome } = categorizeTransaction(finalDescription, amount);
        const categoryId = categoryMap.get(`${category}_${isIncome}`);
        
        if (!categoryId) {
          console.log(`⚠️ Row ${rowNumber}: No category mapping found for "${category}" (isIncome: ${isIncome}), will use default`);
        }
        
        const transactionData = {
          user_id: user.id,
          account_id: accountId,
          category_id: categoryId || null, // Allow null category
          amount: Math.abs(amount),
          description: finalDescription.substring(0, 200), // Ensure it fits in database
          merchant: finalDescription.split(' ')[0] || null,
          transaction_date: date,
          is_income: amount > 0 ? isIncome : false, // Use amount sign as fallback
          imported_from: 'csv'
        };
        
        processedTransactions.push(transactionData);
        console.log(`✅ Row ${rowNumber}: Prepared for upload - ${transactionData.is_income ? '+' : '-'}$${Math.abs(amount)} - ${category} - "${finalDescription.substring(0, 30)}"`);
        
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
    const batchSize = 25; // Smaller batches for better error handling
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
          batchResult.errors.push(`Batch insert failed: ${error.message} - ${error.details || ''}`);
          
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
                batchResult.errors.push(`Transaction ${i + j + 1}: ${singleError.message} - Details: ${JSON.stringify(transaction).substring(0, 100)}`);
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
