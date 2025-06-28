
export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  merchant?: string;
  category?: string;
  account?: string;
  balance?: number;
  reference?: string;
  isIncome: boolean;
  confidence: number;
  rowNumber?: number;
  parseWarnings?: string[];
  tags?: string[];
  aiAnalysis?: {
    formatConfidence: number;
    categoryConfidence: number;
    bankName?: string;
    reasoning?: string;
  };
}

export interface SkippedRow {
  rowNumber: number;
  data: string[];
  reason: string;
  suggestions?: string[];
}

export interface ProcessedCSV {
  transactions: Transaction[];
  skippedRows: SkippedRow[];
  bankFormat: any | null;
  aiAnalysis?: any;
  errors: string[];
  warnings: string[];
  summary: {
    totalRows: number;
    totalTransactions: number;
    dateRange: { start: string; end: string };
    totalAmount: number;
    duplicates: number;
    successRate: number;
    bankName?: string;
    aiConfidence?: number;
  };
}

export interface ParsedCSVData {
  headers: string[];
  rows: string[][];
  skippedRows: SkippedRow[];
}
