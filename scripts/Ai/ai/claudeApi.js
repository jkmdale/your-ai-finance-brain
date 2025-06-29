// /scripts/ai/claudeApi.js

const CLAUDE_PROXY_URL = 'https://gzznuwtxyyaqlbbrxsuz.supabase.co/functions/v1/ai-coach';

export async function getClaudeCategory(description) {
  const prompt = `Categorize the following transaction description into a personal finance category such as groceries, dining, rent, transport, shopping, utilities, salary, or other. Just return the category.

Transaction: "${description}"`;

  const response = await fetch(CLAUDE_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    throw new Error(`Claude request failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.completion || '').trim().toLowerCase();
}