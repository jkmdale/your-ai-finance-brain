
export class AmountParser {
  public parseAmount(amountString: string, rowNumber?: number): { amount: number, warnings: string[] } {
    const warnings: string[] = [];
    
    if (!amountString?.trim()) {
      return { amount: 0, warnings };
    }
    
    console.log(`💰 Parsing amount: "${amountString}"`);
    
    const original = amountString.trim();
    let cleaned = original.replace(/[£$€¥₹\s]/g, '');
    
    const isNegative = /^\(.*\)$/.test(original) || cleaned.startsWith('-') || original.includes('DR') || original.includes('DEBIT');
    cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '').replace(/DR|DEBIT/gi, '');
    
    if (cleaned.includes('.') && cleaned.includes(',')) {
      cleaned = cleaned.replace(/,/g, '');
    } else if (cleaned.includes(',')) {
      const commaIndex = cleaned.lastIndexOf(',');
      const afterComma = cleaned.substring(commaIndex + 1);
      if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
        cleaned = cleaned.replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    }
    
    const numericValue = parseFloat(cleaned);
    if (isNaN(numericValue)) {
      warnings.push(`Row ${rowNumber || 'unknown'}: Could not parse amount "${original}", using 0`);
      return { amount: 0, warnings };
    }
    
    const finalAmount = isNegative ? -Math.abs(numericValue) : numericValue;
    console.log(`✅ Amount parsed: ${finalAmount}`);
    return { amount: finalAmount, warnings };
  }
}
