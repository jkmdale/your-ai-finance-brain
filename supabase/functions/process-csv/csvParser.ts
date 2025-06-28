
export const parseCSV = (csvData: string): { headers: string[], rows: string[][], validation: any } => {
  console.log('📄 Starting comprehensive CSV parsing...');
  
  const lines = csvData.trim().split(/\r?\n/);
  console.log(`📊 Found ${lines.length} total lines`);
  
  if (lines.length < 1) {
    throw new Error('CSV file is empty');
  }

  // Auto-detect separator
  const detectSeparator = (sampleLines: string[]): string => {
    const separators = [',', ';', '\t', '|'];
    const scores = separators.map(sep => ({
      separator: sep,
      avgCount: sampleLines.reduce((sum, line) => sum + (line.split(sep).length - 1), 0) / sampleLines.length
    }));
    
    const best = scores.filter(s => s.avgCount >= 1).sort((a, b) => b.avgCount - a.avgCount)[0];
    console.log(`🔍 Detected separator: "${best?.separator === '\t' ? '\\t' : best?.separator || ','}"`);
    return best?.separator || ',';
  };

  const nonEmptyLines = lines.filter(line => line.trim());
  const separator = detectSeparator(nonEmptyLines.slice(0, 5));

  const parseCSVLine = (line: string): string[] => {
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
      if ((cell.startsWith('"') && cell.endsWith('"')) || 
          (cell.startsWith("'") && cell.endsWith("'"))) {
        cell = cell.slice(1, -1);
      }
      return cell.trim();
    });
  };

  // Find header row with enhanced detection
  let headerIndex = -1;
  let headers: string[] = [];
  
  for (let i = 0; i < Math.min(10, nonEmptyLines.length); i++) {
    const parsedLine = parseCSVLine(nonEmptyLines[i]);
    if (parsedLine.length >= 2 && parsedLine.some(cell => cell.length > 0)) {
      const headerTerms = ['date', 'amount', 'description', 'details', 'transaction', 'debit', 'credit', 'balance'];
      const lowerCells = parsedLine.map(c => c.toLowerCase());
      const hasHeaderTerms = lowerCells.some(cell => 
        headerTerms.some(term => cell.includes(term))
      );
      
      if (hasHeaderTerms || i === 0) {
        headers = parsedLine;
        headerIndex = i;
        console.log(`📋 Headers found at row ${i + 1}: ${headers.join(', ')}`);
        break;
      }
    }
  }

  if (headerIndex === -1) {
    // Use first non-empty row as headers
    for (let i = 0; i < Math.min(3, nonEmptyLines.length); i++) {
      const parsedLine = parseCSVLine(nonEmptyLines[i]);
      if (parsedLine.length >= 2) {
        headers = parsedLine;
        headerIndex = i;
        console.log(`📋 Using row ${i + 1} as headers: ${headers.join(', ')}`);
        break;
      }
    }
  }

  if (headerIndex === -1) {
    throw new Error('No valid header row found in first 10 lines');
  }

  // Parse ALL data rows - this is crucial
  const dataLines = nonEmptyLines.slice(headerIndex + 1);
  console.log(`📊 Processing ${dataLines.length} data lines...`);
  
  const rows = [];
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line.trim()) continue;
    
    const parsedRow = parseCSVLine(line);
    
    // Skip only completely empty rows
    if (parsedRow.length === 0 || parsedRow.every(cell => !cell.trim())) {
      console.log(`⏭️ Skipping empty row ${headerIndex + i + 2}`);
      continue;
    }
    
    // Pad row to match header length
    while (parsedRow.length < headers.length) {
      parsedRow.push('');
    }
    
    rows.push(parsedRow);
    console.log(`✅ Row ${headerIndex + i + 2}: ${parsedRow.slice(0, 3).join(' | ')}`);
  }
  
  console.log(`✅ Successfully parsed ${rows.length} data rows from ${dataLines.length} lines`);
  
  return { 
    headers, 
    rows, 
    validation: {
      isValid: rows.length > 0,
      totalLines: lines.length,
      dataRows: rows.length,
      separator,
      headerIndex: headerIndex + 1
    }
  };
};
