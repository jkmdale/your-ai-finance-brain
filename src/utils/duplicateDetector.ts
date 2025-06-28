import { Transaction } from './csv/types';

export interface DuplicateMatch {
  existing: any; // Database transaction format
  new: Transaction; // CSV processor transaction format
  confidence: number;
  reasons: string[];
}

export class DuplicateDetector {
  private existingTransactions: any[] = [];

  constructor(existingTransactions: any[] = []) {
    this.existingTransactions = existingTransactions;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private areDatesClose(date1: string, date2: string, daysTolerance: number = 1): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d1.getTime() - d2.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= daysTolerance;
  }

  private areAmountsClose(amount1: number, amount2: number, tolerance: number = 0.01): boolean {
    return Math.abs(amount1 - amount2) <= tolerance;
  }

  public detect(transactions: Transaction[]): { duplicates: Transaction[], unique: Transaction[] } {
    const seen = new Map<string, Transaction>();
    const duplicates: Transaction[] = [];
    const unique: Transaction[] = [];

    for (const transaction of transactions) {
      const key = this.generateKey(transaction);
      
      if (seen.has(key)) {
        duplicates.push(transaction);
      } else {
        seen.set(key, transaction);
        unique.push(transaction);
      }
    }

    return { duplicates, unique };
  }

  private generateKey(transaction: Transaction): string {
    return `${transaction.date}-${transaction.amount}-${transaction.description.substring(0, 50)}`;
  }

  public removeDuplicates(transactions: Transaction[], duplicates: DuplicateMatch[]): Transaction[] {
    const duplicateIds = new Set(duplicates.map(d => d.new.id));
    return transactions.filter(txn => !duplicateIds.has(txn.id));
  }
}
