
import { BankFormat, detectBankFormat } from './bankFormats';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  merchant?: string;
  category?: string;
  account?: string;
  balance?: number;
  reference?: string;
  isIncome: boolean;
  confidence: number;
}

export interface ProcessedCSV {
  transactions: Transaction[];
  bankFormat: BankFormat | null;
  errors: string[];
  warnings: string[];
  summary: {
    totalTransactions: number;
    dateRange: { start: string; end: string };
    totalAmount: number;
    duplicates: number;
  };
}

export class CSVProcessor {
  private generateTransactionId(date: string, amount: number, description: string): string {
    const hash = btoa(`${date}-${amount}-${description}`).replace(/[^a-zA-Z0-9]/g, '');
    return `txn_${hash.substring(0, 12)}`;
  }

  private parseCSV(csvText: string): { headers: string[], rows: string[][] } {
    try {
      const lines = csvText.trim().split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
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
      const rows = lines.slice(1)
        .filter(line => line.trim())
        .map(line => parseCSVLine(line))
        .filter(row => row.some(cell => cell.trim())); // Filter out completely empty rows

      console.log(`Parsed ${headers.length} headers, ${rows.length} data rows`);
      return { headers, rows };
    } catch (error) {
      console.error('CSV parsing error:', error);
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseDate(dateString: string, format?: BankFormat): string {
    if (!dateString?.trim()) {
      console.warn('Empty date string, using today');
      return new Date().toISOString().split('T')[0];
    }
    
    const cleanDate = dateString.trim();
    
    // Common date patterns
    const patterns = [
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy' },
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy' },
      { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd' },
      { regex: /^(\d{2})(\d{2})(\d{4})$/, type: 'dmy' },
      { regex: /^(\d{4})(\d{2})(\d{2})$/, type: 'ymd' }
    ];

    for (const pattern of patterns) {
      const match = cleanDate.match(pattern.regex);
      if (match) {
        try {
          let year: string, month: string, day: string;
          
          if (pattern.type === 'ymd') {
            [, year, month, day] = match;
          } else {
            [, day, month, year] = match;
            if (year.length === 2) {
              year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
            }
          }
          
          // Validate and create date
          const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (dateObj.getFullYear() == parseInt(year) && 
              dateObj.getMonth() == parseInt(month) - 1 && 
              dateObj.getDate() == parseInt(day)) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    // Try JavaScript Date parsing as fallback
    try {
      const jsDate = new Date(cleanDate);
      if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() > 1900) {
        return jsDate.toISOString().split('T')[0];
      }
    } catch (error) {
      // Ignore
    }
    
    console.warn(`Could not parse date: ${cleanDate}, using today`);
    return new Date().toISOString().split('T')[0];
  }

  private parseAmount(amountString: string): number {
    if (!amountString?.trim()) return 0;
    
    // Remove currency symbols, spaces, and commas
    let cleaned = amountString.replace(/[£$€¥₹,\s]/g, '').trim();
    
    // Handle negative amounts in brackets
    const isNegative = /^\(.*\)$/.test(amountString) || cleaned.startsWith('-');
    cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '');
    
    const numericValue = parseFloat(cleaned);
    if (isNaN(numericValue)) {
      console.warn(`Could not parse amount: ${amountString}`);
      return 0;
    }
    
    return isNegative ? -Math.abs(numericValue) : numericValue;
  }

  private standardizeMerchant(description: string): string {
    if (!description) return '';
    
    // Clean up common bank prefixes
    const cleaned = description
      .replace(/^(TST\*|SQ \*|AMZN MKTP|PAYPAL \*|POS |ATM |EFTPOS |PURCHASE |PAYMENT )/i, '')
      .replace(/\*\w+$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Common merchant mappings
    const mappings: { [key: string]: string } = {
      'AMZN': 'Amazon',
      'AMAZON': 'Amazon',
      'SPOTIFY': 'Spotify',
      'NETFLIX': 'Netflix',
      'UBER': 'Uber',
      'MCDONALD': 'McDonald\'s',
      'STARBUCKS': 'Starbucks',
      'PAYPAL': 'PayPal'
    };

    const upperCleaned = cleaned.toUpperCase();
    for (const [pattern, merchant] of Object.entries(mappings)) {
      if (upperCleaned.includes(pattern)) {
        return merchant;
      }
    }

    return cleaned;
  }

  private categorizeTransaction(description: string, amount: number): { category: string; confidence: number } {
    const desc = description.toLowerCase();
    
    // Income detection
    if (amount > 0) {
      if (/\b(salary|wage|payroll|pay|employment)\b/.test(desc)) 
        return { category: 'Salary', confidence: 0.95 };
      if (/\b(dividend|interest|investment|return)\b/.test(desc)) 
        return { category: 'Investment Income', confidence: 0.9 };
      if (/\b(refund|reimbursement|cashback|credit)\b/.test(desc)) 
        return { category: 'Refunds', confidence: 0.85 };
      return { category: 'Other Income', confidence: 0.7 };
    }

    // Expense categorization
    const categories = [
      { pattern: /\b(rent|mortgage|property|utilities|electricity|gas|water|internet|phone)\b/, category: 'Housing & Utilities', confidence: 0.9 },
      { pattern: /\b(countdown|paknsave|newworld|woolworths|coles|grocery|supermarket|food)\b/, category: 'Groceries', confidence: 0.9 },
      { pattern: /\b(uber|taxi|bus|train|fuel|petrol|parking|transport)\b/, category: 'Transportation', confidence: 0.85 },
      { pattern: /\b(restaurant|cafe|takeaway|delivery|dining|mcdonald|kfc|starbucks)\b/, category: 'Dining Out', confidence: 0.8 },
      { pattern: /\b(netflix|spotify|subscription|entertainment|movie|cinema|games)\b/, category: 'Entertainment', confidence: 0.85 },
      { pattern: /\b(doctor|hospital|pharmacy|medical|health|dental)\b/, category: 'Healthcare', confidence: 0.9 },
      { pattern: /\b(amazon|shopping|retail|clothing|electronics|warehouse)\b/, category: 'Shopping', confidence: 0.75 },
      { pattern: /\b(insurance|life|car|health|home)\b/, category: 'Insurance', confidence: 0.9 },
      { pattern: /\b(transfer|payment|loan|credit|atm|withdrawal)\b/, category: 'Transfers', confidence: 0.7 }
    ];

    for (const { pattern, category, confidence } of categories) {
      if (pattern.test(desc)) {
        return { category, confidence };
      }
    }

    return { category: 'Other', confidence: 0.5 };
  }

  public async processCSV(csvText: string): Promise<ProcessedCSV> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const transactions: Transaction[] = [];

    try {
      console.log('🔄 Starting enhanced CSV processing...');
      
      const { headers, rows } = this.parseCSV(csvText);
      console.log(`📊 Parsed: ${headers.length} headers, ${rows.length} rows`);

      if (rows.length === 0) {
        throw new Error('No data rows found in CSV file');
      }

      // Detect bank format
      const sampleData = rows.slice(0, Math.min(5, rows.length));
      const bankFormat = detectBankFormat(headers, sampleData);
      
      if (bankFormat) {
        console.log(`✅ Detected: ${bankFormat.name} (${Math.round(bankFormat.confidence * 100)}%)`);
      } else {
        console.log('⚠️ No specific bank format detected, using generic parsing');
      }

      // Find column indices with flexible matching
      const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
      
      const findColumnIndex = (possibleNames: string[]): number => {
        for (const name of possibleNames) {
          const index = normalizedHeaders.findIndex(h => 
            h.includes(name.toLowerCase()) || 
            h === name.toLowerCase() ||
            h.replace(/[^a-z]/g, '').includes(name.toLowerCase().replace(/[^a-z]/g, ''))
          );
          if (index >= 0) return index;
        }
        return -1;
      };

      const dateIndex = findColumnIndex(['date', 'transaction date', 'posting date', 'value date', 'trans date']);
      const descIndex = findColumnIndex(['description', 'details', 'particulars', 'transaction details', 'memo', 'reference']);
      const amountIndex = findColumnIndex(['amount', 'value', 'debit', 'credit', 'transaction amount', 'balance', 'sum']);

      console.log(`📍 Column mapping: date=${dateIndex}, description=${descIndex}, amount=${amountIndex}`);

      if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
        const missing = [];
        if (dateIndex === -1) missing.push('date');
        if (descIndex === -1) missing.push('description');  
        if (amountIndex === -1) missing.push('amount');
        
        throw new Error(`Could not find required columns: ${missing.join(', ')}. Available headers: ${headers.join(', ')}`);
      }

      // Process transactions
      let processedCount = 0;
      const dates: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        try {
          if (row.length <= Math.max(dateIndex, descIndex, amountIndex)) {
            warnings.push(`Row ${i + 2}: Insufficient columns`);
            continue;
          }

          const rawDate = row[dateIndex]?.trim();
          const description = row[descIndex]?.trim();
          const rawAmount = row[amountIndex]?.trim();

          if (!rawDate || !description || !rawAmount) {
            warnings.push(`Row ${i + 2}: Missing required data`);
            continue;
          }

          const date = this.parseDate(rawDate, bankFormat);
          const amount = this.parseAmount(rawAmount);
          
          if (amount === 0 && rawAmount !== '0' && rawAmount !== '0.00') {
            warnings.push(`Row ${i + 2}: Could not parse amount "${rawAmount}"`);
          }

          const merchant = this.standardizeMerchant(description);
          const { category, confidence } = this.categorizeTransaction(description, amount);

          const transaction: Transaction = {
            id: this.generateTransactionId(date, amount, description),
            date,
            amount: Math.abs(amount),
            description,
            merchant,
            category,
            isIncome: amount > 0,
            confidence
          };

          transactions.push(transaction);
          dates.push(date);
          processedCount++;

        } catch (rowError: any) {
          console.error(`Row ${i + 2} error:`, rowError);
          errors.push(`Row ${i + 2}: ${rowError.message}`);
        }
      }

      // Calculate summary
      dates.sort();
      const totalAmount = transactions.reduce((sum, t) => sum + (t.isIncome ? t.amount : -t.amount), 0);
      
      const summary = {
        totalTransactions: transactions.length,
        dateRange: {
          start: dates[0] || '',
          end: dates[dates.length - 1] || ''
        },
        totalAmount,
        duplicates: 0
      };

      console.log(`✅ Processing complete: ${processedCount} transactions, ${errors.length} errors, ${warnings.length} warnings`);

      return {
        transactions,
        bankFormat,
        errors,
        warnings,
        summary
      };

    } catch (error: any) {
      console.error('❌ Fatal processing error:', error);
      errors.push(`Processing failed: ${error.message}`);
      
      return {
        transactions: [],
        bankFormat: null,
        errors,
        warnings,
        summary: { totalTransactions: 0, dateRange: { start: '', end: '' }, totalAmount: 0, duplicates: 0 }
      };
    }
  }
}
