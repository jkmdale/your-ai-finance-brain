
// Robust date parser for NZ bank CSV formats
const parseNZDate = (dateStr: string): Date | null => {
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
        let day: number, month: number, year: number;
        
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
          return date;
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return null;
};

export const parseDate = (dateString: string, rowNumber: number): { date: string; warning?: string } => {
  // Clean input dates by removing zero-width spaces, newlines, and trimming
  const cleanedDateString = dateString?.replace(/[\u200B\r\n]/g, '').trim();
  
  if (!cleanedDateString) {
    const fallbackDate = new Date().toISOString().split('T')[0];
    console.warn(`⚠️ Row ${rowNumber}: Empty date, using today: ${fallbackDate}`);
    return { date: fallbackDate, warning: `Row ${rowNumber}: Empty date, used today` };
  }
  
  console.log(`🗓️ Row ${rowNumber}: Parsing cleaned date "${cleanedDateString}"`);
  
  try {
    const parsedDate = parseNZDate(cleanedDateString);
    if (parsedDate) {
      const formattedDate = parsedDate.toISOString().split('T')[0];
      console.log(`✅ Row ${rowNumber}: Date parsed successfully: ${formattedDate}`);
      return { date: formattedDate };
    }
  } catch (error) {
    console.error(`❌ Row ${rowNumber}: Date parsing error:`, error);
  }
  
  // If parsing fails, use today as fallback
  const fallbackDate = new Date().toISOString().split('T')[0];
  console.warn(`❌ Row ${rowNumber}: Could not parse date "${cleanedDateString}", using fallback: ${fallbackDate}`);
  return { 
    date: fallbackDate,
    warning: `Row ${rowNumber}: Could not parse date "${cleanedDateString}", used today as fallback`
  };
};
