import Papa from 'papaparse';
import { schemaTemplates } from '../data/schemaExamples.js';

export async function parseCSV(file, onComplete, onError) {
  if (!file) return onError('No file selected');

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      if (!results.data || results.data.length === 0) {
        return onError('CSV appears to be empty');
      }

      console.log('🔍 CSV Headers detected:', results.meta.fields);
      const detectedSchema = detectSchema(results.meta.fields);
      if (!detectedSchema) {
        console.warn('⚠️ Using fallback schema for headers:', results.meta.fields);
        const fallbackSchema = createFallbackSchema(results.meta.fields);
        if (!fallbackSchema) {
          return onError('CSV format not recognized - no suitable columns found');
        }
        console.log('✅ Fallback schema applied:', fallbackSchema);
        return parseWithSchema(results.data, fallbackSchema, onComplete, onError);
      }
      
      console.log('✅ Schema detected:', detectedSchema);
      parseWithSchema(results.data, detectedSchema, onComplete, onError);

    },
    error: function (err) {
      onError('Error parsing CSV: ' + err.message);
    }
  });
}

function detectSchema(headers) {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  // Try exact template matching first
  for (const template of schemaTemplates) {
    const match = template.fields.every((field) =>
      lowerHeaders.some((h) => h.includes(field.toLowerCase()))
    );
    if (match) {
      return template.map;
    }
  }
  
  // Try fuzzy matching with synonyms
  const dateHeaders = lowerHeaders.filter(h => 
    h.includes('date') || h.includes('posting') || h.includes('transaction') || h.includes('tran')
  );
  
  const descHeaders = lowerHeaders.filter(h =>
    h.includes('description') || h.includes('details') || h.includes('particulars') || 
    h.includes('narrative') || h.includes('payee') || h.includes('merchant') || h.includes('reference')
  );
  
  const amountHeaders = lowerHeaders.filter(h =>
    h.includes('amount') || h.includes('value') || h.includes('debit') || h.includes('credit')
  );
  
  // If we found fuzzy matches, create a schema
  if (dateHeaders.length > 0 && descHeaders.length > 0 && amountHeaders.length > 0) {
    const originalHeaders = headers;
    return {
      date: originalHeaders.find(h => dateHeaders.includes(h.toLowerCase())),
      description: originalHeaders.find(h => descHeaders.includes(h.toLowerCase())),
      amount: originalHeaders.find(h => amountHeaders.includes(h.toLowerCase()))
    };
  }
  
  return null;
}

function createFallbackSchema(headers) {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  // Define close match patterns for each field type
  const datePatterns = ['date', 'tran date', 'transaction date', 'posting date', 'posted date', 'trans date'];
  const descPatterns = ['description', 'particulars', 'narrative', 'payee', 'details', 'reference', 'merchant', 'memo'];
  const amountPatterns = ['amount', 'value', 'debit', 'credit', 'sum', 'total'];
  
  // Find best matches for each field
  let dateMatch = null;
  let descMatch = null;
  let amountMatch = null;
  
  // Search for date field
  for (const pattern of datePatterns) {
    const found = headers.find(h => h.toLowerCase().includes(pattern));
    if (found) {
      dateMatch = found;
      break;
    }
  }
  
  // Search for description field
  for (const pattern of descPatterns) {
    const found = headers.find(h => h.toLowerCase().includes(pattern));
    if (found) {
      descMatch = found;
      break;
    }
  }
  
  // Search for amount field
  for (const pattern of amountPatterns) {
    const found = headers.find(h => h.toLowerCase().includes(pattern));
    if (found) {
      amountMatch = found;
      break;
    }
  }
  
  // Check if we found all three required fields
  if (dateMatch && descMatch && amountMatch) {
    return {
      date: dateMatch,
      description: descMatch,
      amount: amountMatch
    };
  }
  
  // Fallback to position-based matching if partial matches found
  if (headers.length >= 3) {
    // Use whatever we found, or fall back to position
    return {
      date: dateMatch || headers[0],
      description: descMatch || headers[1],
      amount: amountMatch || headers[headers.length - 1]
    };
  }
  
  // Minimum viable fallback for 2 columns
  if (headers.length >= 2) {
    return {
      date: dateMatch || headers[0],
      description: descMatch || headers[0], // Use date as description if no desc found
      amount: amountMatch || headers[1]
    };
  }
  
  // Cannot create a valid schema
  return null;
}

function parseWithSchema(data, schema, onComplete, onError) {
  const cleanedData = data
    .map((row) => {
      // Handle separate Debit/Credit columns
      let amount = 0;
      if (schema.amount && row[schema.amount]) {
        amount = parseFloat(row[schema.amount] || 0);
      } else {
        // Check for separate debit/credit columns
        const debit = parseFloat(row['Debit'] || row['debit'] || 0);
        const credit = parseFloat(row['Credit'] || row['credit'] || 0);
        amount = credit - debit; // Credit positive, debit negative
      }
      
      const rawDate = row[schema.date];
      const parsedDate = normalizeDate(rawDate);
      if (!parsedDate) {
        console.warn(`Skipping row with invalid date: ${rawDate}`);
        return null;
      }
      
      return {
        date: parsedDate,
        description: row[schema.description] || row[schema.date] || 'Unknown Transaction',
        amount: amount,
        category: null // to be filled later
      };
    })
    .filter(Boolean);

  console.log(`✅ Processed ${cleanedData.length} transactions`);
  onComplete(cleanedData);
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  
  const cleanDateStr = String(dateStr).trim();
  if (!cleanDateStr) return null;
  
  // NZ bank date format patterns
  const patterns = [
    // DD/MM/YYYY (most common NZ format)
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy' },
    // DD/MM/YY (2-digit year)
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy2' },
    // YYYY-MM-DD (ISO format)
    { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd' },
    // Compact formats: DDMMYYYY, YYYYMMDD
    { regex: /^(\d{2})(\d{2})(\d{4})$/, type: 'dmy_compact' },
    { regex: /^(\d{4})(\d{2})(\d{2})$/, type: 'ymd_compact' }
  ];

  for (const pattern of patterns) {
    const match = cleanDateStr.match(pattern.regex);
    if (match) {
      try {
        let day, month, year;
        
        if (pattern.type === 'ymd' || pattern.type === 'ymd_compact') {
          [, year, month, day] = match.map(Number);
        } else if (pattern.type === 'dmy2') {
          [, day, month, year] = match.map(Number);
          // Convert 2-digit year to 4-digit (assume 50+ = 19xx, otherwise 20xx)
          year = year > 50 ? 1900 + year : 2000 + year;
        } else {
          [, day, month, year] = match.map(Number);
        }
        
        // Validate ranges
        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
          continue;
        }
        
        // Create date object (month is 0-indexed in JS)
        const date = new Date(year, month - 1, day);
        
        // Verify the date is valid (handles leap years, month days, etc.)
        if (date.getFullYear() === year && 
            date.getMonth() === month - 1 && 
            date.getDate() === day) {
          return date.toISOString().split('T')[0];
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return null;
}
