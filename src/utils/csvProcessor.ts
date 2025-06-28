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
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    // Parse headers - handle quoted fields and commas within quotes
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add final field
      result.push(current.trim());
      
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
    const rows = lines.slice(1)
      .filter(line => line.trim()) // Remove empty lines
      .map(line => parseCSVLine(line).map(cell => cell.replace(/"/g, '').trim()));

    return { headers, rows };
  }

  private parseDate(dateString: string, format: BankFormat): string {
    const cleanDate = dateString.trim();
    
    if (!cleanDate) {
      console.warn('Empty date string provided');
      return new Date().toISOString().split('T')[0];
    }
    
    // Handle various date formats with better error handling
    const datePatterns = [
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
      /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, // YYYY/MM/DD
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,  // DD/MM/YY or MM/DD/YY
      /^(\d{2})(\d{2})(\d{4})$/,                   // DDMMYYYY
      /^(\d{4})(\d{2})(\d{2})$/,                   // YYYYMMDD
    ];

    for (const pattern of datePatterns) {
      const match = cleanDate.match(pattern);
      if (match) {
        let [, part1, part2, part3] = match;
        
        try {
          // Handle different date formats based on bank format
          if (pattern.source.includes('(\\d{4})') && pattern.source.indexOf('(\\d{4})') === 1) {
            // YYYY/MM/DD format
            const year = part1;
            const month = part2.padStart(2, '0');
            const day = part3.padStart(2, '0');
            
            const date = new Date(`${year}-${month}-${day}`);
            if (!isNaN(date.getTime())) {
              return `${year}-${month}-${day}`;
            }
          } else {
            // Determine if it's DD/MM/YYYY or MM/DD/YYYY based on format
            let day: string, month: string, year: string;
            
            if (format.country === 'US' && parseInt(part1) <= 12 && parseInt(part2) <= 31) {
              // US format: MM/DD/YYYY
              month = part1.padStart(2, '0');
              day = part2.padStart(2, '0');
              year = part3.length === 2 ? `20${part3}` : part3;
            } else {
              // Other formats: DD/MM/YYYY
              day = part1.padStart(2, '0');
              month = part2.padStart(2, '0');
              year = part3.length === 2 ? `20${part3}` : part3;
            }
            
            // Validate date
            const date = new Date(`${year}-${month}-${day}`);
            if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
              return `${year}-${month}-${day}`;
            }
          }
        } catch (error) {
          console.warn('Error parsing date:', cleanDate, error);
          continue;
        }
      }
    }
    
    // Try parsing as standard JavaScript date
    try {
      const jsDate = new Date(cleanDate);
      if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() > 1900) {
        return jsDate.toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn('Failed to parse date as JS Date:', cleanDate);
    }
    
    console.warn('Unable to parse date:', cleanDate, 'using current date');
    return new Date().toISOString().split('T')[0];
  }

  private parseAmount(amountString: string, format: BankFormat): number {
    if (!amountString || amountString.trim() === '') return 0;
    
    const cleanAmount = amountString
      .replace(/[£$€¥₹,\s]/g, '') // Remove currency symbols, commas, and spaces
      .trim();
    
    if (!cleanAmount) return 0;
    
    // Handle negative amounts in brackets or with minus sign
    const isNegative = format.patterns.negativePattern.test(amountString) || 
                      cleanAmount.startsWith('-') ||
                      amountString.includes('(') && amountString.includes(')');
    
    // Extract numeric value
    const numericString = cleanAmount.replace(/[^\d.-]/g, '');
    const numericValue = parseFloat(numericString);
    
    if (isNaN(numericValue)) {
      console.warn('Unable to parse amount:', amountString);
      return 0;
    }
    
    return isNegative ? -Math.abs(numericValue) : numericValue;
  }

  private standardizeMerchant(description: string): string {
    if (!description) return '';
    
    // Remove common bank prefixes and codes
    const cleanDescription = description
      .replace(/^(TST\*|SQ \*|AMZN MKTP|PAYPAL \*|POS |ATM |EFTPOS )/i, '')
      .replace(/\*\w+$/, '') // Remove trailing reference codes
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s&'-]/g, '') // Remove special characters except common ones
      .trim();

    // Common merchant mappings for better recognition
    const merchantMappings: { [key: string]: string } = {
      'AMZN': 'Amazon',
      'AMAZON': 'Amazon',
      'SPOTIFY': 'Spotify',
      'NETFLIX': 'Netflix',
      'UBER': 'Uber',
      'LYFT': 'Lyft',
      'COUNTDOWN': 'Countdown',
      'PAKNSAVE': 'Pak\'nSave',
      'NEWWORLD': 'New World',
      'WOOLWORTHS': 'Woolworths',
      'COLES': 'Coles',
      'MCDONALDS': 'McDonald\'s',
      'KFC': 'KFC',
      'STARBUCKS': 'Starbucks',
      'PAYPAL': 'PayPal',
      'APPLE': 'Apple',
      'GOOGLE': 'Google',
      'MICROSOFT': 'Microsoft'
    };

    const upperDescription = cleanDescription.toUpperCase();
    for (const [pattern, merchant] of Object.entries(merchantMappings)) {
      if (upperDescription.includes(pattern)) {
        return merchant;
      }
    }

    // Clean up common prefixes and suffixes
    return cleanDescription
      .replace(/^(PURCHASE |PAYMENT |TRANSFER |DEPOSIT )/i, '')
      .replace(/(LTD|LIMITED|INC|CORP)$/i, '')
      .trim();
  }

  private categorizeTransaction(description: string, amount: number): { category: string; confidence: number } {
    const desc = description.toLowerCase();
    
    // Income patterns with high confidence
    if (amount > 0) {
      if (/\b(salary|wage|payroll|pay|employment)\b/.test(desc)) 
        return { category: 'Salary', confidence: 0.95 };
      if (/\b(dividend|interest|investment|return)\b/.test(desc)) 
        return { category: 'Investment Income', confidence: 0.9 };
      if (/\b(refund|reimbursement|cashback|credit)\b/.test(desc)) 
        return { category: 'Refunds', confidence: 0.85 };
      if (/\b(freelance|contract|commission|bonus)\b/.test(desc)) 
        return { category: 'Other Income', confidence: 0.8 };
      return { category: 'Other Income', confidence: 0.7 };
    }

    // Expense categories with improved patterns and confidence scoring
    const categories = [
      { 
        pattern: /\b(rent|mortgage|property|utilities|electricity|gas|water|internet|phone|broadband|mobile)\b/, 
        category: 'Housing & Utilities', 
        confidence: 0.9 
      },
      { 
        pattern: /\b(countdown|paknsave|newworld|woolworths|coles|grocery|supermarket|food|fresh)\b/, 
        category: 'Groceries', 
        confidence: 0.9 
      },
      { 
        pattern: /\b(uber|taxi|bus|train|fuel|gas|petrol|parking|transport|lyft|uber eats|delivery)\b/, 
        category: 'Transportation', 
        confidence: 0.85 
      },
      { 
        pattern: /\b(restaurant|cafe|takeaway|delivery|dining|mcdonalds|kfc|starbucks|pizza)\b/, 
        category: 'Dining Out', 
        confidence: 0.8 
      },
      { 
        pattern: /\b(netflix|spotify|subscription|entertainment|movie|cinema|games|streaming)\b/, 
        category: 'Entertainment', 
        confidence: 0.85 
      },
      { 
        pattern: /\b(doctor|hospital|pharmacy|medical|health|dental|prescription)\b/, 
        category: 'Healthcare', 
        confidence: 0.9 
      },
      { 
        pattern: /\b(amazon|shopping|retail|clothing|electronics|warehouse|kmart|target)\b/, 
        category: 'Shopping', 
        confidence: 0.75 
      },
      { 
        pattern: /\b(insurance|life|car|health|home|travel)\b/, 
        category: 'Insurance', 
        confidence: 0.9 
      },
      { 
        pattern: /\b(education|school|university|course|training|tuition)\b/, 
        category: 'Education', 
        confidence: 0.85 
      },
      { 
        pattern: /\b(gym|fitness|sport|personal|beauty|salon|spa)\b/, 
        category: 'Personal Care', 
        confidence: 0.8 
      },
      { 
        pattern: /\b(transfer|payment|loan|credit|atm|withdrawal)\b/, 
        category: 'Transfers', 
        confidence: 0.7 
      }
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
      console.log('🔄 Starting CSV processing...');
      
      // Parse CSV with better error handling
      const { headers, rows } = this.parseCSV(csvText);
      console.log(`📊 Parsed CSV: ${headers.length} headers, ${rows.length} rows`);

      if (rows.length === 0) {
        errors.push('No data rows found in CSV file');
        return {
          transactions: [],
          bankFormat: null,
          errors,
          warnings,
          summary: { totalTransactions: 0, dateRange: { start: '', end: '' }, totalAmount: 0, duplicates: 0 }
        };
      }

      // Get sample data for format detection (up to 5 rows)
      const sampleData = rows.slice(0, Math.min(5, rows.length));

      // Detect bank format
      console.log('🏦 Detecting bank format...');
      const bankFormat = detectBankFormat(headers, sampleData);
      
      if (!bankFormat) {
        warnings.push('Unable to detect specific bank format, using generic processing');
        console.warn('⚠️ No bank format detected, proceeding with generic parsing');
      } else {
        console.log(`✅ Detected bank format: ${bankFormat.name} (${bankFormat.confidence * 100}% confidence)`);
      }

      // Find column indices with fallback logic
      const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
      
      const findColumnIndex = (possibleNames: string[]): number => {
        for (const name of possibleNames) {
          const index = normalizedHeaders.findIndex(h => h.includes(name.toLowerCase()));
          if (index >= 0) return index;
        }
        return -1;
      };

      const dateIndex = bankFormat 
        ? findColumnIndex(bankFormat.headers.date)
        : findColumnIndex(['date', 'transaction date', 'posting date', 'value date']);
      
      const descIndex = bankFormat
        ? findColumnIndex(bankFormat.headers.description)
        : findColumnIndex(['description', 'details', 'particulars', 'transaction details', 'memo']);
      
      const amountIndex = bankFormat
        ? findColumnIndex(bankFormat.headers.amount)
        : findColumnIndex(['amount', 'value', 'debit', 'credit', 'transaction amount']);

      console.log(`📍 Column indices: date=${dateIndex}, description=${descIndex}, amount=${amountIndex}`);

      if (dateIndex === -1) {
        errors.push('Could not find date column. Expected headers: date, transaction date, posting date');
      }
      if (descIndex === -1) {
        errors.push('Could not find description column. Expected headers: description, details, particulars');
      }
      if (amountIndex === -1) {
        errors.push('Could not find amount column. Expected headers: amount, value, debit, credit');
      }

      if (errors.length > 0) {
        return {
          transactions: [],
          bankFormat,
          errors,
          warnings,
          summary: { totalTransactions: 0, dateRange: { start: '', end: '' }, totalAmount: 0, duplicates: 0 }
        };
      }

      // Process transactions with better error handling
      let totalAmount = 0;
      const dates: string[] = [];
      let processedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        if (row.length < Math.max(dateIndex, descIndex, amountIndex) + 1) {
          warnings.push(`Row ${i + 2} has insufficient columns, skipping`);
          continue;
        }

        try {
          const rawDate = row[dateIndex] || '';
          const description = row[descIndex] || '';
          const rawAmount = row[amountIndex] || '0';

          if (!rawDate || !description) {
            warnings.push(`Row ${i + 2} missing essential data (date or description), skipping`);
            continue;
          }

          const date = this.parseDate(rawDate, bankFormat || { country: 'Generic' } as BankFormat);
          const amount = this.parseAmount(rawAmount, bankFormat || { patterns: { negativePattern: /^-|\(.*\)$/ } } as BankFormat);
          
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
          totalAmount += amount;
          dates.push(date);
          processedCount++;

        } catch (error) {
          console.error(`Error processing row ${i + 2}:`, error);
          errors.push(`Error processing row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Calculate summary
      dates.sort();
      const summary = {
        totalTransactions: transactions.length,
        dateRange: {
          start: dates[0] || '',
          end: dates[dates.length - 1] || ''
        },
        totalAmount,
        duplicates: 0 // Will be calculated separately by duplicate detector
      };

      console.log(`✅ CSV processing complete: ${processedCount} transactions processed, ${errors.length} errors, ${warnings.length} warnings`);

      return {
        transactions,
        bankFormat,
        errors,
        warnings,
        summary
      };

    } catch (error) {
      console.error('❌ Fatal error during CSV processing:', error);
      errors.push(`Fatal processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
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
