import type { CategorizedTransaction } from '@/types/categorization';

export class CategorizationCache {
  private readonly CACHE_KEY = 'categorizedTransactions';

  store(transactions: CategorizedTransaction[]): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error storing categorized transactions:', error);
    }
  }

  retrieve(): CategorizedTransaction[] {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error reading cached categorized transactions:', error);
      return [];
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.error('Error clearing categorized transactions cache:', error);
    }
  }
}