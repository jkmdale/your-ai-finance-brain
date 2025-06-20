
import { Transaction } from './csvProcessor';

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

  public findDuplicates(newTransactions: Transaction[]): DuplicateMatch[] {
    const duplicates: DuplicateMatch[] = [];

    for (const newTxn of newTransactions) {
      for (const existingTxn of this.existingTransactions) {
        if (newTxn.id === existingTxn.id) continue;

        const reasons: string[] = [];
        let confidence = 0;

        // Convert existing transaction date to comparable format
        const existingDate = existingTxn.transaction_date || existingTxn.date;
        const existingDesc = existingTxn.description || '';
        const existingAmount = existingTxn.amount || 0;

        if (!existingDate || !existingDesc) continue;

        // Exact match criteria
        if (newTxn.date === existingDate && 
            newTxn.amount === existingAmount && 
            newTxn.description === existingDesc) {
          confidence = 1.0;
          reasons.push('Exact match: same date, amount, and description');
        } else {
          // Fuzzy matching
          let score = 0;

          // Date similarity
          if (newTxn.date === existingDate) {
            score += 0.4;
            reasons.push('Same date');
          } else if (this.areDatesClose(newTxn.date, existingDate)) {
            score += 0.2;
            reasons.push('Similar date (within 1 day)');
          }

          // Amount similarity
          if (newTxn.amount === existingAmount) {
            score += 0.4;
            reasons.push('Same amount');
          } else if (this.areAmountsClose(newTxn.amount, existingAmount)) {
            score += 0.2;
            reasons.push('Similar amount (within $0.01)');
          }

          // Description similarity
          const descSimilarity = this.calculateSimilarity(
            newTxn.description.toLowerCase(),
            existingDesc.toLowerCase()
          );
          if (descSimilarity >= 0.9) {
            score += 0.3;
            reasons.push('Very similar description');
          } else if (descSimilarity >= 0.7) {
            score += 0.2;
            reasons.push('Similar description');
          }

          // Merchant similarity
          if (newTxn.merchant && existingTxn.merchant) {
            const merchantSimilarity = this.calculateSimilarity(
              newTxn.merchant.toLowerCase(),
              existingTxn.merchant.toLowerCase()
            );
            if (merchantSimilarity >= 0.8) {
              score += 0.1;
              reasons.push('Similar merchant');
            }
          }

          confidence = Math.min(score, 1.0);
        }

        // Consider it a duplicate if confidence is above threshold
        if (confidence >= 0.7) {
          duplicates.push({
            existing: existingTxn,
            new: newTxn,
            confidence,
            reasons
          });
        }
      }
    }

    return duplicates;
  }

  public removeDuplicates(transactions: Transaction[], duplicates: DuplicateMatch[]): Transaction[] {
    const duplicateIds = new Set(duplicates.map(d => d.new.id));
    return transactions.filter(txn => !duplicateIds.has(txn.id));
  }
}
