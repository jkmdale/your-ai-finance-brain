
import { parseNZDate } from '@/modules/utils/format';

export class DateParser {
  public parseDate(dateString: string, format?: string, rowNumber?: number): { date: string, warnings: string[] } {
    const warnings: string[] = [];
    
    if (!dateString?.trim()) {
      warnings.push(`Row ${rowNumber || 'unknown'}: Empty date, using today`);
      return { date: new Date().toISOString().split('T')[0], warnings };
    }
    
    console.log(`🗓️ Parsing date: "${dateString}"`);
    
    const parsedDate = parseNZDate(dateString);
    if (parsedDate) {
      const formattedDate = parsedDate.toISOString().split('T')[0];
      console.log(`✅ Date parsed successfully: ${formattedDate}`);
      return { date: formattedDate, warnings };
    }
    
    // If parsing fails, use today as fallback
    warnings.push(`Row ${rowNumber || 'unknown'}: Could not parse date "${dateString}", using today`);
    const fallbackDate = new Date().toISOString().split('T')[0];
    console.log(`❌ Date parsing failed, using fallback: ${fallbackDate}`);
    return { date: fallbackDate, warnings };
  }
}
