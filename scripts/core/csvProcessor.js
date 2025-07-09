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

      const detectedSchema = detectSchema(results.meta.fields);
      if (!detectedSchema) {
        return onError('CSV format not recognized');
      }

      const cleanedData = results.data
        .map((row) => {
          const rawDate = row[detectedSchema.date];
          const parsedDate = normalizeDate(rawDate);
          if (!parsedDate) {
            console.warn(`Skipping row with invalid date: ${rawDate}`);
            return null;
          }
          return {
            date: parsedDate,
            description: row[detectedSchema.description] || '',
            amount: parseFloat(row[detectedSchema.amount] || 0),
            category: null // to be filled later
          };
        })
        .filter(Boolean);

      onComplete(cleanedData);
    },
    error: function (err) {
      onError('Error parsing CSV: ' + err.message);
    }
  });
}

function detectSchema(headers) {
  for (const template of schemaTemplates) {
    const match = template.fields.every((field) =>
      headers.some((h) => h.toLowerCase().includes(field))
    );
    if (match) {
      return template.map;
    }
  }
  return null;
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
