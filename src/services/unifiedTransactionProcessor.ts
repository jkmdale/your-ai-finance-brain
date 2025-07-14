// Extract amount - prioritize single amount column (common in NZ bank CSV files)
let amount = 0;
let isIncome = false;

// First, try to find a single amount column (most common for NZ banks)
const amountValue = this.findColumnValue(row, bankFormat.columnMappings.amount);

if (amountValue && amountValue.trim() !== '' && amountValue !== '0') {
  // Single amount column found - this is the standard NZ bank format
  // Negative values = expenses/debits, Positive values = income/credits
  const parsedAmount = this.parseAmount(amountValue);
  if (parsedAmount === 0) {
    return null; // Skip zero-amount transactions
  }

  amount = Math.abs(parsedAmount); // Store as absolute value
  isIncome = parsedAmount > 0; // Positive = income, Negative = expense
  
  console.log(`💰 Single amount column: ${amountValue} -> ${parsedAmount} (${isIncome ? 'Income' : 'Expense'})`);
  
} else {
  // Fallback: try separate debit/credit columns (less common)
  const debitValue = this.findColumnValue(row, bankFormat.columnMappings.debit || []);
  const creditValue = this.findColumnValue(row, bankFormat.columnMappings.credit || []);
  
  // Only use debit/credit logic if the columns actually exist and have values
  if ((debitValue && debitValue.trim() !== '' && debitValue !== '0') || 
      (creditValue && creditValue.trim() !== '' && creditValue !== '0')) {
    
    const debitAmount = this.parseAmount(debitValue || '0');
    const creditAmount = this.parseAmount(creditValue || '0');

    if (debitAmount > 0 && creditAmount > 0) {
      throw new Error('Both debit and credit have values - ambiguous transaction');
    }

    if (debitAmount > 0) {
      amount = debitAmount;
      isIncome = false;
    } else if (creditAmount > 0) {
      amount = creditAmount;
      isIncome = true;
    } else {
      throw new Error(`No amount found in debit or credit columns - Debit: "${debitValue || '[empty]'}", Credit: "${creditValue || '[empty]'}"`);
    }
  } else {
    // No amount column found at all - this is a critical error
    const availableColumns = Object.keys(row).join(', ');
    const expectedColumns = [
      ...bankFormat.columnMappings.amount,
      ...(bankFormat.columnMappings.debit || []),
      ...(bankFormat.columnMappings.credit || [])
    ].join(', ');
    
    throw new Error(`No amount column detected. Available columns: [${availableColumns}]. Expected: [${expectedColumns}]`);
  }
}
