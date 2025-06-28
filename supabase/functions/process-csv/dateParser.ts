
export const parseDate = (dateString: string, rowNumber: number): { date: string; warning?: string } => {
  if (!dateString?.trim()) {
    return { date: new Date().toISOString().split('T')[0], warning: `Row ${rowNumber}: Empty date, used today` };
  }
  
  const cleanDate = dateString.trim();
  console.log(`🗓️ Row ${rowNumber}: Parsing date "${cleanDate}"`);
  
  // Enhanced date patterns - support multiple formats
  const patterns = [
    // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy', name: 'DD/MM/YYYY' },
    // MM/DD/YYYY (US format)
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'mdy', name: 'MM/DD/YYYY' },
    // YYYY-MM-DD, YYYY/MM/DD
    { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd', name: 'YYYY-MM-DD' },
    // DD/MM/YY
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy', name: 'DD/MM/YY' },
    // Compact formats
    { regex: /^(\d{2})(\d{2})(\d{4})$/, type: 'dmy', name: 'DDMMYYYY' },
    { regex: /^(\d{4})(\d{2})(\d{2})$/, type: 'ymd', name: 'YYYYMMDD' }
  ];

  for (const pattern of patterns) {
    const match = cleanDate.match(pattern.regex);
    if (match) {
      try {
        let day: string, month: string, year: string;
        
        if (pattern.type === 'ymd') {
          [, year, month, day] = match;
        } else if (pattern.type === 'mdy') {
          [, month, day, year] = match;
          // Handle ambiguous dates - if day > 12, assume DD/MM
          if (parseInt(day) > 12 && parseInt(month) <= 12) {
            [day, month] = [month, day];
          }
        } else {
          [, day, month, year] = match;
          if (year.length === 2) {
            year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
          }
        }
        
        // Validate ranges
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        
        if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
          continue;
        }
        
        const dateObj = new Date(yearNum, monthNum - 1, dayNum);
        if (dateObj.getFullYear() === yearNum && 
            dateObj.getMonth() === monthNum - 1 && 
            dateObj.getDate() === dayNum) {
          const finalDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          console.log(`✅ Row ${rowNumber}: Date parsed as ${pattern.name}: ${finalDate}`);
          return { date: finalDate };
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  // JavaScript fallback
  try {
    const jsDate = new Date(cleanDate);
    if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() > 1900) {
      const fallbackDate = jsDate.toISOString().split('T')[0];
      console.log(`⚠️ Row ${rowNumber}: Used fallback parsing: ${fallbackDate}`);
      return { 
        date: fallbackDate,
        warning: `Row ${rowNumber}: Used fallback parsing for date: ${cleanDate}`
      };
    }
  } catch (error) {
    // Continue to default
  }
  
  const todayDate = new Date().toISOString().split('T')[0];
  console.log(`❌ Row ${rowNumber}: Could not parse date "${cleanDate}", using today: ${todayDate}`);
  return { 
    date: todayDate,
    warning: `Row ${rowNumber}: Could not parse date "${cleanDate}", used today`
  };
};
