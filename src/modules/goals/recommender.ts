// Goals recommendation utilities
export function recommendGoals(transactions: any[]): void {
  // Recommend goals based on transactions
  console.log(`Goals recommended based on ${transactions.length} transactions`);
  window.dispatchEvent(new CustomEvent('goals-recommend', { detail: { transactions } }));
}