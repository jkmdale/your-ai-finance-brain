
// Enhanced CSV Parser with automatic delimiter detection
// Supports comma, semicolon, tab, and pipe delimiters

export interface CSVParseResult {
  headers: string[];
  rows: string[][];
  validation: {
    separator: string;
    headerIndex: number;
    totalRows: number;
    hasHeaders: boolean;
  };
}

export function parseCSV(csvData: string): CSVParseResult {
  if (!csvData || typeof csvData !== 'string') {
    throw new Error('Invalid CSV data provided');
  }

  const lines = csvData.trim().split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least header and one data row');
  }

  // Detect delimiter
  const delimiter = detectDelimiter(lines[0]);
  console.log(`🔍 Detected delimiter: "${delimiter === '\t' ? '\\t' : delimiter}"`);

  // Parse headers
  const headers = parseCSVLine(lines[0], delimiter);
  console.log(`📋 Headers detected: ${headers.join(' | ')}`);

  // Parse data rows
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i], delimiter);
    if (row.length > 0) {
      rows.push(row);
    }
  }

  return {
    headers,
    rows,
    validation: {
      separator: delimiter,
      headerIndex: 0,
      totalRows: rows.length,
      hasHeaders: true
    }
  };
}

function detectDelimiter(line: string): string {
  const delimiters = [',', ';', '\t', '|'];
  const scores: { [key: string]: number } = {};

  for (const delimiter of delimiters) {
    const fields = parseCSVLine(line, delimiter);
    scores[delimiter] = fields.length;
  }

  // Find delimiter with most fields
  let bestDelimiter = ',';
  let maxFields = 0;
  
  for (const delimiter of delimiters) {
    if (scores[delimiter] > maxFields) {
      maxFields = scores[delimiter];
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Double quote escape
        current += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, ''));
}
