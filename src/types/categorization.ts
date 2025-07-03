export interface Transaction {
  date: string;
  description: string;
  amount: number;
}

export interface CategorizedTransaction extends Transaction {
  category: string;
  budgetGroup: 'Needs' | 'Wants' | 'Savings';
  smartGoal: string;
  isIncome: boolean;
  incomeType: string | null;
}

export interface CategorizationProgress {
  total: number;
  completed: number;
  failed: number;
}

export interface ClaudeConfig {
  readonly CLAUDE_API_URL: string;
  readonly MODEL: string;
  readonly MAX_TOKENS: number;
  readonly BATCH_SIZE: number;
  readonly RETRY_DELAY: number;
}

export interface ClaudeResponse {
  content?: Array<{ text: string }>;
}

export interface CategorizationResult {
  isIncome?: boolean;
  incomeType?: string;
  category?: string;
  budgetGroup?: string;
  smartGoal?: string;
  reason?: string;
}