
export const categorizeTransaction = (description: string, amount: number): { category: string, isIncome: boolean } => {
  const desc = description.toLowerCase();
  
  // Income patterns
  if (amount > 0) {
    if (/salary|wage|payroll|pay|employment/.test(desc)) return { category: 'Salary', isIncome: true };
    if (/dividend|interest|investment/.test(desc)) return { category: 'Investment Income', isIncome: true };
    if (/refund|reimbursement|cashback/.test(desc)) return { category: 'Refunds', isIncome: true };
    return { category: 'Other Income', isIncome: true };
  }
  
  // Expense categories with enhanced patterns
  const expenseCategories = [
    { pattern: /rent|mortgage|property|utilities|electricity|gas|water|internet|phone/, category: 'Housing & Utilities' },
    { pattern: /grocery|supermarket|food|fresh|countdown|paknsave|woolworths|coles|tesco|sainsbury/, category: 'Groceries' },
    { pattern: /uber|taxi|bus|train|fuel|petrol|parking|transport|shell|bp|mobil/, category: 'Transportation' },
    { pattern: /restaurant|cafe|takeaway|delivery|dining|mcdonald|kfc|starbucks|subway/, category: 'Dining Out' },
    { pattern: /netflix|spotify|subscription|entertainment|movie|cinema|games|amazon prime/, category: 'Entertainment' },
    { pattern: /doctor|hospital|pharmacy|medical|health|dental|chemist/, category: 'Healthcare' },
    { pattern: /amazon|shopping|retail|clothing|electronics|warehouse|target|walmart/, category: 'Shopping' },
    { pattern: /insurance|life|car|health|home/, category: 'Insurance' },
    { pattern: /transfer|payment|loan|credit|atm|withdrawal/, category: 'Transfers' }
  ];
  
  for (const { pattern, category } of expenseCategories) {
    if (pattern.test(desc)) {
      return { category, isIncome: false };
    }
  }
  
  return { category: 'Other', isIncome: false };
};
