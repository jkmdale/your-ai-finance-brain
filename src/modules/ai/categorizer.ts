// Simple transaction categorizer - can be enhanced with AI later
export async function categorizeTransactions(transactions: any[]): Promise<any[]> {
  return transactions.map(transaction => ({
    ...transaction,
    category: detectCategory(transaction.description || ''),
  }));
}

function detectCategory(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('supermarket') || desc.includes('grocery') || desc.includes('food')) {
    return 'Food & Dining';
  }
  if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('gas')) {
    return 'Transportation';
  }
  if (desc.includes('rent') || desc.includes('mortgage')) {
    return 'Housing';
  }
  if (desc.includes('salary') || desc.includes('wage')) {
    return 'Salary';
  }
  
  return 'Other';
}