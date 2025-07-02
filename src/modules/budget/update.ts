// Budget update utilities
export function updateBudgets(transactions: any[]): void {
  // Update budget based on transactions
  console.log(`Budget updated with ${transactions.length} transactions`);
  window.dispatchEvent(new CustomEvent('budget-update', { detail: { transactions } }));
}

export function updateBudgetFromTransactions(transactions: any[]): void {
  updateBudgets(transactions);
}