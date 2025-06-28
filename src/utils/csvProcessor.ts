
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
  rowNumber?: number; // Track original row for debugging
  parseWarnings?: string[]; // Track any parsing issues
}

export interface SkippedRow {
  rowNumber: number;
  data: string[];
  reason: string;
  suggestions?: string[];
}

export interface ProcessedCSV {
  transactions: Transaction[];
  skippedRows: SkippedRow[];
  bankFormat: BankFormat | null;
  errors: string[];
  warnings: string[];
  summary: {
    totalRows: number;
    totalTransactions: number;
    dateRange: { start: string; end: string };
    totalAmount: number;
    duplicates: number;
    successRate: number;
  };
}

export class CSVProcessor {
  private generateTransactionId(date: string, amount: number, description: string): string {
    const hash = btoa(`${date}-${amount}-${description}`).replace(/[^a-zA-Z0-9]/g, '');
    return `txn_${hash.substring(0, 12)}`;
  }

  private parseCSV(csvText: string): { headers: string[], rows: string[][], skippedRows: SkippedRow[] } {
    try {
      console.log('📄 Starting CSV parsing...');
      
      // Handle different line endings and clean up
      const normalizedText = csvText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

      if (!normalizedText) {
        throw new Error('CSV file is empty');
      }

      // Split into lines and filter out completely empty lines
      const lines = normalizedText.split('\n').filter(line => line.trim().length > 0);
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      console.log(`📊 Found ${lines.length} non-empty lines`);

      const parseCSVLine = (line: string, lineNumber: number): { cells: string[], error?: string } => {
        try {
          // Handle different separators (comma, semicolon, tab)
          let separator = ',';
          if (line.includes(';') && line.split(';').length > line.split(',').length) {
            separator = ';';
          } else if (line.includes('\t') && line.split('\t').length > line.split(',').length) {
            separator = '\t';
          }

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
                i++; // Skip next quote
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
          
          // Clean up cells
          const cleanedCells = result.map(cell => {
            // Remove surrounding quotes if they exist
            if ((cell.startsWith('"') && cell.endsWith('"')) || 
                (cell.startsWith("'") && cell.endsWith("'"))) {
              cell = cell.slice(1, -1);
            }
            return cell.trim();
          });

          return { cells: cleanedCells };
        } catch (error) {
          return { 
            cells: line.split(',').map(c => c.trim()), 
            error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` 
          };
        }
      };

      // Parse header
      const headerResult = parseCSVLine(lines[0], 1);
      if (headerResult.error) {
        throw new Error(`Header parsing failed: ${headerResult.error}`);
      }
      const headers = headerResult.cells;
      
      console.log(`📋 Headers found: ${headers.join(', ')}`);

      // Parse data rows
      const rows: string[][] = [];
      const skippedRows: SkippedRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const rowNumber = i + 1;
        
        // Skip obviously empty rows
        if (!line.trim() || line.trim() === ',' || line.trim() === ';;') {
          skippedRows.push({
            rowNumber,
            data: [line],
            reason: 'Empty row',
            suggestions: ['Remove empty rows from CSV']
          });
          continue;
        }

        const parseResult = parseCSVLine(line, rowNumber);
        const cells = parseResult.cells;
        
        // Check for minimum data requirements
        if (cells.length === 0) {
          skippedRows.push({
            rowNumber,
            data: [line],
            reason: 'No data found in row',
            suggestions: ['Check CSV formatting']
          });
          continue;
        }

        // Check if row has significantly fewer columns than header
        if (cells.length < headers.length - 2) {
          skippedRows.push({
            rowNumber,
            data: cells,
            reason: `Too few columns (${cells.length} vs ${headers.length} expected)`,
            suggestions: ['Check for missing commas or data', 'Verify CSV format consistency']
          });
          continue;
        }

        // Pad row with empty strings if needed
        while (cells.length < headers.length) {
          cells.push('');
        }

        // Check if row has any non-empty data
        if (cells.every(cell => !cell.trim())) {
          skippedRows.push({
            rowNumber,
            data: cells,
            reason: 'All cells are empty',
            suggestions: ['Remove empty data rows']
          });
          continue;
        }

        rows.push(cells);
      }

      console.log(`✅ Parsed: ${headers.length} headers, ${rows.length} data rows, ${skippedRows.length} skipped rows`);
      
      return { headers, rows, skippedRows };
    } catch (error) {
      console.error('❌ CSV parsing error:', error);
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseDate(dateString: string, format?: BankFormat, rowNumber?: number): { date: string, warnings: string[] } {
    const warnings: string[] = [];
    
    if (!dateString?.trim()) {
      warnings.push(`Row ${rowNumber || 'unknown'}: Empty date, using today`);
      return { date: new Date().toISOString().split('T')[0], warnings };
    }
    
    const cleanDate = dateString.trim();
    
    console.log(`🗓️ Parsing date: "${cleanDate}"`);
    
    // Common date patterns with more flexibility
    const patterns = [
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy', name: 'DD/MM/YYYY' },
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy', name: 'DD/MM/YY' },
      { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd', name: 'YYYY/MM/DD' },
      { regex: /^(\d{2})(\d{2})(\d{4})$/, type: 'dmy', name: 'DDMMYYYY' },
      { regex: /^(\d{4})(\d{2})(\d{2})$/, type: 'ymd', name: 'YYYYMMDD' },
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, type: 'mdy', name: 'MM/DD/YYYY (US)' }
    ];

    for (const pattern of patterns) {
      const match = cleanDate.match(pattern.regex);
      if (match) {
        try {
          let year: string, month: string, day: string;
          
          if (pattern.type === 'ymd') {
            [, year, month, day] = match;
          } else if (pattern.type === 'mdy') {
            [, month, day, year] = match;
          } else {
            [, day, month, year] = match;
            if (year.length === 2) {
              const yearNum = parseInt(year);
              year = yearNum > 50 ? `19${year}` : `20${year}`;
              warnings.push(`Row ${rowNumber || 'unknown'}: Assumed 20th century for year ${yearNum}`);
            }
          }
          
          // Validate date components
          const dayNum = parseInt(day);
          const monthNum = parseInt(month);
          const yearNum = parseInt(year);
          
          if (monthNum < 1 || monthNum > 12) {
            warnings.push(`Row ${rowNumber || 'unknown'}: Invalid month ${monthNum}`);
            continue;
          }
          
          if (dayNum < 1 || dayNum > 31) {
            warnings.push(`Row ${rowNumber || 'unknown'}: Invalid day ${dayNum}`);
            continue;
          }
          
          if (yearNum < 1900 || yearNum > 2100) {
            warnings.push(`Row ${rowNumber || 'unknown'}: Unusual year ${yearNum}`);
          }
          
          // Create and validate date
          const dateObj = new Date(yearNum, monthNum - 1, dayNum);
          if (dateObj.getFullYear() === yearNum && 
              dateObj.getMonth() === monthNum - 1 && 
              dateObj.getDate() === dayNum) {
            console.log(`✅ Date parsed as ${pattern.name}: ${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
            return { 
              date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`, 
              warnings 
            };
          }
        } catch (error) {
          warnings.push(`Row ${rowNumber || 'unknown'}: Date parsing error with pattern ${pattern.name}`);
          continue;
        }
      }
    }
    
    // Try JavaScript Date parsing as fallback
    try {
      const jsDate = new Date(cleanDate);
      if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() > 1900) {
        warnings.push(`Row ${rowNumber || 'unknown'}: Used fallback date parsing`);
        return { date: jsDate.toISOString().split('T')[0], warnings };
      }
    } catch (error) {
      // Ignore
    }
    
    warnings.push(`Row ${rowNumber || 'unknown'}: Could not parse date "${cleanDate}", using today`);
    return { date: new Date().toISOString().split('T')[0], warnings };
  }

  private parseAmount(amountString: string, rowNumber?: number): { amount: number, warnings: string[] } {
    const warnings: string[] = [];
    
    if (!amountString?.trim()) {
      warnings.push(`Row ${rowNumber || 'unknown'}: Empty amount, using 0`);
      return { amount: 0, warnings };
    }
    
    console.log(`💰 Parsing amount: "${amountString}"`);
    
    // Remove currency symbols, spaces, and commas
    let cleaned = amountString.replace(/[£$€¥₹,\s]/g, '').trim();
    
    // Handle negative amounts in brackets or with minus
    const isNegative = /^\(.*\)$/.test(amountString) || cleaned.startsWith('-');
    cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '');
    
    // Handle different decimal separators
    if (cleaned.includes('.') && cleaned.includes(',')) {
      // Assume comma is thousands separator if both present
      cleaned = cleaned.replace(/,/g, '');
    } else if (cleaned.includes(',')) {
      // Check if comma is likely decimal separator
      const commaIndex = cleaned.lastIndexOf(',');
      const afterComma = cleaned.substring(commaIndex + 1);
      if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
        // Likely decimal separator
        cleaned = cleaned.replace(',', '.');
      } else {
        // Likely thousands separator
        cleaned = cleaned.replace(/,/g, '');
      }
    }
    
    const numericValue = parseFloat(cleaned);
    if (isNaN(numericValue)) {
      warnings.push(`Row ${rowNumber || 'unknown'}: Could not parse amount "${amountString}", using 0`);
      return { amount: 0, warnings };
    }
    
    const finalAmount = isNegative ? -Math.abs(numericValue) : numericValue;
    console.log(`✅ Amount parsed: ${finalAmount}`);
    return { amount: finalAmount, warnings };
  }

  private standardizeMerchant(description: string): string {
    if (!description) return '';
    
    // Clean up common bank prefixes and suffixes
    const cleaned = description
      .replace(/^(TST\*|SQ \*|AMZN MKTP|PAYPAL \*|POS |ATM |EFTPOS |PURCHASE |PAYMENT |DEBIT |CREDIT )/i, '')
      .replace(/\*\w+$/, '')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s&'-]/g, '')
      .trim();

    // Common merchant mappings
    const mappings: { [key: string]: string } = {
      'AMZN': 'Amazon', 'AMAZON': 'Amazon',
      'SPOTIFY': 'Spotify', 'NETFLIX': 'Netflix',
      'UBER': 'Uber', 'MCDONALD': 'McDonald\'s',
      'STARBUCKS': 'Starbucks', 'PAYPAL': 'PayPal',
      'COUNTDOWN': 'Countdown', 'PAKNSAVE': 'Pak\'nSave',
      'NEWWORLD': 'New World'
    };

    const upperCleaned = cleaned.toUpperCase();
    for (const [pattern, merchant] of Object.entries(mappings)) {
      if (upperCleaned.includes(pattern)) {
        return merchant;
      }
    }

    return cleaned || description.substring(0, 50);
  }

  private categorizeTransaction(description: string, amount: number): { category: string; confidence: number } {
    if (!description) {
      return { category: 'Uncategorised', confidence: 0.3 };
    }

    const desc = description.toLowerCase();
    
    // Income detection
    if (amount > 0) {
      if (/\b(salary|wage|payroll|pay|employment|income)\b/.test(desc)) 
        return { category: 'Salary', confidence: 0.95 };
      if (/\b(dividend|interest|investment|return)\b/.test(desc)) 
        return { category: 'Investment Income', confidence: 0.9 };
      if (/\b(refund|reimbursement|cashback|credit)\b/.test(desc)) 
        return { category: 'Refunds', confidence: 0.85 };
      return { category: 'Other Income', confidence: 0.7 };
    }

    // Expense categorization with more patterns
    const categories = [
      { pattern: /\b(rent|mortgage|property|utilities|electricity|gas|water|internet|phone|broadband)\b/, category: 'Housing & Utilities', confidence: 0.9 },
      { pattern: /\b(countdown|paknsave|pak.n.save|newworld|new.world|woolworths|coles|grocery|supermarket|food|fresh.choice)\b/, category: 'Groceries', confidence: 0.9 },
      { pattern: /\b(uber|taxi|bus|train|fuel|petrol|gas|parking|transport|bp|z.energy|mobil)\b/, category: 'Transportation', confidence: 0.85 },
      { pattern: /\b(restaurant|cafe|takeaway|delivery|dining|mcdonald|kfc|starbucks|domino|pizza)\b/, category: 'Dining Out', confidence: 0.8 },
      { pattern: /\b(netflix|spotify|subscription|entertainment|movie|cinema|games|steam)\b/, category: 'Entertainment', confidence: 0.85 },
      { pattern: /\b(doctor|hospital|pharmacy|medical|health|dental|chemist)\b/, category: 'Healthcare', confidence: 0.9 },
      { pattern: /\b(amazon|shopping|retail|clothing|electronics|warehouse|trademe|harvey.norman)\b/, category: 'Shopping', confidence: 0.75 },
      { pattern: /\b(insurance|life|car|health|home|aia|southern.cross)\b/, category: 'Insurance', confidence: 0.9 },
      { pattern: /\b(transfer|payment|loan|credit|atm|withdrawal|ird|tax)\b/, category: 'Transfers', confidence: 0.7 }
    ];

    for (const { pattern, category, confidence } of categories) {
      if (pattern.test(desc)) {
        return { category, confidence };
      }
    }

    return { category: 'Uncategorised', confidence: 0.5 };
  }

  public async processCSV(csvText: string): Promise<ProcessedCSV> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const transactions: Transaction[] = [];
    const allSkippedRows: SkippedRow[] = [];

    try {
      console.log('🔄 Starting enhanced CSV processing...');
      
      const { headers, rows, skippedRows } = this.parseCSV(csvText);
      allSkippedRows.push(...skippedRows);
      
      console.log(`📊 After parsing: ${headers.length} headers, ${rows.length} rows, ${skippedRows.length} initially skipped`);

      if (rows.length === 0) {
        throw new Error('No valid data rows found in CSV file after parsing');
      }

      // Detect bank format with sample data
      const sampleData = rows.slice(0, Math.min(5, rows.length));
      const bankFormat = detectBankFormat(headers, sampleData);
      
      if (bankFormat) {
        console.log(`✅ Bank format detected: ${bankFormat.name} (${Math.round(bankFormat.confidence * 100)}% confidence)`);
      } else {
        console.log('⚠️ No specific bank format detected, using flexible parsing');
        warnings.push('Could not detect specific bank format - using generic column mapping');
      }

      // Enhanced column finding with flexible matching
      const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z]/g, ''));
      
      const findColumnIndex = (possibleNames: string[]): { index: number, matchedName?: string } => {
        for (const name of possibleNames) {
          const normalizedName = name.toLowerCase().replace(/[^a-z]/g, '');
          
          // Exact match first
          const exactIndex = normalizedHeaders.findIndex(h => h === normalizedName);
          if (exactIndex >= 0) {
            return { index: exactIndex, matchedName: headers[exactIndex] };
          }
          
          // Partial match
          const partialIndex = normalizedHeaders.findIndex(h => 
            h.includes(normalizedName) || normalizedName.includes(h)
          );
          if (partialIndex >= 0) {
            return { index: partialIndex, matchedName: headers[partialIndex] };
          }
        }
        return { index: -1 };
      };

      const dateResult = findColumnIndex(['date', 'transactiondate', 'postingdate', 'valuedate', 'transdate', 'dated']);
      const descResult = findColumnIndex(['description', 'details', 'particulars', 'transactiondetails', 'memo', 'reference', 'narrative']);
      const amountResult = findColumnIndex(['amount', 'value', 'debit', 'credit', 'transactionamount', 'balance', 'sum', 'total']);

      console.log(`📍 Column mapping:`);
      console.log(`  Date: ${dateResult.index >= 0 ? `${dateResult.index} (${dateResult.matchedName})` : 'NOT FOUND'}`);
      console.log(`  Description: ${descResult.index >= 0 ? `${descResult.index} (${descResult.matchedName})` : 'NOT FOUND'}`);
      console.log(`  Amount: ${amountResult.index >= 0 ? `${amountResult.index} (${amountResult.matchedName})` : 'NOT FOUND'}`);

      // Check for required columns
      const missingColumns = [];
      if (dateResult.index === -1) missingColumns.push('date');
      if (descResult.index === -1) missingColumns.push('description');
      if (amountResult.index === -1) missingColumns.push('amount');

      if (missingColumns.length > 0) {
        const suggestion = `Available columns: ${headers.join(', ')}`;
        throw new Error(`Required columns not found: ${missingColumns.join(', ')}. ${suggestion}`);
      }

      // Process transactions with detailed tracking
      let processedCount = 0;
      const dates: string[] = [];
      const rowWarnings: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because we start from row 1 and skip header
        
        try {
          const rawDate = row[dateResult.index]?.trim();
          const description = row[descResult.index]?.trim();
          const rawAmount = row[amountResult.index]?.trim();

          console.log(`🔍 Processing row ${rowNumber}: date="${rawDate}", desc="${description}", amount="${rawAmount}"`);

          // Check for completely empty required fields
          if (!rawDate && !description && !rawAmount) {
            allSkippedRows.push({
              rowNumber,
              data: row,
              reason: 'All required fields are empty',
              suggestions: ['Remove empty rows', 'Ensure data is in correct columns']
            });
            continue;
          }

          // Check individual required fields
          const missingFields = [];
          if (!rawDate) missingFields.push('date');
          if (!description) missingFields.push('description');
          if (!rawAmount) missingFields.push('amount');

          if (missingFields.length > 0) {
            allSkippedRows.push({
              rowNumber,
              data: row,
              reason: `Missing required fields: ${missingFields.join(', ')}`,
              suggestions: ['Check data alignment with column headers', 'Ensure all required fields have values']
            });
            continue;
          }

          // Parse date with warnings
          const dateResult = this.parseDate(rawDate, bankFormat, rowNumber);
          const date = dateResult.date;
          rowWarnings.push(...dateResult.warnings);

          // Parse amount with warnings
          const amountResult = this.parseAmount(rawAmount, rowNumber);
          const amount = amountResult.amount;
          rowWarnings.push(...amountResult.warnings);

          // Skip zero amounts only if original string suggests it should be zero
          if (amount === 0 && rawAmount !== '0' && rawAmount !== '0.00' && rawAmount !== '0,00') {
            allSkippedRows.push({
              rowNumber,
              data: row,
              reason: `Could not parse amount: "${rawAmount}"`,
              suggestions: ['Check amount format', 'Ensure proper decimal/thousands separators']
            });
            continue;
          }

          const merchant = this.standardizeMerchant(description);
          const { category, confidence } = this.categorizeTransaction(description, amount);

          const transaction: Transaction = {
            id: this.generateTransactionId(date, amount, description),
            date,
            amount: Math.abs(amount),
            description: description.substring(0, 200), // Limit description length
            merchant,
            category,
            isIncome: amount > 0,
            confidence,
            rowNumber,
            parseWarnings: dateResult.warnings.concat(amountResult.warnings)
          };

          transactions.push(transaction);
          dates.push(date);
          processedCount++;

          console.log(`✅ Row ${rowNumber}: ${transaction.isIncome ? '+' : '-'}$${transaction.amount} - ${transaction.category} (${Math.round(confidence * 100)}%)`);

        } catch (rowError: any) {
          console.error(`❌ Row ${rowNumber} error:`, rowError);
          allSkippedRows.push({
            rowNumber,
            data: row,
            reason: `Processing error: ${rowError.message}`,
            suggestions: ['Check data format', 'Verify CSV structure']
          });
        }
      }

      // Add row-level warnings to main warnings
      warnings.push(...rowWarnings);

      // Calculate comprehensive summary
      dates.sort();
      const totalAmount = transactions.reduce((sum, t) => sum + (t.isIncome ? t.amount : -t.amount), 0);
      const successRate = rows.length > 0 ? (processedCount / rows.length) * 100 : 0;
      
      const summary = {
        totalRows: rows.length,
        totalTransactions: transactions.length,
        dateRange: {
          start: dates[0] || '',
          end: dates[dates.length - 1] || ''
        },
        totalAmount,
        duplicates: 0, // TODO: Implement duplicate detection
        successRate
      };

      console.log(`✅ Processing complete:`);
      console.log(`  📊 Success rate: ${successRate.toFixed(1)}%`);
      console.log(`  ✅ Processed: ${processedCount} transactions`);
      console.log(`  ⚠️ Skipped: ${allSkippedRows.length} rows`);
      console.log(`  🗓️ Date range: ${summary.dateRange.start} to ${summary.dateRange.end}`);
      console.log(`  💰 Net amount: $${totalAmount.toFixed(2)}`);

      return {
        transactions,
        skippedRows: allSkippedRows,
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
        skippedRows: allSkippedRows,
        bankFormat: null,
        errors,
        warnings,
        summary: { 
          totalRows: 0, 
          totalTransactions: 0, 
          dateRange: { start: '', end: '' }, 
          totalAmount: 0, 
          duplicates: 0,
          successRate: 0
        }
      };
    }
  }
}
