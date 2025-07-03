import { supabase } from '@/integrations/supabase/client';

export interface AppState {
  activeMonth: string; // Format: 'YYYY-MM'
  totalTransactions: number;
}

export const createTransactionSignature = (transaction: any): string => {
  const date = typeof transaction.date === 'string' ? transaction.date : transaction.transaction_date;
  return `${date}-${transaction.amount}-${transaction.description}`.toLowerCase().trim();
};

export const detectActiveMonth = (transactions: any[]): string => {
  if (transactions.length === 0) {
    return new Date().toISOString().slice(0, 7); // Current month as fallback
  }

  // Group transactions by month
  const monthCounts: { [month: string]: number } = {};
  
  transactions.forEach(tx => {
    const date = typeof tx.date === 'string' ? tx.date : tx.transaction_date;
    const month = date.slice(0, 7); // Extract YYYY-MM
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });

  // Find the month with most transactions (most common month)
  const sortedMonths = Object.entries(monthCounts)
    .sort(([a, countA], [b, countB]) => {
      // First sort by count (descending), then by date (descending for most recent)
      if (countB !== countA) return countB - countA;
      return b.localeCompare(a);
    });

  return sortedMonths[0][0];
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