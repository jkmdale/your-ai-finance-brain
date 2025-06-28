
export interface Transaction {
  date: string;
  description: string;
  amount: number;
  merchant?: string;
}

export interface ProcessingResult {
  success: boolean;
  processed: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  transactions: any[];
  accountBalance: number;
  fileValidation?: {
    isValid: boolean;
    reason?: string;
    rowDetails?: Array<{ row: number; reason: string; data?: string[]; suggestion?: string }>;
  };
  detailedResults?: {
    totalParsed: number;
    totalUploaded: number;
    batchResults: Array<{ batchNumber: number; attempted: number; succeeded: number; failed: number; errors: string[] }>;
  };
}

export interface ColumnMapping {
  index: number;
  confidence: number;
  matchedName?: string;
}
