// Utility functions for parsing and formatting data

export function parseFloatSafe(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Enhanced NZ bank date parser with better error handling
export function parseNZDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  
  const cleanDateStr = String(dateStr).trim();
  if (!cleanDateStr) return null;
  
  console.log(`🗓️ Parsing date: "${cleanDateStr}"`);
  
  // NZ bank date format patterns (order matters - most specific first)
  const patterns = [
    // DD/MM/YYYY (most common NZ format)
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy' },
    // DD/MM/YY (2-digit year)  
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy2' },
    // YYYY-MM-DD (ISO format)
    { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd' },
    // Compact formats: DDMMYYYY, YYYYMMDD  
    { regex: /^(\d{2})(\d{2})(\d{4})$/, type: 'dmy_compact' },
    { regex: /^(\d{4})(\d{2})(\d{2})$/, type: 'ymd_compact' },
    // Handle single digit formats: D/M/YYYY, D/M/YY
    { regex: /^(\d{1})[\/\-\.](\d{1})[\/\-\.](\d{4})$/, type: 'dmy' },
    { regex: /^(\d{1})[\/\-\.](\d{1})[\/\-\.](\d{2})$/, type: 'dmy2' }
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
          // Convert 2-digit year to 4-digit (assume 30+ = 19xx, otherwise 20xx)
          year = year >= 30 ? 1900 + year : 2000 + year;
        } else {
          [, day, month, year] = match.map(Number);
        }
        
        // Validate ranges with better bounds checking
        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1950 || year > 2050) {
          console.warn(`⚠️ Date out of range: ${day}/${month}/${year}`);
          continue;
        }
        
        // Additional validation for days per month
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const maxDays = month === 2 && isLeapYear ? 29 : daysInMonth[month - 1];
        
        if (day > maxDays) {
          console.warn(`⚠️ Invalid day for month: ${day}/${month}/${year}`);
          continue;
        }
        
        // Create date object (month is 0-indexed in JS)
        const date = new Date(year, month - 1, day);
        
        // Verify the date construction was successful
        if (date.getFullYear() === year && 
            date.getMonth() === month - 1 && 
            date.getDate() === day) {
          console.log(`✅ Date parsed successfully: ${date.toISOString().split('T')[0]}`);
          return date;
        }
      } catch (error) {
        console.warn(`⚠️ Error parsing date with pattern ${pattern.type}:`, error);
        continue;
      }
    }
  }
  
  // Try JavaScript's native Date parsing as last resort
  try {
    const nativeDate = new Date(cleanDateStr);
    if (!isNaN(nativeDate.getTime()) && nativeDate.getFullYear() > 1950 && nativeDate.getFullYear() < 2050) {
      console.log(`✅ Date parsed with native parser: ${nativeDate.toISOString().split('T')[0]}`);
      return nativeDate;
    }
  } catch (error) {
    // Ignore native parsing errors
  }
  
  console.error(`❌ Could not parse date: "${cleanDateStr}"`);
  return null;
}

export function normalizeDate(dateStr: any): string {
  const parsedDate = parseNZDate(dateStr);
  if (parsedDate) {
    return parsedDate.toISOString().split('T')[0];
  }
  
  // Fallback to today's date if parsing fails
  return new Date().toISOString().split('T')[0];
}