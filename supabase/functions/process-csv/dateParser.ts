
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
  if (!dateString?.trim()) {
    return { date: new Date().toISOString().split('T')[0], warning: `Row ${rowNumber}: Empty date, used today` };
  }
  
  console.log(`🗓️ Row ${rowNumber}: Parsing date "${dateString}"`);
  
  const parsedDate = parseNZDate(dateString);
  if (parsedDate) {
    const formattedDate = parsedDate.toISOString().split('T')[0];
    console.log(`✅ Row ${rowNumber}: Date parsed successfully: ${formattedDate}`);
    return { date: formattedDate };
  }
  
  // If parsing fails, use today as fallback
  const todayDate = new Date().toISOString().split('T')[0];
  console.log(`❌ Row ${rowNumber}: Could not parse date "${dateString}", using today: ${todayDate}`);
  return { 
    date: todayDate,
    warning: `Row ${rowNumber}: Could not parse date "${dateString}", used today`
  };
};
