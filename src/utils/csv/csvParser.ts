
import { SkippedRow, ParsedCSVData } from './types';

export class CSVParser {
  public parseCSV(csvText: string): ParsedCSVData {
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

      // Find header row with AI assistance
      let headerRowIndex = -1;
      let headers: string[] = [];
      
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const parseResult = parseCSVLine(lines[i], i + 1);
        if (parseResult.cells.length >= 2 && parseResult.cells.some(cell => cell.length > 0)) {
          const headerTerms = ['date', 'amount', 'description', 'details', 'transaction', 'debit', 'credit', 'balance'];
          const lowerCells = parseResult.cells.map(c => c.toLowerCase());
          const hasHeaderTerms = lowerCells.some(cell => 
            headerTerms.some(term => cell.includes(term))
          );
          
          if (hasHeaderTerms || i === 0) {
            headers = parseResult.cells;
            headerRowIndex = i;
            console.log(`📋 Headers found at row ${i + 1}: ${headers.join(', ')}`);
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        // If no clear headers found, use first non-empty row
        for (let i = 0; i < Math.min(3, lines.length); i++) {
          const parseResult = parseCSVLine(lines[i], i + 1);
          if (parseResult.cells.length >= 2) {
            headers = parseResult.cells;
            headerRowIndex = i;
            console.log(`📋 Using row ${i + 1} as headers: ${headers.join(', ')}`);
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('No valid header row found in first 10 lines');
      }

      // Parse ALL data rows - this is crucial for getting all transactions
      const rows: string[][] = [];
      const skippedRows: SkippedRow[] = [];
      
      for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const rowNumber = i + 1;
        
        if (!line.trim()) {
          continue; // Skip empty lines
        }

        const parseResult = parseCSVLine(line, rowNumber);
        const cells = parseResult.cells;
        
        if (cells.length === 0 || cells.every(cell => !cell.trim())) {
          continue; // Skip completely empty rows
        }

        // Pad row to match header length
        while (cells.length < headers.length) {
          cells.push('');
        }

        // Check if row has any meaningful data
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
}
