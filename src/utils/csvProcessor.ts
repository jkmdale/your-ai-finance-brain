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

  private parseDate(dateString: string, format: BankFormat): string {
    const cleanDate = dateString.trim();
    
    // Handle various date formats
    const datePatterns = [
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
      /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, // YYYY/MM/DD
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,  // DD/MM/YY
    ];

    for (const pattern of datePatterns) {
      const match = cleanDate.match(pattern);
      if (match) {
        let [, part1, part2, part3] = match;
        
        // Determine if it's DD/MM/YYYY or MM/DD/YYYY based on format
        if (format.country === 'US' && parseInt(part1) <= 12) {
          // US format: MM/DD/YYYY
          const month = part1.padStart(2, '0');
          const day = part2.padStart(2, '0');
          const year = part3.length === 2 ? `20${part3}` : part3;
          return `${year}-${month}-${day}`;
        } else {
          // Other formats: DD/MM/YYYY
          const day = part1.padStart(2, '0');
          const month = part2.padStart(2, '0');
          const year = part3.length === 2 ? `20${part3}` : part3;
          return `${year}-${month}-${day}`;
        }
      }
    }
    
    // Fallback to current date if parsing fails
    return new Date().toISOString().split('T')[0];
  }

  private parseAmount(amountString: string, format: BankFormat): number {
    if (!amountString) return 0;
    
    const cleanAmount = amountString
      .replace(/[£$€,\s]/g, '') // Remove currency symbols and spaces
      .trim();
    
    // Handle negative amounts in brackets
    const isNegative = format.patterns.negativePattern.test(amountString) || 
                      cleanAmount.startsWith('-');
    
    const numericValue = parseFloat(cleanAmount.replace(/[^\d.-]/g, ''));
    
    return isNaN(numericValue) ? 0 : (isNegative ? -Math.abs(numericValue) : numericValue);
  }

  private standardizeMerchant(description: string): string {
    // Remove common bank prefixes and codes
    const cleanDescription = description
      .replace(/^(TST\*|SQ \*|AMZN MKTP|PAYPAL \*)/i, '')
      .replace(/\*\w+$/, '') // Remove trailing reference codes
      .replace(/\s+/g, ' ')
      .trim();

    // Common merchant mappings
    const merchantMappings: { [key: string]: string } = {
      'AMZN': 'Amazon',
      'SPOTIFY': 'Spotify',
      'NETFLIX': 'Netflix',
      'UBER': 'Uber',
      'COUNTDOWN': 'Countdown',
      'PAKNSAVE': 'Pak\'nSave',
      'NEWWORLD': 'New World'
    };

    for (const [pattern, merchant] of Object.entries(merchantMappings)) {
      if (cleanDescription.toUpperCase().includes(pattern)) {
        return merchant;
      }
    }

    return cleanDescription;
  }

  private categorizeTransaction(description: string, amount: number): { category: string; confidence: number } {
    const desc = description.toLowerCase();
    
    // Income patterns
    if (amount > 0 || /salary|wage|payroll|deposit|refund|dividend|interest/.test(desc)) {
      if (/salary|wage|payroll/.test(desc)) return { category: 'Salary', confidence: 0.95 };
      if (/dividend|interest/.test(desc)) return { category: 'Investment Income', confidence: 0.9 };
      return { category: 'Other Income', confidence: 0.8 };
    }

    // Expense categories with confidence scoring
    const categories = [
      { pattern: /rent|mortgage|property|utilities|electricity|gas|water|internet|phone/, category: 'Housing', confidence: 0.9 },
      { pattern: /countdown|paknsave|newworld|grocery|supermarket|food|dining/, category: 'Groceries', confidence: 0.9 },
      { pattern: /uber|taxi|bus|train|fuel|gas|parking|transport/, category: 'Transportation', confidence: 0.85 },
      { pattern: /restaurant|cafe|takeaway|delivery|dining/, category: 'Dining Out', confidence: 0.8 },
      { pattern: /netflix|spotify|subscription|entertainment/, category: 'Entertainment', confidence: 0.85 },
      { pattern: /doctor|hospital|pharmacy|medical|health/, category: 'Healthcare', confidence: 0.9 },
      { pattern: /amazon|shopping|retail|clothing|electronics/, category: 'Shopping', confidence: 0.75 },
    ];

    for (const { pattern, category, confidence } of categories) {
      if (pattern.test(desc)) {
        return { category, confidence };
      }
    }

    return { category: 'Other', confidence: 0.5 };
  }

  public async processCSV(csvText: string): Promise<ProcessedCSV> {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const transactions: Transaction[] = [];

    // Get sample data for format detection
    const sampleData = lines.slice(1, 6).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    );

    // Detect bank format
    const bankFormat = detectBankFormat(headers, sampleData);
    
    if (!bankFormat) {
      errors.push('Unable to detect bank format. Please check your CSV file format.');
      return {
        transactions: [],
        bankFormat: null,
        errors,
        warnings,
        summary: {
          totalTransactions: 0,
          dateRange: { start: '', end: '' },
          totalAmount: 0,
          duplicates: 0
        }
      };
    }

    // Find column indices
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    const dateIndex = normalizedHeaders.findIndex(h => 
      bankFormat.headers.date.some(dateHeader => h.includes(dateHeader.toLowerCase()))
    );
    const descIndex = normalizedHeaders.findIndex(h => 
      bankFormat.headers.description.some(descHeader => h.includes(descHeader.toLowerCase()))
    );
    const amountIndex = normalizedHeaders.findIndex(h => 
      bankFormat.headers.amount.some(amountHeader => h.includes(amountHeader.toLowerCase()))
    );

    if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
      errors.push('Required columns (date, description, amount) not found in CSV.');
      return {
        transactions: [],
        bankFormat,
        errors,
        warnings,
        summary: {
          totalTransactions: 0,
          dateRange: { start: '', end: '' },
          totalAmount: 0,
          duplicates: 0
        }
      };
    }

    // Process transactions
    let totalAmount = 0;
    const dates: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length < 3 || values.every(v => !v)) continue;

      try {
        const rawDate = values[dateIndex] || '';
        const description = values[descIndex] || '';
        const rawAmount = values[amountIndex] || '0';

        if (!rawDate || !description) {
          warnings.push(`Skipping incomplete transaction on line ${i + 1}`);
          continue;
        }

        const date = this.parseDate(rawDate, bankFormat);
        const amount = this.parseAmount(rawAmount, bankFormat);
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

      } catch (error) {
        errors.push(`Error processing line ${i + 1}: ${error}`);
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
      duplicates: 0 // Will be calculated in duplicate detection phase
    };

    return {
      transactions,
      bankFormat,
      errors,
      warnings,
      summary
    };
  }
}
