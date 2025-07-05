/**
 * Unified Transaction Processing System
 * Handles CSV upload, parsing, normalization, duplicate detection, and Claude categorization
 * for NZ banks (ANZ, ASB, Westpac, Kiwibank, BNZ)
 */

import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';

// Core transaction interface - unified schema
export interface NormalizedTransaction {
  date: string; // YYYY-MM-DD format
  description: string;
  amount: number; // Always positive, sign determined by is_income
  is_income: boolean;
  merchant?: string;
  category?: string;
  confidence?: number;
  source_bank: string;
  raw_data: any; // Original CSV row for debugging
}

// Claude categorization result
export interface CategorizationResult {
  category: string;
  budgetGroup: 'needs' | 'wants' | 'savings';
  excludeFromBudget: boolean; // For transfers/reversals
  confidence: number;
  reasoning: string;
}

// Bank format definitions
interface BankFormat {
  name: string;
  patterns: {
    filename: RegExp[];
    headers: string[];
  };
  columnMappings: {
    date: string[];
    description: string[];
    amount: string[];
    debit?: string[];
    credit?: string[];
  };
}

export class UnifiedTransactionProcessor {
  private bankFormats: BankFormat[] = [
    {
      name: 'ANZ',
      patterns: {
        filename: [/anz/i],
        headers: ['Date', 'Details', 'Amount']
      },
      columnMappings: {
        date: ['Date', 'Transaction Date'],
        description: ['Details', 'Description', 'Transaction Details'],
        amount: ['Amount'],
        debit: ['Debit'],
        credit: ['Credit']
      }
    },
    {
      name: 'ASB',
      patterns: {
        filename: [/asb/i],  
        headers: ['Date', 'Particulars', 'Amount']
      },
      columnMappings: {
        date: ['Date', 'Transaction Date'],
        description: ['Particulars', 'Description'],
        amount: ['Amount'],
        debit: ['Debit'],
        credit: ['Credit']
      }
    },
    {
      name: 'Westpac',
      patterns: {
        filename: [/westpac/i],
        headers: ['Date', 'Transaction Details', 'Amount']
      },
      columnMappings: {
        date: ['Date', 'Processing Date'],
        description: ['Transaction Details', 'Description'],
        amount: ['Amount'],
        debit: ['Debit Amount'],
        credit: ['Credit Amount']
      }
    },
    {
      name: 'Kiwibank',
      patterns: {
        filename: [/kiwibank/i, /kiwibank/i],
        headers: ['Date', 'Payee', 'Amount']
      },
      columnMappings: {
        date: ['Date', 'Transaction Date'],
        description: ['Payee', 'Description', 'Details'],
        amount: ['Amount'],
        debit: ['Debit'],
        credit: ['Credit']
      }
    },
    {
      name: 'BNZ',
      patterns: {
        filename: [/bnz/i],
        headers: ['Date', 'Description', 'Amount']
      },
      columnMappings: {
        date: ['Date', 'Transaction Date'],
        description: ['Description', 'Details'],
        amount: ['Amount'],
        debit: ['Debit Amount'],
        credit: ['Credit Amount']
      }
    }
  ];

  /**
   * Process multiple CSV files and return normalized transactions
   */
  async processCSVFiles(files: FileList, userId: string): Promise<{
    transactions: NormalizedTransaction[];
    summary: {
      totalFiles: number;
      totalTransactions: number;
      duplicatesSkipped: number;
      errors: string[];
      warnings: string[];
    };
  }> {
    const allTransactions: NormalizedTransaction[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalTransactions = 0;

    console.log(`🏦 Processing ${files.length} CSV files...`);

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📄 Processing file ${i + 1}/${files.length}: ${file.name}`);

      try {
        const fileTransactions = await this.processSingleCSV(file);
        allTransactions.push(...fileTransactions);
        totalTransactions += fileTransactions.length;
      } catch (error: any) {
        console.error(`❌ Error processing ${file.name}:`, error);
        errors.push(`${file.name}: ${error.message}`);
      }
    }

    // Remove duplicates (including existing ones in database)
    const uniqueTransactions = await this.removeDuplicates(allTransactions, userId);
    const duplicatesSkipped = allTransactions.length - uniqueTransactions.length;

    console.log(`✅ Processed ${files.length} files: ${totalTransactions} total, ${duplicatesSkipped} duplicates skipped`);

    return {
      transactions: uniqueTransactions,
      summary: {
        totalFiles: files.length,
        totalTransactions,
        duplicatesSkipped,
        errors,
        warnings
      }
    };
  }

  /**
   * Process a single CSV file
   */
  private async processSingleCSV(file: File): Promise<NormalizedTransaction[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(), // Clean headers
        complete: (results) => {
          try {
            // Detect bank format
            const bankFormat = this.detectBankFormat(file.name, results.meta.fields || []);
            if (!bankFormat) {
              reject(new Error(`Unsupported bank format in ${file.name}. Expected ANZ, ASB, Westpac, Kiwibank, or BNZ format.`));
              return;
            }

            console.log(`🏛️ Detected ${bankFormat.name} format for ${file.name}`);

            // Process rows
            const transactions = this.normalizeTransactions(
              results.data as any[], 
              bankFormat, 
              file.name
            );

            resolve(transactions);
          } catch (error: any) {
            reject(new Error(`Error processing ${file.name}: ${error.message}`));
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error in ${file.name}: ${error.message}`));
        }
      });
    });
  }

  /**
   * Detect bank format from filename and headers
   */
  private detectBankFormat(filename: string, headers: string[]): BankFormat | null {
    const lowerFilename = filename.toLowerCase();
    const lowerHeaders = headers.map(h => h.toLowerCase());

    for (const format of this.bankFormats) {
      // Check filename patterns
      const filenameMatch = format.patterns.filename.some(pattern => pattern.test(lowerFilename));
      
      // Check header patterns
      const requiredHeaders = format.patterns.headers;
      const headerMatch = requiredHeaders.every(reqHeader => 
        lowerHeaders.some(h => h.includes(reqHeader.toLowerCase()))
      );

      if (filenameMatch || headerMatch) {
        return format;
      }
    }

    return null;
  }

  /**
   * Normalize transactions from CSV data using bank format
   */
  private normalizeTransactions(
    csvData: any[], 
    bankFormat: BankFormat, 
    filename: string
  ): NormalizedTransaction[] {
    const transactions: NormalizedTransaction[] = [];

    for (const row of csvData) {
      // Skip completely empty rows
      if (!row || Object.values(row).every(val => !val || val.toString().trim() === '')) {
        continue;
      }

      try {
        const transaction = this.normalizeTransaction(row, bankFormat, filename);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error: any) {
        console.warn(`⚠️ Skipping row in ${filename}:`, error.message, row);
      }
    }

    console.log(`📊 Normalized ${transactions.length} transactions from ${filename}`);
    return transactions;
  }

  /**
   * Normalize a single transaction
   */
  private normalizeTransaction(
    row: any, 
    bankFormat: BankFormat, 
    filename: string
  ): NormalizedTransaction | null {
    // Extract date
    const dateValue = this.findColumnValue(row, bankFormat.columnMappings.date);
    const normalizedDate = this.normalizeDate(dateValue);
    if (!normalizedDate) {
      throw new Error(`Invalid or missing date: ${dateValue}`);
    }

    // Extract description
    const description = this.findColumnValue(row, bankFormat.columnMappings.description);
    if (!description || description.trim() === '') {
      throw new Error('Missing description');
    }

    // Extract amount - handle both single amount column and separate debit/credit
    let amount = 0;
    let isIncome = false;

    if (bankFormat.columnMappings.debit && bankFormat.columnMappings.credit) {
      // Separate debit/credit columns
      const debitValue = this.findColumnValue(row, bankFormat.columnMappings.debit) || '0';
      const creditValue = this.findColumnValue(row, bankFormat.columnMappings.credit) || '0';
      
      const debitAmount = this.parseAmount(debitValue);
      const creditAmount = this.parseAmount(creditValue);

      if (debitAmount > 0 && creditAmount > 0) {
        throw new Error('Both debit and credit have values - ambiguous transaction');
      }

      if (debitAmount > 0) {
        amount = debitAmount;
        isIncome = false;
      } else if (creditAmount > 0) {
        amount = creditAmount;
        isIncome = true;
      } else {
        throw new Error('No amount found in debit or credit columns');
      }
    } else {
      // Single amount column
      const amountValue = this.findColumnValue(row, bankFormat.columnMappings.amount);
      if (!amountValue) {
        throw new Error('Missing amount');
      }

      const parsedAmount = this.parseAmount(amountValue);
      if (parsedAmount === 0) {
        return null; // Skip zero-amount transactions
      }

      amount = Math.abs(parsedAmount);
      isIncome = parsedAmount > 0;
    }

    // Extract merchant from description
    const merchant = this.extractMerchant(description.toString());

    return {
      date: normalizedDate,
      description: description.toString().trim().substring(0, 255), // Limit description length
      amount,
      is_income: isIncome,
      merchant,
      source_bank: bankFormat.name,
      raw_data: row
    };
  }

  /**
   * Find column value by trying multiple possible column names
   */
  private findColumnValue(row: any, possibleColumns: string[]): string | null {
    for (const col of possibleColumns) {
      // Try exact match first
      if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
        return row[col].toString().trim();
      }
      
      // Try case-insensitive match
      const keys = Object.keys(row);
      const matchingKey = keys.find(key => key.toLowerCase().includes(col.toLowerCase()));
      if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null && row[matchingKey] !== '') {
        return row[matchingKey].toString().trim();
      }
    }
    return null;
  }

  /**
   * Normalize date to YYYY-MM-DD format
   */
  private normalizeDate(dateStr: string | null): string | null {
    if (!dateStr) return null;

    // Clean the date string
    const cleaned = dateStr.trim();
    if (!cleaned) return null;

    // Try direct ISO parsing first
    const directDate = new Date(cleaned);
    if (!isNaN(directDate.getTime()) && cleaned.includes('-')) {
      return directDate.toISOString().split('T')[0];
    }

    // Try DD/MM/YYYY format (common in NZ)
    const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Try MM/DD/YYYY format
    const mmddyyyy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mmddyyyy) {
      const [, month, day, year] = mmddyyyy;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Try other formats
    const fallbackDate = new Date(cleaned);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toISOString().split('T')[0];
    }

    console.warn(`⚠️ Could not parse date: ${cleaned}`);
    return null;
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0;

    // Remove currency symbols, commas, and extra spaces
    let cleaned = amountStr.toString().replace(/[$,\s]/g, '');

    // Handle negative amounts in parentheses
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }

    // Handle negative amounts with minus sign
    const isNegative = cleaned.startsWith('-');
    if (isNegative) {
      cleaned = cleaned.substring(1);
    }

    const parsed = parseFloat(cleaned) || 0;
    return isNegative ? -parsed : parsed;
  }

  /**
   * Extract merchant name from description
   */
  private extractMerchant(description: string): string | undefined {
    // Remove common transaction prefixes
    const cleaned = description
      .replace(/^(EFTPOS|VISA|MASTERCARD|PURCHASE|TST\*|SQ \*|AMZN MKTP|PAYPAL \*)\s*/i, '')
      .replace(/\*\w+$/, '') // Remove trailing reference codes
      .replace(/\s+/g, ' ')
      .trim();

    // Extract meaningful merchant name (first 50 chars)
    const merchant = cleaned.substring(0, 50).trim();
    return merchant.length > 0 ? merchant : undefined;
  }

  /**
   * Remove duplicates including existing ones in database
   */
  private async removeDuplicates(
    transactions: NormalizedTransaction[], 
    userId: string
  ): Promise<NormalizedTransaction[]> {
    console.log(`🔍 Checking for duplicates among ${transactions.length} transactions...`);

    // Get existing transactions from database for the date range
    const dates = transactions.map(t => t.date);
    const minDate = Math.min(...dates.map(d => new Date(d).getTime()));
    const maxDate = Math.max(...dates.map(d => new Date(d).getTime()));

    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('transaction_date, description, amount')
      .eq('user_id', userId)
      .gte('transaction_date', new Date(minDate).toISOString().split('T')[0])
      .lte('transaction_date', new Date(maxDate).toISOString().split('T')[0]);

    // Create a set of existing transaction signatures
    const existingSignatures = new Set(
      (existingTransactions || []).map(t => 
        `${t.transaction_date}|${t.description}|${Math.abs(t.amount)}`
      )
    );

    // Filter out duplicates
    const uniqueTransactions: NormalizedTransaction[] = [];
    const seenSignatures = new Set<string>();

    for (const transaction of transactions) {
      const signature = `${transaction.date}|${transaction.description}|${transaction.amount}`;
      
      if (existingSignatures.has(signature) || seenSignatures.has(signature)) {
        console.log(`🔄 Skipping duplicate: ${transaction.description} - $${transaction.amount}`);
        continue;
      }

      seenSignatures.add(signature);
      uniqueTransactions.push(transaction);
    }

    console.log(`✅ Filtered ${transactions.length} -> ${uniqueTransactions.length} unique transactions`);
    return uniqueTransactions;
  }

  /**
   * Categorize transactions using Claude AI in batches
   */
  async categorizeWithClaude(
    transactions: NormalizedTransaction[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<(NormalizedTransaction & CategorizationResult)[]> {
    if (transactions.length === 0) return [];

    console.log(`🧠 Starting Claude categorization for ${transactions.length} transactions...`);

    const categorizedTransactions: (NormalizedTransaction & CategorizationResult)[] = [];
    const batchSize = 20; // Process in batches of 20

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transactions.length / batchSize)}`);

      try {
        const batchResults = await this.categorizeBatch(batch);
        categorizedTransactions.push(...batchResults);
        
        if (onProgress) {
          onProgress(Math.min(i + batchSize, transactions.length), transactions.length);
        }
      } catch (error: any) {
        console.error(`❌ Error categorizing batch ${Math.floor(i / batchSize) + 1}:`, error);
        
        // Add transactions with fallback categorization
        const fallbackResults = batch.map(tx => ({
          ...tx,
          category: 'Uncategorized',
          budgetGroup: 'wants' as const,
          excludeFromBudget: false,
          confidence: 0.3,
          reasoning: 'Fallback categorization due to AI error'
        }));
        
        categorizedTransactions.push(...fallbackResults);
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Claude categorization complete: ${categorizedTransactions.length} transactions categorized`);
    return categorizedTransactions;
  }

  /**
   * Categorize a batch of transactions using Claude
   */
  private async categorizeBatch(
    batch: NormalizedTransaction[]
  ): Promise<(NormalizedTransaction & CategorizationResult)[]> {
    const prompt = `Categorize these financial transactions into appropriate categories and budget groups.

For each transaction, determine:
1. category: Specific category (e.g., "Groceries", "Rent", "Salary", "Entertainment") 
2. budgetGroup: "needs" (essentials), "wants" (discretionary), or "savings" (investments/savings)
3. excludeFromBudget: true if this is a transfer/reversal that shouldn't count in budget (false otherwise)
4. confidence: 0.0-1.0 confidence score
5. reasoning: Brief explanation

Transactions to categorize:
${batch.map((tx, i) => `${i + 1}. $${tx.amount} - "${tx.description}" ${tx.merchant ? `(${tx.merchant})` : ''}`).join('\n')}

Respond with a JSON array with exactly ${batch.length} objects in the same order:
[
  {
    "category": "string",
    "budgetGroup": "needs|wants|savings",
    "excludeFromBudget": boolean,
    "confidence": number,
    "reasoning": "string"
  }
]`;

    try {
      const { data, error } = await supabase.functions.invoke('claude-ai-coach', {
        body: {
          input: prompt,
          model: 'claude-3-haiku-20240307',
          system_prompt: 'You are a financial categorization expert. Always respond with valid JSON only, no other text.'
        }
      });

      if (error) throw error;

      const response = data?.content?.[0]?.text || data?.response || '';
      
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const categorizations = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(categorizations) || categorizations.length !== batch.length) {
        throw new Error(`Expected ${batch.length} categorizations, got ${categorizations?.length || 0}`);
      }

      return batch.map((tx, i) => ({
        ...tx,
        ...categorizations[i]
      }));

    } catch (error: any) {
      console.error('Claude categorization error:', error);
      throw error;
    }
  }

  /**
   * Save categorized transactions to Supabase
   */
  async saveToSupabase(
    categorizedTransactions: (NormalizedTransaction & CategorizationResult)[],
    userId: string
  ): Promise<void> {
    if (categorizedTransactions.length === 0) return;

    console.log(`💾 Saving ${categorizedTransactions.length} transactions to Supabase...`);

    // Ensure user has a bank account
    let { data: accounts } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    let accountId: string;
    if (!accounts || accounts.length === 0) {
      const { data: newAccount, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: userId,
          account_name: 'Imported Transactions',
          bank_name: 'Mixed Banks',
          account_type: 'checking',
          currency: 'NZD',
          balance: 0
        })
        .select('id')
        .single();

      if (error) throw error;
      accountId = newAccount.id;
    } else {
      accountId = accounts[0].id;
    }

    // Get or create categories
    const categoryMap = await this.ensureCategories(categorizedTransactions, userId);

    // Prepare transaction data
    const transactionsToInsert = categorizedTransactions.map(tx => ({
      user_id: userId,
      account_id: accountId,
      transaction_date: tx.date,
      description: tx.description,
      amount: tx.amount,
      is_income: tx.is_income,
      category_id: categoryMap.get(tx.category) || null,
      merchant: tx.merchant || null,
      imported_from: `CSV Upload - ${tx.source_bank}`,
      tags: tx.excludeFromBudget ? ['transfer'] : [tx.budgetGroup],
      notes: tx.reasoning
    }));

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
      const batch = transactionsToInsert.slice(i, i + batchSize);
      const { error } = await supabase
        .from('transactions')
        .insert(batch);

      if (error) throw error;
      
      console.log(`💾 Saved batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transactionsToInsert.length / batchSize)}`);
    }

    console.log(`✅ Successfully saved all ${categorizedTransactions.length} transactions to Supabase`);
  }

  /**
   * Ensure categories exist for all transactions
   */
  private async ensureCategories(
    transactions: (NormalizedTransaction & CategorizationResult)[],
    userId: string
  ): Promise<Map<string, string>> {
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', userId);

    const categoryMap = new Map<string, string>();
    existingCategories?.forEach(cat => categoryMap.set(cat.name, cat.id));

    // Find missing categories
    const missingCategories: string[] = [];
    transactions.forEach(tx => {
      if (!categoryMap.has(tx.category) && !missingCategories.includes(tx.category)) {
        missingCategories.push(tx.category);
      }
    });

    // Create missing categories
    if (missingCategories.length > 0) {
      const newCategories = missingCategories.map(name => ({
        user_id: userId,
        name,
        color: this.getCategoryColor(name),
        icon: this.getCategoryIcon(name),
        is_income: transactions.find(tx => tx.category === name)?.is_income || false
      }));

      const { data: createdCategories, error } = await supabase
        .from('categories')
        .insert(newCategories)
        .select('id, name');

      if (error) throw error;

      createdCategories?.forEach(cat => categoryMap.set(cat.name, cat.id));
      console.log(`✅ Created ${missingCategories.length} new categories`);
    }

    return categoryMap;
  }

  private getCategoryColor(categoryName: string): string {
    const colorMap: { [key: string]: string } = {
      'groceries': '#22c55e',
      'rent': '#3b82f6', 
      'salary': '#10b981',
      'dining': '#f59e0b',
      'transport': '#8b5cf6',
      'entertainment': '#ec4899',
      'utilities': '#06b6d4',
      'healthcare': '#ef4444'
    };
    
    for (const [key, color] of Object.entries(colorMap)) {
      if (categoryName.toLowerCase().includes(key)) return color;
    }
    
    return '#6b7280'; // Default gray
  }

  private getCategoryIcon(categoryName: string): string {
    const iconMap: { [key: string]: string } = {
      'groceries': '🛒',
      'rent': '🏠',
      'salary': '💰',
      'dining': '🍽️',
      'transport': '🚗',
      'entertainment': '🎬',
      'utilities': '⚡',
      'healthcare': '🏥'
    };
    
    for (const [key, icon] of Object.entries(iconMap)) {
      if (categoryName.toLowerCase().includes(key)) return icon;
    }
    
    return '📄'; // Default
  }
}

export const unifiedTransactionProcessor = new UnifiedTransactionProcessor();