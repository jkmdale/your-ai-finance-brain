import type { Transaction } from '@/types/categorization';

export const createIncomePrompt = (transaction: Transaction): string => {
  return `You are a financial assistant classifying bank transactions.

This transaction is a positive credit. IMPORTANT: Only classify as true income if it's genuine external money coming in.

❌ DO NOT count as income:
- Internal transfers between your own accounts
- Loan repayments or refunds  
- Reversals of earlier debits
- Balance adjustments or corrections
- Anything containing: "transfer", "repayment", "loan", "reverse", "correction", "top up", "from savings"

✅ COUNT as income:
- Salary/wage payments
- Freelance/contractor payments  
- Customer/client deposits
- Government benefits, rental income, interest income

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

IMPORTANT: Only classify as expense if it's actual spending.

❌ DO NOT count as expense:
- Internal transfers between accounts
- Loan payments to your own accounts
- Refunds or reversed charges  
- Failed payments or pending authorizations
- Anything containing: "transfer", "loan payment", "reverse", "refund", "failed"

✅ COUNT as expense:
- Retail transactions, utilities, bills
- Subscriptions, groceries, entertainment
- Actual purchases and services

What category is this? (e.g. groceries, rent, entertainment, transport, dining, utilities, shopping, healthcare)
What budget group? (Needs, Wants, or Savings)
Any SMART financial goal suggestion?

Please respond in this exact JSON format:
{
  "category": "category_name",
  "budgetGroup": "Needs|Wants|Savings", 
  "smartGoal": "specific goal suggestion",
  "isValidExpense": true | false
}`;
};