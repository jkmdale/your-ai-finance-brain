import type { ClaudeConfig } from '@/types/categorization';

export const CLAUDE_CONFIG: ClaudeConfig = {
  CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
  MODEL: 'claude-3-haiku-20240307',
  MAX_TOKENS: 300,
  BATCH_SIZE: 10, // Process in batches to avoid rate limits
  RETRY_DELAY: 1000, // 1 second delay between retries
};

export const INCOME_TYPES = [
  'Salary',
  'Interest', 
  'Refund',
  'Gift',
  'Business Revenue',
  'Transfer',
  'Other'
] as const;

export const BUDGET_GROUPS = ['Needs', 'Wants', 'Savings'] as const;