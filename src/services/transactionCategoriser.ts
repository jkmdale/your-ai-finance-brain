
import { getClaudeCategory } from './claudeApi';

export interface Transaction {
  description: string;
  category?: string;
}

interface KeywordMap {
  [category: string]: string[];
}

const keywordMap: KeywordMap = {
  groceries: ['supermarket', 'grocery', 'aldi', 'woolworths', 'tesco'],
  utilities: ['power', 'electric', 'gas', 'water', 'utility'],
  dining: ['restaurant', 'cafe', 'mcdonald', 'starbucks', 'burger'],
  transport: ['uber', 'lyft', 'fuel', 'gas station', 'petrol'],
  shopping: ['amazon', 'ebay', 'store', 'shop', 'retail'],
  rent: ['rent', 'landlord'],
  salary: ['payroll', 'salary', 'wages', 'paycheque']
};

export async function categoriseTransactions(
  transactions: Transaction[],
  useClaude: boolean = false
): Promise<Transaction[]> {
  const categorised: Transaction[] = [];

  for (const tx of transactions) {
    const desc = tx.description.toLowerCase();
    let category: string | null = null;

    // First try keyword matching
    for (const [cat, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(k => desc.includes(k))) {
        category = cat;
        break;
      }
    }

    // Claude fallback if no match and allowed
    if (!category && useClaude) {
      try {
        category = await getClaudeCategory(tx.description);
      } catch (err) {
        console.warn('Claude fallback failed:', err);
        category = 'uncategorised';
      }
    }

    categorised.push({
      ...tx,
      category: category || 'uncategorised'
    });
  }

  return categorised;
}
