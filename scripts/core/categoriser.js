// /scripts/core/categoriser.js

import { getClaudeCategory } from '../ai/claudeApi.js';

const keywordMap = { groceries: ['supermarket', 'grocery', 'aldi', 'woolworths', 'tesco'], utilities: ['power', 'electric', 'gas', 'water', 'utility'], dining: ['restaurant', 'cafe', 'mcdonald', 'starbucks', 'burger'], transport: ['uber', 'lyft', 'fuel', 'gas station', 'petrol'], shopping: ['amazon', 'ebay', 'store', 'shop', 'retail'], rent: ['rent', 'landlord'], salary: ['payroll', 'salary', 'wages', 'paycheque'] };

export async function categoriseTransactions(transactions, useClaude = false) { const categorised = [];

for (const tx of transactions) { const desc = tx.description.toLowerCase(); let category = null;

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

categorised.push({ ...tx, category: category || 'uncategorised' });

}

return categorised; }

