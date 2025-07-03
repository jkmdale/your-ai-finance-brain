import { supabase } from '@/integrations/supabase/client';

export interface ClassifiedTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  merchant?: string;
  category: string;
  subcategory?: string;
  isIncome: boolean;
  isExpense: boolean;
  isTransfer: boolean;
  isReversal: boolean;
  isIgnored: boolean;
  monthYear: string;
  confidence: number;
  bankMetadata?: any;
}

export interface MonthlyClassification {
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
  month: string;
  incomeTransactions: ClassifiedTransaction[];
  expenseTransactions: ClassifiedTransaction[];
  transferTransactions: ClassifiedTransaction[];
  reversalTransactions: ClassifiedTransaction[];
}

export class TransactionClassifier {
  // Enhanced NZ bank transfer patterns
  private transferPatterns = [
    // Generic transfer keywords
    /transfer/i,
    /trf\b/i,
    /xfer/i,
    /internal.*payment/i,
    /between.*accounts/i,
    /own.*account/i,
    /payment.*to.*account/i,
    /from.*savings/i,
    /to.*savings/i,
    /top.*up/i,
    /balance.*adjustment/i,
    
    // NZ-specific patterns
    /j\s*k\s*m\s*dale/i, // Common NZ name pattern
    /automatic.*payment/i,
    /ap\s+\d+/i, // Automatic payment codes
    /internet.*banking/i,
    /online.*transfer/i,
    
    // Account number patterns (NZ format: XX-XXXX-XXXXXXX-XXX)
    /\d{2}-\d{4}-\d{7}-\d{3}/,
    /06[-\s]?0817/i, // Specific account patterns
    /9171\s*$/i,
    /88419319/i,
    /662330/i
  ];

  // Enhanced reversal patterns
  private reversalPatterns = [
    /reversal/i,
    /reverse/i,
    /refund/i,
    /correction/i,
    /cancelled/i,
    /failed/i,
    /returned/i,
    /void/i,
    /dispute/i,
    /chargeback/i,
    /pending.*auth/i
  ];

  // Enhanced income patterns (external sources only)
  private incomePatterns = {
    SALARY: [
      /salary/i,
      /wage/i,
      /payroll/i,
      /employer/i,
      /pathway.*engineer/i, // Specific employer pattern
      /pay.*period/i
    ],
    GOVERNMENT: [
      /ird/i,
      /working.*for.*families/i,
      /accommodation.*supplement/i,
      /benefit/i,
      /tax.*credit/i,
      /winz/i,
      /studylink/i
    ],
    INVESTMENT: [
      /dividend/i,
      /interest.*received/i,
      /capital.*gain/i,
      /investment.*return/i,
      /sharesies/i,
      /kiwisaver.*contribution/i
    ],
    BUSINESS: [
      /invoice/i,
      /payment.*received/i,
      /freelance/i,
      /contractor/i,
      /client.*payment/i,
      /trade.*income/i
    ],
    RENTAL: [
      /rental.*income/i,
      /rent.*received/i,
      /property.*income/i
    ]
  };

  // Enhanced expense patterns
  private expensePatterns = {
    // Housing
    RENT: [/rent/i, /rental.*payment/i],
    MORTGAGE: [/mortgage/i, /home.*loan/i, /loan.*payment/i],
    RATES: [/rates/i, /council/i, /city.*council/i],
    POWER: [/powershop/i, /meridian/i, /contact.*energy/i, /genesis/i, /electric/i],
    INSURANCE: [/vero/i, /partners.*life/i, /aa.*insurance/i, /state.*insurance/i, /insurance/i],
    INTERNET: [/spark/i, /vodafone/i, /2degrees/i, /internet/i, /broadband/i],

    // Family & Childcare
    CHILDCARE: [/grow.*active/i, /daycare/i, /kindergarten/i, /childcare/i, /babysitter/i],
    EDUCATION: [/school/i, /university/i, /course.*fees/i, /tuition/i],
    KIDS_ACTIVITIES: [/swimming/i, /sports.*club/i, /music.*lessons/i, /ballet/i],

    // Living Expenses
    GROCERIES: [/new.*world/i, /countdown/i, /pak.*n.*save/i, /woolworths/i, /four.*square/i, /supermarket/i],
    FUEL: [/bp.*connect/i, /mobil/i, /z.*energy/i, /caltex/i, /petrol/i, /gas.*station/i],
    PHONE: [/2degrees/i, /vodafone/i, /spark/i, /mobile/i, /phone.*bill/i],
    HEALTHCARE: [/chemist/i, /pharmacy/i, /doctor/i, /medical/i, /hospital/i, /dental/i],

    // Discretionary
    DINING: [/kfc/i, /mcdonalds/i, /subway/i, /uber.*eats/i, /restaurant/i, /cafe/i, /takeaway/i],
    ENTERTAINMENT: [/spotify/i, /netflix/i, /sky/i, /google/i, /youtube/i, /movie/i, /cinema/i],
    FITNESS: [/gym/i, /fitness/i, /aquagym/i, /yoga/i, /pilates/i],
    SHOPPING: [/warehouse/i, /kmart/i, /farmers/i, /clothing/i, /amazon/i, /trademe/i],
    TRAVEL: [/singapore.*airlines/i, /jetstar/i, /air.*new.*zealand/i, /hotel/i, /accommodation/i],

    // Financial
    BANK_FEES: [/monthly.*fee/i, /overdraft/i, /bank.*fee/i, /transaction.*fee/i],
    CREDIT_CARD: [/credit.*card.*payment/i, /visa/i, /mastercard/i]
  };

  /**
   * Detect if transaction is a transfer between accounts
   */
  private isTransfer(description: string, merchant?: string, amount?: number, bankMetadata?: any): boolean {
    const textToCheck = `${description} ${merchant || ''}`.toLowerCase();
    
    // Check against transfer patterns
    const hasTransferPattern = this.transferPatterns.some(pattern => pattern.test(textToCheck));
    
    // Check for round amounts (common in transfers)
    const isRoundAmount = amount && (amount % 50 === 0 || amount % 100 === 0) && amount > 500;
    
    // Check bank metadata for transfer indicators
    const hasTransferMetadata = bankMetadata?.type === 'transfer' || 
                               bankMetadata?.code?.includes('TRF') ||
                               bankMetadata?.particulars?.toLowerCase().includes('transfer');
    
    return hasTransferPattern || hasTransferMetadata || (isRoundAmount && hasTransferPattern);
  }

  /**
   * Detect if transaction is a reversal
   */
  private isReversal(description: string, merchant?: string): boolean {
    const textToCheck = `${description} ${merchant || ''}`.toLowerCase();
    return this.reversalPatterns.some(pattern => pattern.test(textToCheck));
  }

  /**
   * Classify transaction as income, expense, transfer, or reversal
   */
  private classifyTransaction(
    description: string, 
    amount: number, 
    merchant?: string, 
    bankMetadata?: any
  ): {
    isIncome: boolean;
    isExpense: boolean;
    isTransfer: boolean;
    isReversal: boolean;
    category: string;
    subcategory?: string;
    confidence: number;
  } {
    const textToCheck = `${description} ${merchant || ''}`.toLowerCase();
    
    // First check for reversals
    if (this.isReversal(description, merchant)) {
      return {
        isIncome: false,
        isExpense: false,
        isTransfer: false,
        isReversal: true,
        category: 'Reversal',
        confidence: 0.95
      };
    }

    // Then check for transfers
    if (this.isTransfer(description, merchant, amount, bankMetadata)) {
      return {
        isIncome: false,
        isExpense: false,
        isTransfer: true,
        isReversal: false,
        category: 'Transfer',
        confidence: 0.9
      };
    }

    // For positive amounts, check income patterns
    if (amount > 0) {
      for (const [incomeType, patterns] of Object.entries(this.incomePatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(textToCheck)) {
            return {
              isIncome: true,
              isExpense: false,
              isTransfer: false,
              isReversal: false,
              category: 'Income',
              subcategory: incomeType,
              confidence: 0.85
            };
          }
        }
      }
      
      // Default for positive amounts (but low confidence)
      return {
        isIncome: true,
        isExpense: false,
        isTransfer: false,
        isReversal: false,
        category: 'Income',
        subcategory: 'OTHER',
        confidence: 0.5
      };
    }

    // For negative amounts, check expense patterns
    for (const [expenseType, patterns] of Object.entries(this.expensePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(textToCheck)) {
          return {
            isIncome: false,
            isExpense: true,
            isTransfer: false,
            isReversal: false,
            category: 'Expense',
            subcategory: expenseType,
            confidence: 0.85
          };
        }
      }
    }

    // Default for negative amounts
    return {
      isIncome: false,
      isExpense: true,
      isTransfer: false,
      isReversal: false,
      category: 'Expense',
      subcategory: 'OTHER',
      confidence: 0.5
    };
  }

  /**
   * Detect and remove reversal pairs
   */
  private detectReversalPairs(transactions: any[]): { 
    validTransactions: any[], 
    reversalPairs: Array<{ debit: any, credit: any }> 
  } {
    const reversalPairs: Array<{ debit: any, credit: any }> = [];
    const processedIds = new Set();
    const validTransactions = [];

    // Sort by date for better pair detection
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    for (let i = 0; i < sortedTransactions.length; i++) {
      const transaction = sortedTransactions[i];
      
      if (processedIds.has(transaction.id)) continue;

      // Look for matching reversal within 7 days
      const matchingTransaction = sortedTransactions.find((other, otherIndex) => {
        if (otherIndex <= i || processedIds.has(other.id)) return false;
        
        const dateDiff = Math.abs(
          new Date(other.transaction_date).getTime() - 
          new Date(transaction.transaction_date).getTime()
        ) / (1000 * 60 * 60 * 24); // days
        
        const amountMatch = Math.abs(Math.abs(other.amount) - Math.abs(transaction.amount)) < 0.01;
        const oppositeSigns = (transaction.amount > 0) !== (other.amount > 0);
        const descriptionSimilar = this.isDescriptionSimilar(transaction.description, other.description);
        
        return dateDiff <= 7 && amountMatch && oppositeSigns && descriptionSimilar;
      });

      if (matchingTransaction) {
        // Found reversal pair
        const debit = transaction.amount < 0 ? transaction : matchingTransaction;
        const credit = transaction.amount > 0 ? transaction : matchingTransaction;
        
        reversalPairs.push({ debit, credit });
        processedIds.add(transaction.id);
        processedIds.add(matchingTransaction.id);
      } else {
        validTransactions.push(transaction);
      }
    }

    return { validTransactions, reversalPairs };
  }

  /**
   * Check if two descriptions are similar (for reversal detection)
   */
  private isDescriptionSimilar(desc1: string, desc2: string): boolean {
    const clean1 = desc1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = desc2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check if one contains the other or they share significant overlap
    return clean1.includes(clean2) || clean2.includes(clean1) || 
           this.calculateSimilarity(clean1, clean2) > 0.8;
  }

  /**
   * Calculate string similarity
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
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

  /**
   * Get month-year string from date
   */
  private getMonthYear(dateString: string): string {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Main classification method
   */
  public classifyTransactions(transactions: any[]): ClassifiedTransaction[] {
    console.log(`🧮 Classifying ${transactions.length} transactions...`);
    
    // First, detect and remove reversal pairs
    const { validTransactions, reversalPairs } = this.detectReversalPairs(transactions);
    
    console.log(`🔄 Found ${reversalPairs.length} reversal pairs, processing ${validTransactions.length} valid transactions`);

    return validTransactions.map(transaction => {
      const classification = this.classifyTransaction(
        transaction.description,
        transaction.amount,
        transaction.merchant,
        transaction.bankMetadata
      );

      const classifiedTransaction: ClassifiedTransaction = {
        id: transaction.id,
        date: transaction.transaction_date,
        amount: Math.abs(transaction.amount),
        description: transaction.description,
        merchant: transaction.merchant,
        category: classification.category,
        subcategory: classification.subcategory,
        isIncome: classification.isIncome,
        isExpense: classification.isExpense,
        isTransfer: classification.isTransfer,
        isReversal: classification.isReversal,
        isIgnored: classification.isTransfer || classification.isReversal,
        monthYear: this.getMonthYear(transaction.transaction_date),
        confidence: classification.confidence,
        bankMetadata: transaction.bankMetadata
      };

      return classifiedTransaction;
    });
  }

  /**
   * Calculate monthly summary from classified transactions
   */
  public calculateMonthlySummary(
    classifiedTransactions: ClassifiedTransaction[], 
    targetMonth?: string
  ): MonthlyClassification {
    // Determine the target month - use most common month if not specified
    let month = targetMonth;
    if (!month) {
      const monthCounts: { [key: string]: number } = {};
      classifiedTransactions.forEach(t => {
        monthCounts[t.monthYear] = (monthCounts[t.monthYear] || 0) + 1;
      });
      month = Object.entries(monthCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 
              new Date().toISOString().slice(0, 7);
    }

    // Filter transactions for the target month, excluding ignored transactions
    const monthTransactions = classifiedTransactions.filter(t => 
      t.monthYear === month && !t.isIgnored
    );

    const incomeTransactions = monthTransactions.filter(t => t.isIncome);
    const expenseTransactions = monthTransactions.filter(t => t.isExpense);
    const transferTransactions = classifiedTransactions.filter(t => t.isTransfer && t.monthYear === month);
    const reversalTransactions = classifiedTransactions.filter(t => t.isReversal && t.monthYear === month);

    const income = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const expenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    console.log(`📊 Monthly summary for ${month}:`, {
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      balance: balance.toFixed(2),
      savingsRate: savingsRate.toFixed(1) + '%',
      validTransactions: monthTransactions.length,
      transfersExcluded: transferTransactions.length,
      reversalsExcluded: reversalTransactions.length
    });

    return {
      income,
      expenses,
      balance,
      savingsRate,
      transactionCount: monthTransactions.length,
      month,
      incomeTransactions,
      expenseTransactions,
      transferTransactions,
      reversalTransactions
    };
  }

  /**
   * Remove duplicates across uploads
   */
  public async removeDuplicates(newTransactions: any[], userId: string): Promise<any[]> {
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('description, amount, transaction_date')
      .eq('user_id', userId);

    const existingSignatures = new Set(
      (existingTransactions || []).map(t => 
        `${t.transaction_date}-${Math.abs(t.amount)}-${t.description.substring(0, 100)}`.toLowerCase()
      )
    );

    const uniqueTransactions = newTransactions.filter(tx => {
      const signature = `${tx.transaction_date}-${Math.abs(tx.amount)}-${tx.description.substring(0, 100)}`.toLowerCase();
      return !existingSignatures.has(signature);
    });

    console.log(`🔍 Duplicate check: ${newTransactions.length} new, ${uniqueTransactions.length} unique, ${newTransactions.length - uniqueTransactions.length} duplicates removed`);

    return uniqueTransactions;
  }
}

export const transactionClassifier = new TransactionClassifier();