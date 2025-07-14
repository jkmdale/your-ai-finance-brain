
// Enhanced CSV parser with auto-delimiter detection and comprehensive logging

interface SkippedRow {
  lineNumber: number;
  reason: string;
}

interface CSVValidation {
  isValid: boolean;
  totalLines: number;
  dataRows: number;
  skippedRows: number;
  separator: string;
  headerIndex: number;
  separatorDisplay: string;
}

export const parseCSV = (csvData: string): { headers: string[], rows: string[][], validation: CSVValidation } => {
  console.log('📄 Starting comprehensive CSV parsing...');
  
  const lines = csvData.trim().split(/\r?\n/);
  console.log(`📊 Found ${lines.length} total lines`);
  
  if (lines.length < 1) {
    throw new Error('CSV file is empty');
  }

  // Enhanced auto-detect separator with priority for tab-delimited files
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
    
    // Filter out separators that don't appear consistently
    const validSeparators = separatorAnalysis.filter(s => s.avgCount >= 1 && s.consistency > 0.5);
    
    if (validSeparators.length === 0) {
      console.warn('⚠️ No consistent separator found, defaulting to comma');
      return ',';
    }
    
    // Sort by score (average count * consistency)
    const best = validSeparators.sort((a, b) => b.score - a.score)[0];
    
    console.log(`🔍 Separator analysis:`);
    separatorAnalysis.forEach(s => {
      const display = s.separator === '\t' ? '\\t (tab)' : s.separator;
      console.log(`   • ${display}: avg=${s.avgCount.toFixed(1)}, consistency=${s.consistency.toFixed(2)}, score=${s.score.toFixed(2)}`);
    });
    
    const displaySep = best.separator === '\t' ? '\\t (tab)' : best.separator;
    console.log(`✅ Selected separator: "${displaySep}" (score: ${best.score.toFixed(2)})`);
    
    return best.separator;
  };

  const nonEmptyLines = lines.filter(line => line.trim());
  const separator = detectSeparator(nonEmptyLines.slice(0, 5));

  // Enhanced CSV line parser with better quote handling
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
          i++; // Skip the next quote
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
    
    // Clean up quoted values and trim whitespace
    return result.map(cell => {
      let cleaned = cell;
      
      // Remove outer quotes if present
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
          (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1);
      }
      
      // Remove zero-width characters and trim
      return cleaned.replace(/[\u200B\u200C\u200D\uFEFF]/g, '').trim();
    });
  };

  // Enhanced header detection with better logic
  let headerIndex = -1;
  let headers: string[] = [];
  
  console.log('🔍 Analyzing first 10 lines for headers...');
  for (let i = 0; i < Math.min(10, nonEmptyLines.length); i++) {
    const parsedLine = parseCSVLine(nonEmptyLines[i]);
    console.log(`   Line ${i + 1}: [${parsedLine.join(', ')}]`);
    
    if (parsedLine.length >= 2 && parsedLine.some(cell => cell.length > 0)) {
      // Enhanced header detection terms
      const headerTerms = [
        'type', 'date', 'amount', 'description', 'details', 'particulars',
        'transaction', 'debit', 'credit', 'balance', 'reference', 'code',
        'foreigncurrency', 'conversion', 'fee'
      ];
      
      const lowerCells = parsedLine.map(c => c.toLowerCase());
      const headerMatches = lowerCells.filter(cell => 
        headerTerms.some(term => cell.includes(term))
      );
      
      const hasHeaderTerms = headerMatches.length >= 2; // At least 2 header-like terms
      
      if (hasHeaderTerms || i === 0) {
        headers = parsedLine;
        headerIndex = i;
        console.log(`📋 Headers detected at line ${i + 1}: [${headers.join(' | ')}]`);
        console.log(`   • Matched header terms: ${headerMatches.length}`);
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
        console.log(`📋 Using line ${i + 1} as headers (fallback): [${headers.join(' | ')}]`);
        break;
      }
    }
  }

  if (headerIndex === -1) {
    throw new Error('No valid header row found in first 10 lines');
  }

  // Enhanced data row parsing with better error handling
  const dataLines = nonEmptyLines.slice(headerIndex + 1);
  console.log(`📊 Processing ${dataLines.length} data lines...`);
  
  const rows: string[][] = [];
  const skippedRows: SkippedRow[] = [];
  
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const lineNumber = headerIndex + i + 2; // Actual line number in original file
    
    if (!line.trim()) {
      console.log(`⏭️ Skipping empty line ${lineNumber}`);
      continue;
    }
    
    try {
      const parsedRow = parseCSVLine(line);
      
      // Skip only completely empty rows
      if (parsedRow.length === 0 || parsedRow.every(cell => !cell.trim())) {
        console.log(`⏭️ Skipping empty row ${lineNumber}`);
        skippedRows.push({ lineNumber, reason: 'empty row' });
        continue;
      }
      
      // Pad row to match header length
      while (parsedRow.length < headers.length) {
        parsedRow.push('');
      }
      
      rows.push(parsedRow);
      console.log(`✅ Row ${lineNumber}: [${parsedRow.slice(0, 3).join(' | ')}...]`);
      
    } catch (parseError) {
      console.error(`❌ Failed to parse line ${lineNumber}:`, parseError);
      skippedRows.push({ lineNumber, reason: `parse error: ${parseError.message}` });
    }
  }
  
  // Final logging
  console.log(`✅ CSV parsing complete:`);
  console.log(`   • Delimiter: ${separator === '\t' ? 'tab' : separator}`);
  console.log(`   • Headers: ${headers.length} columns`);
  console.log(`   • Data rows: ${rows.length} parsed`);
  console.log(`   • Skipped rows: ${skippedRows.length}`);
  
  if (skippedRows.length > 0) {
    console.log(`⚠️ Skipped rows details:`, skippedRows);
  }
  
  return { 
    headers, 
    rows, 
    validation: {
      isValid: rows.length > 0,
      totalLines: lines.length,
      dataRows: rows.length,
      skippedRows: skippedRows.length,
      separator,
      headerIndex: headerIndex + 1,
      separatorDisplay: separator === '\t' ? 'tab' : separator
    }
  };
};
