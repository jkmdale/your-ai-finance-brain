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

export function normalizeDate(dateStr: any): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Try different date formats
      const formats = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
      ];
      
      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const [, part1, part2, part3] = match;
          // Assume YYYY-MM-DD if year is first, otherwise DD/MM/YYYY
          const testDate = format === formats[1] 
            ? new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3))
            : new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1));
          
          if (!isNaN(testDate.getTime())) {
            return testDate.toISOString().split('T')[0];
          }
        }
      }
      
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}