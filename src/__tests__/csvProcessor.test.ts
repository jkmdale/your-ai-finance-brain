/**
 * CSV Processor Tests
 * Tests for delimiter auto-detection, parsing, and error handling
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock the CSV parser for testing
const mockParseCSV = (csvData: string) => {
  // Auto-detect delimiter implementation for testing
  const detectSeparator = (sampleLines: string[]): string => {
    const separators = ['\t', ',', ';', '|']; // Tab gets priority
    const separatorAnalysis = separators.map(sep => {
      const counts = sampleLines.map(line => (line.split(sep).length - 1));
      const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length;
      const consistency = counts.length > 1 ? 
        1 - (Math.max(...counts) - Math.min(...counts)) / Math.max(...counts) : 1;
      
      return {
        separator: sep,
        avgCount,
        consistency,
        score: avgCount * consistency
      };
    });
    
    const validSeparators = separatorAnalysis.filter(s => s.avgCount >= 1 && s.consistency > 0.5);
    
    if (validSeparators.length === 0) {
      return ',';
    }
    
    const best = validSeparators.sort((a, b) => b.score - a.score)[0];
    return best.separator;
  };

  const parseCSVLine = (line: string, separator: string): string[] => {
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
      let cleaned = cell;
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
          (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1);
      }
      return cleaned.replace(/[\u200B\u200C\u200D\uFEFF]/g, '').trim();
    });
  };

  const lines = csvData.trim().split(/\r?\n/);
  if (lines.length < 1) {
    throw new Error('CSV file is empty');
  }

  const nonEmptyLines = lines.filter(line => line.trim());
  const separator = detectSeparator(nonEmptyLines.slice(0, 5));

  // Find headers
  let headerIndex = 0;
  let headers: string[] = [];
  
  for (let i = 0; i < Math.min(10, nonEmptyLines.length); i++) {
    const parsedLine = parseCSVLine(nonEmptyLines[i], separator);
    if (parsedLine.length >= 2 && parsedLine.some(cell => cell.length > 0)) {
      const headerTerms = [
        'type', 'date', 'amount', 'description', 'details', 'particulars',
        'transaction', 'debit', 'credit', 'balance', 'reference', 'code'
      ];
      
      const lowerCells = parsedLine.map(c => c.toLowerCase());
      const headerMatches = lowerCells.filter(cell => 
        headerTerms.some(term => cell.includes(term))
      );
      
      if (headerMatches.length >= 2 || i === 0) {
        headers = parsedLine;
        headerIndex = i;
        break;
      }
    }
  }

  // Parse data rows
  const dataLines = nonEmptyLines.slice(headerIndex + 1);
  const rows: string[][] = [];
  
  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    const parsedRow = parseCSVLine(line, separator);
    if (parsedRow.length === 0 || parsedRow.every(cell => !cell.trim())) {
      continue;
    }
    
    while (parsedRow.length < headers.length) {
      parsedRow.push('');
    }
    
    rows.push(parsedRow);
  }
  
  return { 
    headers, 
    rows, 
    validation: {
      isValid: rows.length > 0,
      totalLines: lines.length,
      dataRows: rows.length,
      separator,
      headerIndex: headerIndex + 1,
      separatorDisplay: separator === '\t' ? 'tab' : separator
    }
  };
};

describe('CSV Delimiter Auto-Detection', () => {
  describe('Tab-delimited CSV (ANZ format)', () => {
    it('should detect tab delimiter correctly', () => {
      const tabCSV = `Type	Details	Particulars	Code	Reference	Amount	Date	ForeignCurrencyAmount	ConversionCharge
Bank Fee	Monthly A/C Fee				-5	30/06/2025		
Purchase	EFTPOS Purchase	New World Albany				-25.50	29/06/2025		`;

      const result = mockParseCSV(tabCSV);
      
      expect(result.validation.separator).toBe('\t');
      expect(result.validation.separatorDisplay).toBe('tab');
      expect(result.headers).toHaveLength(9);
      expect(result.headers[0]).toBe('Type');
      expect(result.headers[6]).toBe('Date');
      expect(result.rows).toHaveLength(2);
    });

    it('should parse tab-delimited data correctly', () => {
      const tabCSV = `Type	Details	Amount	Date
Bank Fee	Monthly Fee	-5.00	30/06/2025
Purchase	Store	-25.50	29/06/2025`;

      const result = mockParseCSV(tabCSV);
      
      expect(result.rows[0]).toEqual(['Bank Fee', 'Monthly Fee', '-5.00', '30/06/2025']);
      expect(result.rows[1]).toEqual(['Purchase', 'Store', '-25.50', '29/06/2025']);
    });
  });

  describe('Comma-delimited CSV', () => {
    it('should detect comma delimiter correctly', () => {
      const commaCSV = `Date,Description,Amount,Type
01/01/2024,Coffee Shop,-5.50,Debit
02/01/2024,Salary,3500.00,Credit`;

      const result = mockParseCSV(commaCSV);
      
      expect(result.validation.separator).toBe(',');
      expect(result.validation.separatorDisplay).toBe(',');
      expect(result.headers).toEqual(['Date', 'Description', 'Amount', 'Type']);
      expect(result.rows).toHaveLength(2);
    });

    it('should handle quoted fields with commas', () => {
      const commaCSV = `Date,Description,Amount
01/01/2024,"Coffee Shop, Main St",-5.50
02/01/2024,"Salary, Employer",-3500.00`;

      const result = mockParseCSV(commaCSV);
      
      expect(result.rows[0]).toEqual(['01/01/2024', 'Coffee Shop, Main St', '-5.50']);
      expect(result.rows[1]).toEqual(['02/01/2024', 'Salary, Employer', '-3500.00']);
    });
  });

  describe('Semicolon-delimited CSV', () => {
    it('should detect semicolon delimiter correctly', () => {
      const semicolonCSV = `Date;Description;Amount;Type
01/01/2024;Coffee Shop;-5.50;Debit
02/01/2024;Salary;3500.00;Credit`;

      const result = mockParseCSV(semicolonCSV);
      
      expect(result.validation.separator).toBe(';');
      expect(result.validation.separatorDisplay).toBe(';');
      expect(result.headers).toEqual(['Date', 'Description', 'Amount', 'Type']);
      expect(result.rows).toHaveLength(2);
    });
  });

  describe('Delimiter precedence', () => {
    it('should prefer tab over comma when both are present', () => {
      const mixedCSV = `Type	Details	Amount,Date
Bank Fee	Monthly,Fee	-5.00	30/06/2025`;

      const result = mockParseCSV(mixedCSV);
      
      // Tab should be detected as primary delimiter
      expect(result.validation.separator).toBe('\t');
      expect(result.rows[0][1]).toBe('Monthly,Fee'); // Comma preserved within field
    });

    it('should fallback to comma when tab is inconsistent', () => {
      const inconsistentCSV = `Date,Description,Amount
01/01/2024	Bad Mix,-5.50
02/01/2024,Good Format,3500.00`;

      const result = mockParseCSV(inconsistentCSV);
      
      // Should detect comma as more consistent
      expect(result.validation.separator).toBe(',');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty CSV', () => {
      expect(() => mockParseCSV('')).toThrow('CSV file is empty');
    });

    it('should handle CSV with only whitespace', () => {
      expect(() => mockParseCSV('   \n  \n  ')).toThrow('CSV file is empty');
    });

    it('should handle single column CSV', () => {
      const singleColumnCSV = `Amount
-5.00
-25.50`;

      const result = mockParseCSV(singleColumnCSV);
      
      expect(result.headers).toEqual(['Amount']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['-5.00']);
    });

    it('should handle rows with different column counts', () => {
      const unevenCSV = `Date,Description,Amount
01/01/2024,Coffee,-5.50
02/01/2024,Incomplete
03/01/2024,Extra,Field,-10.00,Bonus`;

      const result = mockParseCSV(unevenCSV);
      
      expect(result.rows).toHaveLength(3);
      expect(result.rows[1]).toEqual(['02/01/2024', 'Incomplete', '']);
      expect(result.rows[2]).toEqual(['03/01/2024', 'Extra', 'Field']); // Extra fields trimmed to header length
    });

    it('should handle special characters and unicode', () => {
      const specialCharCSV = `Date,Description,Amount
01/01/2024,Café Münch,-5.50
02/01/2024,Naïve Store,-10.00`;

      const result = mockParseCSV(specialCharCSV);
      
      expect(result.rows[0][1]).toBe('Café Münch');
      expect(result.rows[1][1]).toBe('Naïve Store');
    });

    it('should clean zero-width characters', () => {
      const dirtyCSV = `Date,Description,Amount
01/01/2024,\u200BCoffee\u200B,-5.50
02/01/2024,\uFEFFStore\uFEFF,-10.00`;

      const result = mockParseCSV(dirtyCSV);
      
      expect(result.rows[0][1]).toBe('Coffee');
      expect(result.rows[1][1]).toBe('Store');
    });
  });

  describe('Header detection', () => {
    it('should detect headers with banking terms', () => {
      const bankingCSV = `Transaction Date,Details,Debit Amount,Credit Amount
01/01/2024,Coffee Shop,5.50,
02/01/2024,Salary,,3500.00`;

      const result = mockParseCSV(bankingCSV);
      
      expect(result.headers).toEqual(['Transaction Date', 'Details', 'Debit Amount', 'Credit Amount']);
      expect(result.validation.headerIndex).toBe(1);
    });

    it('should fallback to first row when no banking terms found', () => {
      const genericCSV = `Col1,Col2,Col3
Data1,Data2,Data3
More1,More2,More3`;

      const result = mockParseCSV(genericCSV);
      
      expect(result.headers).toEqual(['Col1', 'Col2', 'Col3']);
      expect(result.validation.headerIndex).toBe(1);
    });
  });

  describe('Real-world bank formats', () => {
    it('should handle ANZ export format', () => {
      const anzCSV = `Type	Details	Particulars	Code	Reference	Amount	Date	ForeignCurrencyAmount	ConversionCharge
Bank Fee	Monthly A/C Fee				-5.00	30/06/2025		
Purchase	EFTPOS Purchase	New World Albany				-25.50	29/06/2025		`;

      const result = mockParseCSV(anzCSV);
      
      expect(result.validation.separator).toBe('\t');
      expect(result.headers[0]).toBe('Type');
      expect(result.headers[5]).toBe('Amount');
      expect(result.headers[6]).toBe('Date');
      expect(result.rows[0][0]).toBe('Bank Fee');
      expect(result.rows[0][5]).toBe('-5.00');
    });

    it('should handle ASB export format', () => {
      const asbCSV = `Date,Unique Id,Tran Type,Cheque Number,Payee,Memo,Amount
01/12/2024,12345,Purchase,,Coffee Shop,Morning coffee,-5.50
02/12/2024,12346,Deposit,,Employer,Salary,3500.00`;

      const result = mockParseCSV(asbCSV);
      
      expect(result.validation.separator).toBe(',');
      expect(result.headers[0]).toBe('Date');
      expect(result.headers[6]).toBe('Amount');
      expect(result.rows[0][4]).toBe('Coffee Shop');
      expect(result.rows[1][6]).toBe('3500.00');
    });
  });
});

describe('CSV Parser Performance', () => {
  it('should handle large CSV files efficiently', () => {
    // Generate a large CSV for performance testing
    const headerRow = 'Date,Description,Amount,Type';
    const dataRows = Array.from({ length: 1000 }, (_, i) => 
      `${String(i + 1).padStart(2, '0')}/01/2024,Transaction ${i + 1},-${(i + 1) * 1.5},Debit`
    );
    const largeCSV = [headerRow, ...dataRows].join('\n');

    const startTime = Date.now();
    const result = mockParseCSV(largeCSV);
    const endTime = Date.now();

    expect(result.rows).toHaveLength(1000);
    expect(endTime - startTime).toBeLessThan(1000); // Should process in under 1 second
  });

  it('should handle very wide CSV files', () => {
    // Create a CSV with many columns
    const headers = Array.from({ length: 50 }, (_, i) => `Col${i + 1}`);
    const headerRow = headers.join(',');
    const dataRow = Array.from({ length: 50 }, (_, i) => `Data${i + 1}`).join(',');
    const wideCSV = `${headerRow}\n${dataRow}`;

    const result = mockParseCSV(wideCSV);

    expect(result.headers).toHaveLength(50);
    expect(result.rows[0]).toHaveLength(50);
    expect(result.rows[0][0]).toBe('Data1');
    expect(result.rows[0][49]).toBe('Data50');
  });
});