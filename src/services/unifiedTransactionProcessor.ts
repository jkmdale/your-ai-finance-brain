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

// Interface for tracking skipped rows
export interface SkippedRow {
  rowNumber: number;
  rowData: any;
  error: string;
  details?: {
    dateValue?: string;
    amountValue?: string;
    descriptionValue?: string;
  };
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
        date: ['Date', 'Transaction Date', 'Trans Date', 'Trans. Date', 'Processing Date', 'Posted Date'],
        description: ['Details', 'Description', 'Transaction Details', 'Narrative', 'Memo', 'Reference', 'Particulars'],
        amount: ['Amount', 'Total Amount', 'Transaction Amount'],
        debit: ['Debit', 'Debit Amount', 'Withdrawal', 'Money Out'],
        credit: ['Credit', 'Credit Amount', 'Deposit', 'Money In']
      }
    },
    {
      name: 'ASB',
      patterns: {
        filename: [/asb/i],  
        headers: ['Date', 'Particulars', 'Amount']
      },
      columnMappings: {
        date: ['Date', 'Transaction Date', 'Trans Date', 'Trans. Date', 'Processed Date', 'Posted Date', 'Value Date'],
        description: ['Particulars', 'Description', 'Details', 'Narrative', 'Transaction', 'Reference', 'Memo'],
        amount: ['Amount', 'Total', 'Transaction Amount'],
        debit: ['Debit', 'Debit Amount', 'Withdrawals', 'Money Out', 'Outgoing'],
        credit: ['Credit', 'Credit Amount', 'Deposits', 'Money In', 'Incoming']
      }
    },
    {
      name: 'Westpac',
      patterns: {
        filename: [/westpac/i],
        headers: ['Date', 'Transaction Details', 'Amount']
      },
      columnMappings: {
        date: ['Date', 'Processing Date', 'Transaction Date', 'Trans Date', 'Posted Date', 'Value Date'],
        description: ['Transaction Details', 'Description', 'Details', 'Narrative', 'Particulars', 'Reference', 'Payee'],
        amount: ['Amount', 'Total Amount', 'Transaction Amount'],
        debit: ['Debit Amount', 'Debit', 'Withdrawal', 'Money Out', 'Outgoing Amount'],
        credit: ['Credit Amount', 'Credit', 'Deposit', 'Money In', 'Incoming Amount']
      }
    },
    {
      name: 'Kiwibank',
      patterns: {
        filename: [/kiwibank/i, /kiwi/i],
        headers: ['Date', 'Payee', 'Amount']
      },
      columnMappings: {
        date: ['Date', 'Transaction Date', 'Trans Date', 'Posted Date', 'Processing Date', 'Value Date'],
        description: ['Payee', 'Description', 'Details', 'Narrative', 'Particulars', 'Reference', 'Merchant', 'Transaction Description'],
        amount: ['Amount', 'Total', 'Transaction Amount', 'Value'],
        debit: ['Debit', 'Debit Amount', 'Withdrawals', 'Money Out', 'Paid Out'],
        credit: ['Credit', 'Credit Amount', 'Deposits', 'Money In', 'Paid In']
      }
    },
    {
      name: 'BNZ',
      patterns: {
        filename: [/bnz/i],
        headers: ['Date', 'Description', 'Amount']
      },
      columnMappings: {
        date: ['Date', 'Transaction Date', 'Trans Date', 'Process Date', 'Posted Date', 'Value Date'],
        description: ['Description', 'Details', 'Transaction Details', 'Narrative', 'Particulars', 'Reference', 'Comment'],
        amount: ['Amount', 'Total Amount', 'Transaction Amount', 'Value'],
        debit: ['Debit Amount', 'Debit', 'Withdrawals', 'Money Out', 'DR'],
        credit: ['Credit Amount', 'Credit', 'Deposits', 'Money In', 'CR']
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
      skippedRows: SkippedRow[];
      totalRowsProcessed: number;
    };
  }> {
    const allTransactions: NormalizedTransaction[] = [];
    const allSkippedRows: SkippedRow[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalTransactions = 0;
    let totalRowsProcessed = 0;

    console.log(`🏦 Processing ${files.length} CSV files...`);

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📄 Processing file ${i + 1}/${files.length}: ${file.name}`);

      try {
        const result = await this.processSingleCSV(file);
        allTransactions.push(...result.transactions);
        allSkippedRows.push(...result.skippedRows);
        totalTransactions += result.transactions.length;
        totalRowsProcessed += result.totalRows;
        
        // Log first few rows for debugging
        if (result.headers && result.firstRows) {
          console.log(`📋 CSV Headers:`, result.headers);
          console.log(`📋 First 2 rows:`, result.firstRows);
        }
        
        if (result.skippedRows.length > 0) {
          warnings.push(`${file.name}: ${result.skippedRows.length} rows skipped`);
          // Log details of first few skipped rows
          console.log(`⚠️ Sample skipped rows from ${file.name}:`);
          result.skippedRows.slice(0, 3).forEach(skipped => {
            console.log(`  Row ${skipped.rowNumber}: ${skipped.error}`);
            console.log(`    Date: "${skipped.details?.dateValue}", Amount: "${skipped.details?.amountValue}"`);
          });
        }
      } catch (error: any) {
        console.error(`❌ Error processing ${file.name}:`, error);
        errors.push(`${file.name}: ${error.message}`);
      }
    }

    // Remove duplicates (including existing ones in database)
    const uniqueTransactions = await this.removeDuplicates(allTransactions, userId);
    const duplicatesSkipped = allTransactions.length - uniqueTransactions.length;

    console.log(`✅ Processed ${files.length} files: ${totalTransactions} transactions imported, ${allSkippedRows.length} rows skipped, ${duplicatesSkipped} duplicates removed`);

    return {
      transactions: uniqueTransactions,
      summary: {
        totalFiles: files.length,
        totalTransactions,
        duplicatesSkipped,
        errors,
        warnings,
        skippedRows: allSkippedRows,
        totalRowsProcessed
      }
    };
  }

  /**
   * Process a single CSV file
   */
  private async processSingleCSV(file: File): Promise<{
    transactions: NormalizedTransaction[];
    skippedRows: SkippedRow[];
    totalRows: number;
    headers?: string[];
    firstRows?: any[];
  }> {
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
            const result = this.normalizeTransactions(
              results.data as any[], 
              bankFormat, 
              file.name
            );

            resolve({
              transactions: result.transactions,
              skippedRows: result.skippedRows,
              totalRows: results.data.length,
              headers: results.meta.fields,
              firstRows: (results.data as any[]).slice(0, 2)
            });
          } catch (error: any) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
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

    // First try to match by filename or header patterns
    for (const format of this.bankFormats) {
      // Check filename patterns
      const filenameMatch = format.patterns.filename.some(pattern => pattern.test(lowerFilename));
      
      // Check header patterns - more flexible matching
      const requiredHeaders = format.patterns.headers;
      const headerMatch = requiredHeaders.some(reqHeader => 
        lowerHeaders.some(h => h.includes(reqHeader.toLowerCase()))
      );

      if (filenameMatch || headerMatch) {
        console.log(`🏛️ Detected ${format.name} format based on ${filenameMatch ? 'filename' : 'headers'}`);
        return format;
      }
    }

    // If no specific bank format matched, try to create a generic format
    // by detecting common column names
    console.log('🔍 No specific bank format detected, attempting generic column detection...');
    
    const genericFormat = this.createGenericBankFormat(headers);
    if (genericFormat) {
      console.log('✅ Successfully created generic format from detected columns');
      return genericFormat;
    }

    return null;
  }

  /**
   * Create a generic bank format by detecting common column patterns
   */
  private createGenericBankFormat(headers: string[]): BankFormat | null {
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());
    
    // Common date column patterns
    const datePatterns = ['date', 'transaction date', 'trans date', 'posted', 'processed', 'value date', 'posting date'];
    const dateColumn = headers.find((h, i) => 
      datePatterns.some(pattern => lowerHeaders[i].includes(pattern))
    );

    // Common description column patterns
    const descPatterns = ['description', 'details', 'particulars', 'narrative', 'payee', 'merchant', 'reference', 'memo', 'comment'];
    const descColumn = headers.find((h, i) => 
      descPatterns.some(pattern => lowerHeaders[i].includes(pattern))
    );

    // Common amount column patterns
    const amountPatterns = ['amount', 'total', 'value', 'transaction amount', 'payment'];
    const amountColumn = headers.find((h, i) => 
      amountPatterns.some(pattern => lowerHeaders[i].includes(pattern))
    );

    // Common debit/credit patterns
    const debitPatterns = ['debit', 'withdrawal', 'money out', 'outgoing', 'paid out', 'dr'];
    const debitColumn = headers.find((h, i) => 
      debitPatterns.some(pattern => lowerHeaders[i].includes(pattern))
    );

    const creditPatterns = ['credit', 'deposit', 'money in', 'incoming', 'paid in', 'cr'];
    const creditColumn = headers.find((h, i) => 
      creditPatterns.some(pattern => lowerHeaders[i].includes(pattern))
    );

    // We need at least a date and either (amount) or (debit+credit)
    const hasRequiredColumns = dateColumn && (amountColumn || (debitColumn && creditColumn));
    
    if (!hasRequiredColumns) {
      console.log('❌ Could not detect required columns (date + amount/debit+credit)');
      console.log('   Available headers:', headers);
      return null;
    }

    // Build the generic format
    const genericFormat: BankFormat = {
      name: 'Generic',
      patterns: {
        filename: [],
        headers: []
      },
      columnMappings: {
        date: dateColumn ? [dateColumn] : [],
        description: descColumn ? [descColumn] : ['Transaction'],
        amount: amountColumn ? [amountColumn] : [],
        debit: debitColumn ? [debitColumn] : [],
        credit: creditColumn ? [creditColumn] : []
      }
    };

    console.log('📋 Generic format detected with columns:', {
      date: dateColumn,
      description: descColumn || 'Transaction',
      amount: amountColumn,
      debit: debitColumn,
      credit: creditColumn
    });

    return genericFormat;
  }

  /**
   * Normalize transactions from CSV data using bank format
   */
  private normalizeTransactions(
    csvData: any[], 
    bankFormat: BankFormat, 
    filename: string
  ): { transactions: NormalizedTransaction[], skippedRows: SkippedRow[] } {
    const transactions: NormalizedTransaction[] = [];
    const skippedRows: SkippedRow[] = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        const transaction = this.normalizeTransaction(row, bankFormat, filename, i + 1);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error: any) {
        console.warn(`⚠️ Skipping row in ${filename} (Row ${i + 1}):`, error.message, row);
        
        // Safely extract column values for error details
        const dateValue = bankFormat.columnMappings.date?.[0] 
          ? row[bankFormat.columnMappings.date[0]] 
          : this.findColumnValue(row, bankFormat.columnMappings.date || []);
        
        const amountValue = bankFormat.columnMappings.amount?.[0]
          ? row[bankFormat.columnMappings.amount[0]]
          : this.findColumnValue(row, bankFormat.columnMappings.amount || []);
        
        const descriptionValue = bankFormat.columnMappings.description?.[0]
          ? row[bankFormat.columnMappings.description[0]]
          : this.findColumnValue(row, bankFormat.columnMappings.description || []);
        
        skippedRows.push({
          rowNumber: i + 1,
          rowData: row,
          error: error.message,
          details: {
            dateValue: dateValue || undefined,
            amountValue: amountValue || undefined,
            descriptionValue: descriptionValue || undefined
          }
        });
      }
    }

    console.log(`📊 Normalized ${transactions.length} transactions from ${filename}`);
    console.log(`⚠️ Skipped ${skippedRows.length} rows due to errors.`);
    return { transactions, skippedRows };
  }

  /**
   * Normalize a single transaction
   */
  private normalizeTransaction(
    row: any, 
    bankFormat: BankFormat, 
    filename: string,
    rowNumber: number
  ): NormalizedTransaction | null {
    // Skip completely empty rows
    if (!row || Object.values(row).every(val => !val || val.toString().trim() === '')) {
      return null; // Silently skip empty rows
    }

    // Extract date
    const dateValue = this.findColumnValue(row, bankFormat.columnMappings.date);
    const normalizedDate = this.normalizeDate(dateValue);
    if (!normalizedDate) {
      const dateStr = dateValue || '[empty]';
      throw new Error(`Invalid date format: "${dateStr}". Expected formats: DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD, DD-MM-YYYY, or DD MMM YYYY`);
    }

    // Extract description
    const description = this.findColumnValue(row, bankFormat.columnMappings.description);
    if (!description || description.trim() === '') {
      throw new Error('Missing or empty description/details field');
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
        throw new Error(`Both debit (${debitValue}) and credit (${creditValue}) have values - ambiguous transaction`);
      }

      if (debitAmount > 0) {
        amount = debitAmount;
        isIncome = false;
      } else if (creditAmount > 0) {
        amount = creditAmount;
        isIncome = true;
      } else {
        throw new Error('No valid amount found in debit or credit columns (both are empty or zero)');
      }
    } else {
      // Single amount column
      const amountValue = this.findColumnValue(row, bankFormat.columnMappings.amount);
      if (!amountValue) {
        throw new Error('Missing amount value');
      }

      try {
        const parsedAmount = this.parseAmount(amountValue);
        if (parsedAmount === 0) {
          return null; // Skip zero-amount transactions
        }

        amount = Math.abs(parsedAmount);
        isIncome = parsedAmount > 0;
      } catch (error) {
        throw new Error(`Invalid amount format: "${amountValue}". Expected a numeric value (e.g., 123.45, -123.45, $123.45)`);
      }
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
   * Normalize date string to YYYY-MM-DD format
   * Supports multiple date formats common in NZ banking
   */
  private normalizeDate(dateStr: string | null): string | null {
    if (!dateStr) return null;

    // Clean the date string
    const cleaned = dateStr.trim();
    if (!cleaned) return null;

    // Define all possible date formats to try
    const dateFormats = [
      // ISO formats
      { regex: /^\d{4}-\d{1,2}-\d{1,2}$/, parser: (str: string) => {
        const [year, month, day] = str.split('-').map(Number);
        return new Date(year, month - 1, day);
      }},
      
      // DD/MM/YYYY or DD-MM-YYYY (most common in NZ)
      { regex: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, parser: (str: string) => {
        const matches = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (!matches) return null;
        const [, day, month, year] = matches;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }},
      
      // DD/MM/YY or DD-MM-YY
      { regex: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/, parser: (str: string) => {
        const matches = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
        if (!matches) return null;
        const [, day, month, yearShort] = matches;
        // Assume 20xx for years 00-50, 19xx for years 51-99
        const year = parseInt(yearShort) <= 50 ? 2000 + parseInt(yearShort) : 1900 + parseInt(yearShort);
        return new Date(year, parseInt(month) - 1, parseInt(day));
      }},
      
      // YYYY/MM/DD or YYYY-MM-DD with various separators
      { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, parser: (str: string) => {
        const matches = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
        if (!matches) return null;
        const [, year, month, day] = matches;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }},
      
      // MM/DD/YYYY or MM-DD-YYYY (US format, less common but possible)
      { regex: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, parser: (str: string, tryUSFormat: boolean = true) => {
        if (!tryUSFormat) return null;
        const matches = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (!matches) return null;
        const [, month, day, year] = matches;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        // Validate that month is 1-12
        if (parseInt(month) > 12) return null;
        return date;
      }},
      
      // DD MMM YYYY or DD-MMM-YYYY (e.g., 25 Dec 2023)
      { regex: /^(\d{1,2})[\s\-]([A-Za-z]{3})[\s\-](\d{4})$/i, parser: (str: string) => {
        const matches = str.match(/^(\d{1,2})[\s\-]([A-Za-z]{3})[\s\-](\d{4})$/i);
        if (!matches) return null;
        const [, day, monthStr, year] = matches;
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndex = months.indexOf(monthStr.toLowerCase().substring(0, 3));
        if (monthIndex === -1) return null;
        return new Date(parseInt(year), monthIndex, parseInt(day));
      }},
      
      // YYYYMMDD (compact format)
      { regex: /^(\d{4})(\d{2})(\d{2})$/, parser: (str: string) => {
        const matches = str.match(/^(\d{4})(\d{2})(\d{2})$/);
        if (!matches) return null;
        const [, year, month, day] = matches;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }}
    ];

    // Try each format
    for (const format of dateFormats) {
      if (format.regex.test(cleaned)) {
        try {
          const date = format.parser(cleaned);
          if (date && !isNaN(date.getTime())) {
            // Validate the date is reasonable (not in future, not too old)
            const now = new Date();
            const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
            const oneYearFuture = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
            
            if (date >= tenYearsAgo && date <= oneYearFuture) {
              return date.toISOString().split('T')[0];
            }
          }
        } catch (error) {
          // Continue to next format
        }
      }
    }

    // If the date has slashes or dashes, it might be ambiguous DD/MM vs MM/DD
    // Try to parse it as DD/MM first (NZ standard), then MM/DD if that fails
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(cleaned)) {
      const parts = cleaned.split(/[\/\-]/);
      const [first, second, year] = parts.map(Number);
      
      // Try DD/MM/YYYY first (NZ standard)
      if (first <= 31 && second <= 12) {
        const dateNZ = new Date(year, second - 1, first);
        if (!isNaN(dateNZ.getTime())) {
          return dateNZ.toISOString().split('T')[0];
        }
      }
      
      // Try MM/DD/YYYY if DD/MM didn't work
      if (first <= 12 && second <= 31) {
        const dateUS = new Date(year, first - 1, second);
        if (!isNaN(dateUS.getTime())) {
          return dateUS.toISOString().split('T')[0];
        }
      }
    }

    // Last resort: try JavaScript's built-in Date parsing
    try {
      const fallbackDate = new Date(cleaned);
      if (!isNaN(fallbackDate.getTime())) {
        // Validate the date is reasonable
        const now = new Date();
        const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
        const oneYearFuture = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        
        if (fallbackDate >= tenYearsAgo && fallbackDate <= oneYearFuture) {
          return fallbackDate.toISOString().split('T')[0];
        }
      }
    } catch (error) {
      // Date parsing failed
    }

    return null; // Could not parse date
  }

  /**
   * Parse amount string to number
   * Supports various formats: $123.45, -123.45, (123.45), 123,456.78, etc.
   */
  private parseAmount(amountStr: string): number {
    if (!amountStr || amountStr.toString().trim() === '') {
      throw new Error('Empty amount value');
    }

    // Remove currency symbols, spaces, and normalize separators
    let cleaned = amountStr.toString()
      .replace(/[$£€¥]/g, '')    // Remove common currency symbols
      .replace(/\s/g, '')         // Remove spaces
      .trim();

    // Handle different decimal separators (some banks use comma as decimal)
    // If we have both comma and dot, assume comma is thousands separator
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/,/g, ''); // Remove thousand separators
    } else if (cleaned.includes(',') && !cleaned.includes('.')) {
      // Check if comma might be decimal separator (e.g., "123,45")
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        cleaned = cleaned.replace(',', '.'); // Convert comma to dot for decimal
      } else {
        cleaned = cleaned.replace(/,/g, ''); // Remove thousand separators
      }
    }

    // Handle negative amounts in parentheses (e.g., "(123.45)")
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }

    // Handle CR/DR notations
    const hasCR = cleaned.toUpperCase().endsWith('CR');
    const hasDR = cleaned.toUpperCase().endsWith('DR');
    if (hasCR || hasDR) {
      cleaned = cleaned.slice(0, -2).trim();
      if (hasDR) {
        cleaned = '-' + cleaned;
      }
    }

    // Final parse
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed)) {
      throw new Error(`Cannot parse amount: "${amountStr}"`);
    }

    return parsed;
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