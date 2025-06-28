
export class DateParser {
  public parseDate(dateString: string, format?: string, rowNumber?: number): { date: string, warnings: string[] } {
    const warnings: string[] = [];
    
    if (!dateString?.trim()) {
      warnings.push(`Row ${rowNumber || 'unknown'}: Empty date, using today`);
      return { date: new Date().toISOString().split('T')[0], warnings };
    }
    
    const cleanDate = dateString.trim();
    console.log(`🗓️ Parsing date: "${cleanDate}"`);
    
    // Enhanced date patterns supporting multiple formats
    const patterns = [
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy', name: 'DD/MM/YYYY' },
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'mdy', name: 'MM/DD/YYYY (US)' },
      { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd', name: 'YYYY-MM-DD' },
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy', name: 'DD/MM/YY' },
      { regex: /^(\d{2})(\d{2})(\d{4})$/, type: 'dmy', name: 'DDMMYYYY' },
      { regex: /^(\d{4})(\d{2})(\d{2})$/, type: 'ymd', name: 'YYYYMMDD' }
    ];

    for (const pattern of patterns) {
      const match = cleanDate.match(pattern.regex);
      if (match) {
        try {
          let year: string, month: string, day: string;
          
          if (pattern.type === 'ymd') {
            [, year, month, day] = match;
          } else if (pattern.type === 'mdy') {
            [, month, day, year] = match;
            if (parseInt(day) > 12 && parseInt(month) <= 12) {
              [day, month] = [month, day];
              warnings.push(`Row ${rowNumber || 'unknown'}: Assumed DD/MM format due to day > 12`);
            }
          } else {
            [, day, month, year] = match;
            if (year.length === 2) {
              const yearNum = parseInt(year);
              year = yearNum > 50 ? `19${year}` : `20${year}`;
            }
          }
          
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
            
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            console.log(`✅ Date parsed as ${pattern.name}: ${formattedDate}`);
            return { date: formattedDate, warnings };
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    try {
      const jsDate = new Date(cleanDate);
      if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() > 1900) {
        warnings.push(`Row ${rowNumber || 'unknown'}: Used fallback date parsing`);
        return { date: jsDate.toISOString().split('T')[0], warnings };
      }
    } catch (error) {
      // Continue to default
    }
    
    warnings.push(`Row ${rowNumber || 'unknown'}: Could not parse date "${cleanDate}", using today`);
    return { date: new Date().toISOString().split('T')[0], warnings };
  }
}
