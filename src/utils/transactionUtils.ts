import { supabase } from '@/integrations/supabase/client';

export interface AppState {
  activeMonth: string; // Format: 'YYYY-MM'
  totalTransactions: number;
}

export const createTransactionSignature = (transaction: any): string => {
  const date = typeof transaction.date === 'string' ? transaction.date : transaction.transaction_date;
  const description = transaction.description?.substring(0, 100) || ''; // Limit length for consistency
  return `${date}-${Math.abs(transaction.amount)}-${description}`.toLowerCase().trim();
};

export const isTransferOrReversal = (transaction: any): boolean => {
  const description = transaction.description?.toLowerCase() || '';
  const transferKeywords = ['transfer', 'repayment', 'loan', 'reverse', 'correction', 'top up', 'from savings', 'refund', 'failed'];
  return transferKeywords.some(keyword => description.includes(keyword));
};

export const isValidIncomeTransaction = (transaction: any): boolean => {
  if (transaction.amount <= 0) return false;
  if (isTransferOrReversal(transaction)) return false;
  return transaction.is_income === true;
};

export const isValidExpenseTransaction = (transaction: any): boolean => {
  if (transaction.amount >= 0) return false;
  if (isTransferOrReversal(transaction)) return false;
  return transaction.is_income === false;
};

export const detectActiveMonth = (transactions: any[]): string => {
  if (transactions.length === 0) {
    return new Date().toISOString().slice(0, 7); // Current month as fallback
  }

  // Filter out transfers and reversals before detecting active month
  const validTransactions = transactions.filter(tx => 
    !isTransferOrReversal(tx) && 
    tx.category !== 'Transfer' &&
    tx.category !== 'Reversal'
  );

  if (validTransactions.length === 0) {
    return new Date().toISOString().slice(0, 7);
  }

  // Group transactions by month
  const monthCounts: { [month: string]: number } = {};
  
  validTransactions.forEach(tx => {
    const date = typeof tx.date === 'string' ? tx.date : tx.transaction_date;
    const month = date.slice(0, 7); // Extract YYYY-MM
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });

  // Find the most recent complete month with significant transaction activity
  const sortedMonths = Object.entries(monthCounts)
    .sort(([a, countA], [b, countB]) => {
      // First sort by date (descending for most recent), then by count
      const dateComparison = b.localeCompare(a);
      if (dateComparison !== 0) return dateComparison;
      return countB - countA;
    })
    .filter(([month, count]) => count >= 3); // At least 3 transactions to be considered active

  return sortedMonths.length > 0 ? sortedMonths[0][0] : new Date().toISOString().slice(0, 7);
};

export const filterUniqueTransactions = async (
  newTransactions: any[], 
  userId: string
): Promise<any[]> => {
  // Get existing signatures from Supabase
  const { data: existingTransactions } = await supabase
    .from('transactions')
    .select('description, amount, transaction_date')
    .eq('user_id', userId);

  const existingSignatures = new Set(
    (existingTransactions || []).map(createTransactionSignature)
  );

  // Filter out duplicates
  return newTransactions.filter(tx => {
    const signature = createTransactionSignature(tx);
    return !existingSignatures.has(signature);
  });
};