
export const parseAmount = (amountString: string, rowNumber: number): { amount: number; warning?: string } => {
  if (!amountString?.trim()) {
    return { amount: 0 };
  }
  
  const original = amountString.trim();
  console.log(`💰 Row ${rowNumber}: Parsing amount "${original}"`);
  
  let cleaned = original.replace(/[£$€¥₹\s]/g, '');
  
  // Handle negative indicators
  const isNegative = /^\(.*\)$/.test(original) || cleaned.startsWith('-') || 
                    original.toUpperCase().includes('DR') || original.toUpperCase().includes('DEBIT');
  cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '').replace(/DR|DEBIT/gi, '');
  
  // Handle decimal separators
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
    console.log(`❌ Row ${rowNumber}: Could not parse amount "${original}", using 0`);
    return { 
      amount: 0, 
      warning: `Row ${rowNumber}: Could not parse amount "${original}", used 0`
    };
  }
  
  const finalAmount = isNegative ? -Math.abs(numericValue) : numericValue;
  console.log(`✅ Row ${rowNumber}: Amount parsed: ${finalAmount}`);
  return { amount: finalAmount };
};
