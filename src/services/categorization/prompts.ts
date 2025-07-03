import type { Transaction } from '@/types/categorization';

export const createIncomePrompt = (transaction: Transaction): string => {
  return `You are a financial assistant classifying bank transactions.

This transaction is a positive credit. Please identify:
- Is it true income (or a transfer/refund)?
- What type of income is it?
- What category and budget group?

Respond with:
{
  "isIncome": true | false,
  "incomeType": "Salary" | "Interest" | "Refund" | "Gift" | "Business Revenue" | "Transfer" | "Other",
  "category": "category_name",
  "budgetGroup": "Needs" | "Wants" | "Savings",
  "smartGoal": "specific goal suggestion",
  "reason": "Short explanation why"
}

Transaction: "${transaction.description}" - $${Math.abs(transaction.amount)} on ${transaction.date}`;
};

export const createExpensePrompt = (transaction: Transaction): string => {
  return `Transaction: '${transaction.description}' for $${Math.abs(transaction.amount)} on ${transaction.date}.

What category is this? (e.g. groceries, rent, entertainment, transport, dining, utilities, shopping, healthcare)
What budget group? (Needs, Wants, or Savings)
Any SMART financial goal suggestion?

Please respond in this exact JSON format:
{
  "category": "category_name",
  "budgetGroup": "Needs|Wants|Savings", 
  "smartGoal": "specific goal suggestion"
}`;
};