
interface ProcessedTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  merchant?: string;
  category?: string;
  isIncome: boolean;
  isTransfer: boolean;
  isIgnored: boolean;
  monthYear: string;
}

interface MonthlyStats {
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
}

export class TransactionProcessor {
  // Account patterns for transfer detection
  private transferPatterns = [
    /06-0817/,  // Main account number pattern
    /9171$/,    // Credit card ending
    /88419319/, // Loan account
    /662330/,   // KiwiSaver account
    /transfer/i,
    /trf/i,
    /account.*transfer/i,
    /payment.*to.*account/i
  ];

  // Income source patterns
  private incomePatterns = [
    /pathway.*engineer/i,
    /salary/i,
    /wage/i,
    /payroll/i,
    /income/i,
    /dividend/i,
    /interest.*received/i
  ];

  // Expense patterns
  private expensePatterns = [
    /loan.*payment/i,
    /credit.*card/i,
    /mortgage/i,
    /rent/i,
    /utility/i,
    /insurance/i,
    /grocery/i,
    /fuel/i,
    /restaurant/i
  ];

  private isTransfer(description: string, merchant?: string): boolean {
    const textToCheck = `${description} ${merchant || ''}`.toLowerCase();
    return this.transferPatterns.some(pattern => pattern.test(textToCheck));
  }

  private categorizeTransaction(description: string, amount: number, merchant?: string): {
    isIncome: boolean;
    category: string;
    isTransfer: boolean;
  } {
    const textToCheck = `${description} ${merchant || ''}`.toLowerCase();
    
    // First check if it's a transfer - if so, ignore for income/expense calculations
    if (this.isTransfer(description, merchant)) {
      return {
        isIncome: false,
        category: 'Transfer',
        isTransfer: true
      };
    }

    // Check for income patterns
    if (this.incomePatterns.some(pattern => pattern.test(textToCheck))) {
      return {
        isIncome: true,
        category: 'Income',
        isTransfer: false
      };
    }

    // Check for expense patterns
    if (this.expensePatterns.some(pattern => pattern.test(textToCheck))) {
      return {
        isIncome: false,
        category: 'Expense',
        isTransfer: false
      };
    }

    // Default categorization based on amount
    return {
      isIncome: amount > 0,
      category: amount > 0 ? 'Other Income' : 'Other Expense',
      isTransfer: false
    };
  }

  private getMonthYear(dateString: string): string {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  public processTransactions(transactions: any[]): ProcessedTransaction[] {
    return transactions.map(transaction => {
      const categorization = this.categorizeTransaction(
        transaction.description,
        transaction.amount,
        transaction.merchant
      );

      return {
        id: transaction.id,
        date: transaction.transaction_date,
        amount: Math.abs(transaction.amount),
        description: transaction.description,
        merchant: transaction.merchant,
        category: categorization.category,
        isIncome: categorization.isIncome,
        isTransfer: categorization.isTransfer,
        isIgnored: categorization.isTransfer, // Ignore transfers for calculations
        monthYear: this.getMonthYear(transaction.transaction_date)
      };
    });
  }

  public calculateMonthlyStats(transactions: ProcessedTransaction[], targetMonth?: string): MonthlyStats {
    // Filter for specific month if provided, otherwise use current month
    const currentMonth = targetMonth || this.getMonthYear(new Date().toISOString());
    const monthTransactions = transactions.filter(t => 
      t.monthYear === currentMonth && !t.isIgnored
    );

    const income = monthTransactions
      .filter(t => t.isIncome)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => !t.isIncome)
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    return {
      income,
      expenses,
      balance,
      savingsRate,
      transactionCount: monthTransactions.length
    };
  }

  public validateRealisticNumbers(stats: MonthlyStats): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;

    // Check for unrealistic monthly income (over $10,000 NZD is suspicious)
    if (stats.income > 10000) {
      warnings.push(`Monthly income of $${stats.income.toLocaleString()} seems unrealistic - check for transfer inclusion`);
      isValid = false;
    }

    // Check for negative savings rate over -50%
    if (stats.savingsRate < -50) {
      warnings.push(`Savings rate of ${stats.savingsRate.toFixed(1)}% indicates expenses far exceed income`);
    }

    // Check for savings rate over 70% (unusual but not impossible)
    if (stats.savingsRate > 70) {
      warnings.push(`Savings rate of ${stats.savingsRate.toFixed(1)}% is unusually high - verify calculations`);
    }

    return { isValid, warnings };
  }

  public getTransferSummary(transactions: ProcessedTransaction[]): {
    totalTransfers: number;
    transferCount: number;
    excludedFromIncome: number;
  } {
    const transfers = transactions.filter(t => t.isTransfer);
    const totalTransfers = transfers.reduce((sum, t) => sum + t.amount, 0);
    const excludedFromIncome = transfers.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);

    return {
      totalTransfers,
      transferCount: transfers.length,
      excludedFromIncome
    };
  }
}

export const transactionProcessor = new TransactionProcessor();
