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
  rowNumber?: number;
  parseWarnings?: string[];
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
      console.log('📄 Starting comprehensive CSV parsing...');
      
      const normalizedText = csvText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

      if (!normalizedText) {
        throw new Error('CSV file is empty');
      }

      const lines = normalizedText.split('\n');
      console.log(`📊 Found ${lines.length} total lines`);

      // Auto-detect separator by analyzing first few lines
      const detectSeparator = (sampleLines: string[]): string => {
        const separators = [',', ';', '\t', '|'];
        const separatorCounts = separators.map(sep => ({
          separator: sep,
          avgCount: sampleLines.reduce((sum, line) => sum + (line.split(sep).length - 1), 0) / sampleLines.length
        }));
        
        // Find separator with highest average count (and at least 2 columns)
        const bestSeparator = separatorCounts
          .filter(s => s.avgCount >= 1)
          .sort((a, b) => b.avgCount - a.avgCount)[0];
        
        return bestSeparator?.separator || ',';
      };

      const sampleLines = lines.slice(0, Math.min(5, lines.length)).filter(line => line.trim());
      const separator = detectSeparator(sampleLines);
      console.log(`🔍 Detected separator: "${separator === '\t' ? '\\t' : separator}"`);

      const parseCSVLine = (line: string, lineNumber: number): { cells: string[], error?: string } => {
        try {
          if (!line.trim()) {
            return { cells: [] };
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
          
          // Clean up cells - remove surrounding quotes
          const cleanedCells = result.map(cell => {
            if ((cell.startsWith('"') && cell.endsWith('"')) || 
                (cell.startsWith("'") && cell.endsWith("'"))) {
              cell = cell.slice(1, -1);
            }
            return cell.trim();
          });

          return { cells: cleanedCells };
        } catch (error) {
          return { 
            cells: line.split(separator).map(c => c.trim()), 
            error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` 
          };
        }
      };

      // Find header row - be more flexible
      let headerRowIndex = -1;
      let headers: string[] = [];
      
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const parseResult = parseCSVLine(lines[i], i + 1);
        if (parseResult.cells.length >= 2 && parseResult.cells.some(cell => cell.length > 0)) {
          // Check if this looks like a header (contains common header terms)
          const headerTerms = ['date', 'amount', 'description', 'details', 'transaction', 'debit', 'credit', 'balance'];
          const lowerCells = parseResult.cells.map(c => c.toLowerCase());
          const hasHeaderTerms = lowerCells.some(cell => 
            headerTerms.some(term => cell.includes(term))
          );
          
          if (hasHeaderTerms || i === 0) {
            headers = parseResult.cells;
            headerRowIndex = i;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        // If no obvious headers found, use first non-empty row
        for (let i = 0; i < Math.min(3, lines.length); i++) {
          const parseResult = parseCSVLine(lines[i], i + 1);
          if (parseResult.cells.length >= 2) {
            headers = parseResult.cells;
            headerRowIndex = i;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('No valid header row found in first 10 lines');
      }

      console.log(`📋 Headers found at row ${headerRowIndex + 1}: ${headers.join(', ')}`);

      // Parse data rows
      const rows: string[][] = [];
      const skippedRows: SkippedRow[] = [];
      
      for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const rowNumber = i + 1;
        
        // Skip completely empty lines
        if (!line.trim()) {
          continue;
        }

        const parseResult = parseCSVLine(line, rowNumber);
        const cells = parseResult.cells;
        
        // Skip rows with no meaningful data
        if (cells.length === 0 || cells.every(cell => !cell.trim())) {
          continue;
        }

        // Allow rows with fewer columns - pad with empty strings
        while (cells.length < headers.length) {
          cells.push('');
        }

        // Check if row has at least some data in key columns
        const hasAnyData = cells.some(cell => cell.trim().length > 0);
        if (!hasAnyData) {
          continue;
        }

        rows.push(cells);
      }

      console.log(`✅ Comprehensive parsing complete: ${headers.length} headers, ${rows.length} data rows`);
      
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
    
    // Enhanced date patterns supporting multiple formats
    const patterns = [
      // DD/MM/YYYY and DD-MM-YYYY
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy', name: 'DD/MM/YYYY' },
      // MM/DD/YYYY (US format)
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'mdy', name: 'MM/DD/YYYY (US)' },
      // YYYY-MM-DD (ISO format)
      { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd', name: 'YYYY-MM-DD' },
      // DD/MM/YY
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy', name: 'DD/MM/YY' },
      // Compact formats
      { regex: /^(\d{2})(\d{2})(\d{4})$/, type: 'dmy', name: 'DDMMYYYY' },
      { regex: /^(\d{4})(\d{2})(\d{2})$/, type: 'ymd', name: 'YYYYMMDD' }
    ];

    // Try each pattern
    for (const pattern of patterns) {
      const match = cleanDate.match(pattern.regex);
      if (match) {
        try {
          let year: string, month: string, day: string;
          
          if (pattern.type === 'ymd') {
            [, year, month, day] = match;
          } else if (pattern.type === 'mdy') {
            // For ambiguous cases, try both interpretations
            [, month, day, year] = match;
            // If day > 12, assume DD/MM format instead
            if (parseInt(day) > 12 && parseInt(month) <= 12) {
              [day, month] = [month, day];
              warnings.push(`Row ${rowNumber || 'unknown'}: Assumed DD/MM format due to day > 12`);
            }
          } else {
            [, day, month, year] = match;
            if (year.length === 2) {
              const yearNum = parseInt(year);
              year = yearNum > 50 ? `19${year}` : `20${year}`;
            }
          }
          
          // Validate date components
          const dayNum = parseInt(day);
          const monthNum = parseInt(month);
          const yearNum = parseInt(year);
          
          if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
            continue;
          }
          
          // Create and validate actual date
          const dateObj = new Date(yearNum, monthNum - 1, dayNum);
          if (dateObj.getFullYear() === yearNum && 
              dateObj.getMonth() === monthNum - 1 && 
              dateObj.getDate() === dayNum) {
            
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            console.log(`✅ Date parsed as ${pattern.name}: ${formattedDate}`);
            return { date: formattedDate, warnings };
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    // Fallback to JavaScript Date parsing
    try {
      const jsDate = new Date(cleanDate);
      if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() > 1900) {
        warnings.push(`Row ${rowNumber || 'unknown'}: Used fallback date parsing`);
        return { date: jsDate.toISOString().split('T')[0], warnings };
      }
    } catch (error) {
      // Continue to default
    }
    
    warnings.push(`Row ${rowNumber || 'unknown'}: Could not parse date "${cleanDate}", using today`);
    return { date: new Date().toISOString().split('T')[0], warnings };
  }

  private parseAmount(amountString: string, rowNumber?: number): { amount: number, warnings: string[] } {
    const warnings: string[] = [];
    
    if (!amountString?.trim()) {
      return { amount: 0, warnings };
    }
    
    console.log(`💰 Parsing amount: "${amountString}"`);
    
    const original = amountString.trim();
    
    // Remove currency symbols and spaces
    let cleaned = original.replace(/[£$€¥₹\s]/g, '');
    
    // Handle negative amounts - check for brackets or minus sign
    const isNegative = /^\(.*\)$/.test(original) || cleaned.startsWith('-') || original.includes('DR') || original.includes('DEBIT');
    cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '').replace(/DR|DEBIT/gi, '');
    
    // Handle different decimal/thousands separators
    if (cleaned.includes('.') && cleaned.includes(',')) {
      // Both present - assume comma is thousands separator
      cleaned = cleaned.replace(/,/g, '');
    } else if (cleaned.includes(',')) {
      // Only comma - check if it's likely decimal separator
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
      warnings.push(`Row ${rowNumber || 'unknown'}: Could not parse amount "${original}", using 0`);
      return { amount: 0, warnings };
    }
    
    const finalAmount = isNegative ? -Math.abs(numericValue) : numericValue;
    console.log(`✅ Amount parsed: ${finalAmount}`);
    return { amount: finalAmount, warnings };
  }

  private standardizeMerchant(description: string): string {
    if (!description) return '';
    
    const cleaned = description
      .replace(/^(TST\*|SQ \*|AMZN MKTP|PAYPAL \*|POS |ATM |EFTPOS |PURCHASE |PAYMENT |DEBIT |CREDIT )/i, '')
      .replace(/\*\w+$/, '')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s&'-]/g, '')
      .trim();

    const mappings: { [key: string]: string } = {
      'AMZN': 'Amazon', 'AMAZON': 'Amazon',
      'SPOTIFY': 'Spotify', 'NETFLIX': 'Netflix',
      'UBER': 'Uber', 'MCDONALD': 'McDonald\'s',
      'STARBUCKS': 'Starbucks', 'PAYPAL': 'PayPal'
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

    // Expense categorization
    const categories = [
      { pattern: /\b(rent|mortgage|property|utilities|electricity|gas|water|internet|phone|broadband)\b/, category: 'Housing & Utilities', confidence: 0.9 },
      { pattern: /\b(grocery|supermarket|food|fresh|countdown|paknsave|woolworths|coles)\b/, category: 'Groceries', confidence: 0.9 },
      { pattern: /\b(uber|taxi|bus|train|fuel|petrol|gas|parking|transport)\b/, category: 'Transportation', confidence: 0.85 },
      { pattern: /\b(restaurant|cafe|takeaway|delivery|dining|mcdonald|kfc|starbucks)\b/, category: 'Dining Out', confidence: 0.8 },
      { pattern: /\b(netflix|spotify|subscription|entertainment|movie|cinema|games)\b/, category: 'Entertainment', confidence: 0.85 },
      { pattern: /\b(doctor|hospital|pharmacy|medical|health|dental)\b/, category: 'Healthcare', confidence: 0.9 },
      { pattern: /\b(amazon|shopping|retail|clothing|electronics)\b/, category: 'Shopping', confidence: 0.75 },
      { pattern: /\b(insurance|life|car|health|home)\b/, category: 'Insurance', confidence: 0.9 }
    ];

    for (const { pattern, category, confidence } of categories) {
      if (pattern.test(desc)) {
        return { category, confidence };
      }
    }

    return { category: 'Uncategorised', confidence: 0.5 };
  }

  // Enhanced flexible column finding with better scoring
  private findColumnIndex(headers: string[], possibleNames: string[]): { index: number, matchedName?: string, confidence: number } {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
    
    // Score each header against possible names
    const scores = headers.map((header, index) => {
      const normalizedHeader = normalizedHeaders[index];
      let bestScore = 0;
      let matchedName = '';
      
      for (const name of possibleNames) {
        const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Exact match
        if (normalizedHeader === normalizedName) {
          bestScore = Math.max(bestScore, 1.0);
          matchedName = header;
        }
        // Contains match
        else if (normalizedHeader.includes(normalizedName) || normalizedName.includes(normalizedHeader)) {
          const containsScore = Math.min(normalizedName.length, normalizedHeader.length) / 
                               Math.max(normalizedName.length, normalizedHeader.length);
          if (containsScore > bestScore) {
            bestScore = containsScore;
            matchedName = header;
          }
        }
        // Partial word match
        else {
          const words1 = normalizedHeader.split(/\W+/);
          const words2 = normalizedName.split(/\W+/);
          const commonWords = words1.filter(w => words2.includes(w) && w.length > 2);
          if (commonWords.length > 0) {
            const wordScore = commonWords.length / Math.max(words1.length, words2.length) * 0.7;
            if (wordScore > bestScore) {
              bestScore = wordScore;
              matchedName = header;
            }
          }
        }
      }
      
      return { index, score: bestScore, matchedName };
    });
    
    // Find best match
    const bestMatch = scores.reduce((best, current) => 
      current.score > best.score ? current : best, { index: -1, score: 0, matchedName: '' });
    
    if (bestMatch.score > 0.2) { // Lower threshold for more flexibility
      return { index: bestMatch.index, matchedName: bestMatch.matchedName, confidence: bestMatch.score };
    }
    
    return { index: -1, confidence: 0 };
  }

  public async processCSV(csvText: string): Promise<ProcessedCSV> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const transactions: Transaction[] = [];
    const allSkippedRows: SkippedRow[] = [];

    try {
      console.log('🔄 Starting comprehensive flexible CSV processing...');
      
      const { headers, rows, skippedRows } = this.parseCSV(csvText);
      allSkippedRows.push(...skippedRows);
      
      console.log(`📊 Parsed: ${headers.length} headers, ${rows.length} rows`);

      if (rows.length === 0) {
        warnings.push('No data rows found - file may be empty or contain only headers');
        return this.createEmptyResult(errors, warnings, allSkippedRows);
      }

      // Enhanced flexible column mapping with broader search terms
      const findColumnResult = this.findColumnIndex(headers, [
        'date', 'transactiondate', 'postingdate', 'valuedate', 'transdate', 
        'dated', 'transaction_date', 'posting_date', 'value_date', 'dt', 'time'
      ]);
      
      const descriptionColumnResult = this.findColumnIndex(headers, [
        'description', 'details', 'particulars', 'transactiondetails', 'memo', 
        'reference', 'narrative', 'transaction_description', 'desc', 'transaction_type',
        'payee', 'merchant', 'vendor', 'title', 'name', 'transaction'
      ]);
      
      const amountColumnResult = this.findColumnIndex(headers, [
        'amount', 'value', 'debit', 'credit', 'transactionamount', 'sum', 'total',
        'transaction_amount', 'amt', 'balance', 'money', 'cash', 'payment', 'price'
      ]);

      console.log(`📍 Comprehensive column mapping:`);
      console.log(`  Date: ${findColumnResult.index >= 0 ? `${findColumnResult.index} (${findColumnResult.matchedName}, confidence: ${Math.round(findColumnResult.confidence * 100)}%)` : 'NOT FOUND'}`);
      console.log(`  Description: ${descriptionColumnResult.index >= 0 ? `${descriptionColumnResult.index} (${descriptionColumnResult.matchedName}, confidence: ${Math.round(descriptionColumnResult.confidence * 100)}%)` : 'NOT FOUND'}`);
      console.log(`  Amount: ${amountColumnResult.index >= 0 ? `${amountColumnResult.index} (${amountColumnResult.matchedName}, confidence: ${Math.round(amountColumnResult.confidence * 100)}%)` : 'NOT FOUND'}`);

      // Very flexible requirements - proceed if we have at least 1 of 3 key columns
      const foundColumns = [findColumnResult, descriptionColumnResult, amountColumnResult].filter(col => col.index >= 0);
      if (foundColumns.length === 0) {
        errors.push(`Cannot find any recognizable columns. Available columns: ${headers.join(', ')}`);
        return this.createEmptyResult(errors, warnings, allSkippedRows);
      }

      // Process ALL rows with maximum fault tolerance
      let processedCount = 0;
      const dates: string[] = [];
      const rowWarnings: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;
        
        try {
          // Extract data with fallbacks - be very permissive
          const rawDate = findColumnResult.index >= 0 ? row[findColumnResult.index]?.trim() || '' : '';
          const description = descriptionColumnResult.index >= 0 ? row[descriptionColumnResult.index]?.trim() || '' : '';
          const rawAmount = amountColumnResult.index >= 0 ? row[amountColumnResult.index]?.trim() || '' : '';

          console.log(`🔍 Processing row ${rowNumber}: date="${rawDate}", desc="${description}", amount="${rawAmount}"`);

          // Very permissive - only skip if ALL fields are completely empty
          if (!rawDate && !description && !rawAmount && row.every(cell => !cell?.trim())) {
            continue; // Skip completely empty rows silently
          }

          // Parse with maximum tolerance
          const { date, warnings: dateParseWarnings } = this.parseDate(rawDate, undefined, rowNumber);
          const { amount, warnings: amountParseWarnings } = this.parseAmount(rawAmount, rowNumber);
          
          rowWarnings.push(...dateParseWarnings, ...amountParseWarnings);

          // Generate meaningful description if missing
          let finalDescription = description || `Transaction ${rowNumber}`;
          if (!description && rawAmount) {
            finalDescription = `Transaction of ${rawAmount}`;
          }
          if (!description && rawDate) {
            finalDescription = `Transaction on ${rawDate}`;
          }
          
          const merchant = this.standardizeMerchant(finalDescription);
          const { category, confidence } = this.categorizeTransaction(finalDescription, amount);

          const transaction: Transaction = {
            id: this.generateTransactionId(date, amount, finalDescription),
            date,
            amount: Math.abs(amount),
            description: finalDescription.substring(0, 200),
            merchant,
            category,
            isIncome: amount > 0,
            confidence,
            rowNumber,
            parseWarnings: [...dateParseWarnings, ...amountParseWarnings]
          };

          transactions.push(transaction);
          dates.push(date);
          processedCount++;

          console.log(`✅ Row ${rowNumber}: ${transaction.isIncome ? '+' : '-'}$${transaction.amount} - ${transaction.category}`);

        } catch (rowError: any) {
          console.warn(`⚠️ Row ${rowNumber} soft error (continuing):`, rowError);
          // Don't add to skipped rows for soft errors - just log and continue
          const simpleAmount = row.find(cell => /[\d\.\,\-\$£€]/.test(cell || '')) || '0';
          const simpleDesc = row.find(cell => (cell || '').length > 3) || `Row ${rowNumber}`;
          
          try {
            // Attempt recovery with simplified parsing
            const recoveredAmount = parseFloat(simpleAmount.replace(/[^\d\.\-]/g, '')) || 0;
            const recoveredTransaction: Transaction = {
              id: this.generateTransactionId(new Date().toISOString().split('T')[0], recoveredAmount, simpleDesc),
              date: new Date().toISOString().split('T')[0],
              amount: Math.abs(recoveredAmount),
              description: `Recovered: ${simpleDesc}`.substring(0, 200),
              merchant: simpleDesc.split(' ')[0] || 'Unknown',
              category: 'Uncategorised',
              isIncome: recoveredAmount > 0,
              confidence: 0.3,
              rowNumber,
              parseWarnings: [`Row ${rowNumber}: Recovered from parsing error`]
            };
            
            transactions.push(recoveredTransaction);
            processedCount++;
            rowWarnings.push(`Row ${rowNumber}: Used error recovery parsing`);
            
          } catch (recoveryError) {
            allSkippedRows.push({
              rowNumber,
              data: row,
              reason: `Processing error: ${rowError.message}`,
              suggestions: ['Check data format', 'Verify column alignment']
            });
          }
        }
      }

      warnings.push(...rowWarnings);

      // Calculate summary
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
        duplicates: 0,
        successRate
      };

      console.log(`✅ Comprehensive processing complete:`);
      console.log(`  📊 Success rate: ${successRate.toFixed(1)}%`);
      console.log(`  ✅ Processed: ${processedCount} transactions`);
      console.log(`  ⚠️ Skipped: ${allSkippedRows.length} rows`);
      console.log(`  🗓️ Date range: ${summary.dateRange.start} to ${summary.dateRange.end}`);

      return {
        transactions,
        skippedRows: allSkippedRows,
        bankFormat: null, // Could be enhanced later
        errors,
        warnings,
        summary
      };

    } catch (error: any) {
      console.error('❌ Processing error:', error);
      errors.push(`Processing failed: ${error.message}`);
      
      return this.createEmptyResult(errors, warnings, allSkippedRows);
    }
  }

  public createEmptyResult(errors: string[], warnings: string[], skippedRows: SkippedRow[]): ProcessedCSV {
    return {
      transactions: [],
      skippedRows,
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
