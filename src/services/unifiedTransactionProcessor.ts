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
    try {
      const directDate = new Date(cleaned);
      if (!isNaN(directDate.getTime()) && cleaned.includes('-')) {
        return directDate.toISOString().split('T')[0];
      }
    } catch (error) {
      // Continue to other parsing methods
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
    try {
      const fallbackDate = new Date(cleaned);
      if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate.toISOString().split('T')[0];
      }
    } catch (error) {
      // Fallback parsing failed
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
   * Enhanced Claude categorization with retry logic and mobile optimization
   */
  async categorizeWithClaude(
    transactions: NormalizedTransaction[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<NormalizedTransaction[]> {
    console.log(`🧠 Starting enhanced Claude categorization for ${transactions.length} transactions...`);
    
    const categorizedTransactions: NormalizedTransaction[] = [];
    const batchSize = 20; // Optimized batch size for mobile performance
    const maxRetries = 2;
    
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const batchNumber = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(transactions.length/batchSize);
      
      console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} transactions)`);
      
      let retryCount = 0;
      let batchResults: NormalizedTransaction[] = [];
      
      while (retryCount <= maxRetries) {
        try {
          // Batch categorization prompt for efficiency
          const batchPrompt = this.createBatchCategorizationPrompt(batch);
          
          const { data, error } = await supabase.functions.invoke('claude-ai-coach', {
            body: { 
              message: batchPrompt,
              type: 'batch_transaction_categorization'
            }
          });

          if (error) {
            throw new Error(`Claude API error: ${error.message}`);
          }

          // Parse batch response
          batchResults = this.parseBatchCategorizationResponse(data.response, batch);
          break; // Success, exit retry loop
          
        } catch (error) {
          retryCount++;
          console.warn(`Batch ${batchNumber} attempt ${retryCount} failed:`, error);
          
          if (retryCount > maxRetries) {
            console.error(`Batch ${batchNumber} failed after ${maxRetries} retries, using fallback categorization`);
            batchResults = batch.map(tx => this.createFallbackTransaction(tx));
          } else {
            // Exponential backoff for retries
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`Retrying batch ${batchNumber} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      categorizedTransactions.push(...batchResults);
      onProgress?.(categorizedTransactions.length, transactions.length);
      
      // Rate limiting delay for mobile networks
      if (i + batchSize < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    console.log(`✅ Enhanced Claude categorization complete: ${categorizedTransactions.length} transactions processed`);
    return categorizedTransactions;
  }

  /**
   * Create efficient batch categorization prompt
   */
  private createBatchCategorizationPrompt(transactions: NormalizedTransaction[]): string {
    const transactionList = transactions.map((tx, index) => 
      `${index + 1}. "${tx.description}" | $${tx.amount} | ${tx.is_income ? 'Income' : 'Expense'} | ${tx.source_bank}`
    ).join('\n');

    return `Categorize these ${transactions.length} New Zealand banking transactions. Return a JSON array with exactly ${transactions.length} objects, each containing: {"index": number, "category": string, "reasoning": string}

Categories for expenses: Housing, Transportation, Food & Dining, Utilities, Healthcare, Entertainment, Shopping, Personal Care, Education, Other
Categories for income: Salary, Investment Income, Other Income
Special: Transfer (for internal transfers/reversals)

Transactions:
${transactionList}

Return only the JSON array, no other text.`;
  }

  /**
   * Parse batch categorization response with fallback
   */
  private parseBatchCategorizationResponse(
    response: string, 
    originalBatch: NormalizedTransaction[]
  ): NormalizedTransaction[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const categories = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(categories) || categories.length !== originalBatch.length) {
        throw new Error(`Expected ${originalBatch.length} categories, got ${categories.length}`);
      }

      return originalBatch.map((transaction, index) => {
        const categoryData = categories.find(cat => cat.index === index + 1) || categories[index];
        
        // Check for transfers/reversals
        if (this.isTransferOrReversal(transaction.description)) {
          return {
            ...transaction,
            category: 'Transfer',
            confidence: 0.9
          };
        }

        return {
          ...transaction,
          category: categoryData?.category || 'Uncategorised',
          confidence: categoryData?.category ? 0.85 : 0.3
        };
      });
      
    } catch (error) {
      console.error('Failed to parse batch categorization response:', error);
      return originalBatch.map(tx => this.createFallbackTransaction(tx));
    }
  }

  /**
   * Create fallback transaction with rule-based categorization
   */
  private createFallbackTransaction(transaction: NormalizedTransaction): NormalizedTransaction {
    const fallbackResult = this.fallbackCategorization(transaction);
    return {
      ...transaction,
      category: fallbackResult.category,
      confidence: fallbackResult.confidence
    };
  }

  /**
   * Check if transaction is a transfer or reversal that should be excluded
   */
  private isTransferOrReversal(description: string): boolean {
    const lowerDesc = description.toLowerCase();
    const transferPatterns = [
      'transfer', 'trnsfr', 'tfr', 'xfer',
      'reversal', 'reverse', 'refund', 'credit adjustment',
      'deposit correction', 'withdrawal correction',
      'account fee reversal', 'duplicate transaction'
    ];
    
    return transferPatterns.some(pattern => lowerDesc.includes(pattern));
  }

  /**
   * Extract category from Claude response
   */
  private extractCategoryFromResponse(claudeResponse: string, transaction: NormalizedTransaction): string {
    try {
      // Try to extract category from JSON response
      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.category || (transaction.is_income ? 'Other Income' : 'Uncategorised');
      }
      
      // Fallback to text parsing
      if (transaction.is_income) {
        return claudeResponse.includes('salary') ? 'Salary' : 'Other Income';
      }
      
      return 'Uncategorised';
    } catch (error) {
      console.warn('Failed to parse Claude response:', error);
      return transaction.is_income ? 'Other Income' : 'Uncategorised';
    }
  }

  /**
   * Fallback categorization when Claude fails
   */
  private fallbackCategorization(transaction: NormalizedTransaction): CategorizationResult {
    const desc = transaction.description.toLowerCase();
    
    // Check if it's a transfer/reversal first
    if (this.isTransferOrReversal(transaction.description)) {
      return {
        category: 'Transfer',
        budgetGroup: 'wants',
        excludeFromBudget: true,
        confidence: 0.9,
        reasoning: 'Detected transfer/reversal pattern'
      };
    }
    
    // Income categorization
    if (transaction.is_income) {
      if (desc.includes('salary') || desc.includes('wage') || desc.includes('pay')) {
        return { 
          category: 'Salary', 
          budgetGroup: 'savings',
          excludeFromBudget: false,
          confidence: 0.8,
          reasoning: 'Salary/wage pattern detected'
        };
      }
      if (desc.includes('dividend') || desc.includes('interest') || desc.includes('investment')) {
        return { 
          category: 'Investment Income', 
          budgetGroup: 'savings',
          excludeFromBudget: false,
          confidence: 0.8,
          reasoning: 'Investment income pattern detected'
        };
      }
      return { 
        category: 'Other Income', 
        budgetGroup: 'savings',
        excludeFromBudget: false,
        confidence: 0.6,
        reasoning: 'Generic income classification'
      };
    }
    
    // Expense categorization with NZ-specific patterns
    const categoryMap = {
      'Groceries': ['countdown', 'paknsave', 'new world', 'woolworths', 'grocery', 'supermarket', 'fresh choice'],
      'Transportation': ['bp', 'shell', 'z energy', 'caltex', 'mobil', 'uber', 'taxi', 'bus', 'train'],
      'Dining Out': ['mcdonald', 'kfc', 'subway', 'pizza', 'restaurant', 'cafe', 'takeaway'],
      'Housing & Utilities': ['rent', 'mortgage', 'power', 'gas', 'water', 'internet', 'phone', 'rates'],
      'Healthcare': ['pharmacy', 'chemist', 'doctor', 'medical', 'dental', 'hospital'],
      'Entertainment': ['netflix', 'spotify', 'cinema', 'movie', 'entertainment', 'games'],
      'Shopping': ['warehouse', 'kmart', 'target', 'amazon', 'shopping', 'retail']
    };
    
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        const budgetGroup = ['Housing & Utilities', 'Groceries', 'Healthcare'].includes(category) ? 'needs' : 'wants';
        return { 
          category, 
          budgetGroup: budgetGroup as 'needs' | 'wants',
          excludeFromBudget: false,
          confidence: 0.7,
          reasoning: `Matched keyword patterns for ${category}`
        };
      }
    }
    
    return { 
      category: 'Uncategorised', 
      budgetGroup: 'wants',
      excludeFromBudget: false,
      confidence: 0.3,
      reasoning: 'No matching patterns found'
    };
  }
}

export const unifiedTransactionProcessor = new UnifiedTransactionProcessor();