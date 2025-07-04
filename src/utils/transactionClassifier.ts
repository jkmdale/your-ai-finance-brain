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
  // Enhanced NZ bank transfer patterns - more conservative
  private transferPatterns = [
    // Explicit transfer keywords
    /\btransfer\b/i,
    /\btrf\b/i,
    /\bxfer\b/i,
    /transfer.*to.*account/i,
    /transfer.*from.*account/i,
    /internal.*transfer/i,
    /between.*accounts/i,
    /own.*account.*transfer/i,
    /account.*to.*account/i,
    
    // Specific transfer identifiers
    /from.*savings.*to/i,
    /to.*savings.*from/i,
    /savings.*transfer/i,
    /checking.*to.*savings/i,
    /loan.*advance/i, // Loan advances are transfers
    /balance.*transfer/i,
    
    // NZ-specific internal payment patterns
    /j\s*k\s*m\s*dale.*transfer/i, // Only if explicitly contains transfer
    /automatic.*payment.*internal/i,
    /ap\s+\d+.*transfer/i,
    /internet.*banking.*transfer/i,
    /online.*transfer/i,
    
    // Account number patterns - more specific
    /transfer.*\d{2}-\d{4}-\d{7}-\d{3}/,
    /\d{2}-\d{4}-\d{7}-\d{3}.*transfer/i,
    
    // Clear internal movement patterns
    /move.*money/i,
    /funds.*transfer/i,
    /account.*movement/i
  ];

  // Enhanced reversal patterns - more specific
  private reversalPatterns = [
    /\breversal\b/i,
    /\breverse\b/i,
    /\brefund\b/i,
    /\bcorrection\b/i,
    /\bcancelled\b/i,
    /\bfailed.*payment\b/i,
    /\breturned.*payment\b/i,
    /\bvoid\b/i,
    /\bdispute\b/i,
    /\bchargeback\b/i,
    /\bpending.*auth.*reversal/i,
    /\bdeclined.*reversal/i,
    /\berror.*correction/i,
    /\bauth.*reversal/i,
    /\bwrongly.*charged/i
  ];

  // Enhanced income patterns (external sources only) - more comprehensive
  private incomePatterns = {
    SALARY: [
      /\bsalary\b/i,
      /\bwage\b/i,
      /\bpayroll\b/i,
      /\bemployer\b/i,
      /\bpay.*period\b/i,
      /\bnet.*pay\b/i,
      /\bgross.*pay\b/i,
      /\bpayment.*salary\b/i,
      /pathway.*engineer/i, // Specific employer pattern
      /\bwages.*credit\b/i,
      /\bfortnightly.*pay\b/i,
      /\bweekly.*pay\b/i,
      /\bmonthly.*salary\b/i
    ],
    GOVERNMENT: [
      /\bird\b/i,
      /working.*for.*families/i,
      /accommodation.*supplement/i,
      /\bbenefit\b/i,
      /tax.*credit/i,
      /\bwinz\b/i,
      /\bstudylink\b/i,
      /government.*payment/i,
      /pension.*payment/i,
      /disability.*allowance/i,
      /family.*tax.*benefit/i,
      /child.*support.*payment/i
    ],
    INVESTMENT: [
      /\bdividend\b/i,
      /interest.*received/i,
      /\bcapital.*gain\b/i,
      /investment.*return/i,
      /\bsharesies\b/i,
      /kiwisaver.*contribution/i,
      /\bbond.*interest\b/i,
      /\bterm.*deposit.*interest\b/i,
      /\bmutual.*fund\b/i,
      /\betf.*dividend\b/i,
      /\bcrypto.*gain\b/i
    ],
    BUSINESS: [
      /\binvoice.*paid\b/i,
      /payment.*received/i,
      /\bfreelance\b/i,
      /\bcontractor.*payment\b/i,
      /client.*payment/i,
      /trade.*income/i,
      /\bbusiness.*income\b/i,
      /\bconsulting.*fee\b/i,
      /\bservice.*payment\b/i,
      /\bcommission\b/i
    ],
    RENTAL: [
      /rental.*income/i,
      /rent.*received/i,
      /property.*income/i,
      /tenant.*payment/i,
      /\bletting.*income\b/i
    ],
    OTHER_INCOME: [
      /\bgift.*received\b/i,
      /\blottery.*win\b/i,
      /\bcash.*back\b/i,
      /\bbonus.*payment\b/i,
      /\bprize.*money\b/i,
      /\binsurance.*payout\b/i,
      /\btax.*refund\b/i,
      /\brebate\b/i
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
   * Detect if transaction is a transfer between accounts - more conservative approach
   */
  private isTransfer(description: string, merchant?: string, amount?: number, bankMetadata?: any): boolean {
    const textToCheck = `${description} ${merchant || ''}`.toLowerCase();
    
    // Check against transfer patterns - must be explicit
    const hasTransferPattern = this.transferPatterns.some(pattern => pattern.test(textToCheck));
    
    // Check bank metadata for explicit transfer indicators
    const hasTransferMetadata = bankMetadata?.type === 'transfer' || 
                               bankMetadata?.code?.includes('TRF') ||
                               bankMetadata?.particulars?.toLowerCase().includes('transfer');
    
    // Only consider round amounts if there's also a transfer keyword
    const isRoundAmountWithKeyword = amount && 
                                   (amount % 100 === 0 || amount % 500 === 0) && 
                                   amount > 1000 && 
                                   hasTransferPattern;
    
    return hasTransferPattern || hasTransferMetadata || isRoundAmountWithKeyword;
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

    // For positive amounts, check income patterns ONLY if specific income patterns match
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
      
      // For positive amounts without income patterns, classify as ignored/other
      return {
        isIncome: false,
        isExpense: false,
        isTransfer: false,
        isReversal: false,
        category: 'Other',
        subcategory: 'UNCLASSIFIED_CREDIT',
        confidence: 0.3
      };
    }

    // For negative amounts, first check if it's a transfer or reversal
    if (amount < 0) {
      // Re-check transfers for negative amounts using same logic
      if (this.isTransfer(description, merchant, Math.abs(amount), bankMetadata)) {
        return {
          isIncome: false,
          isExpense: false,
          isTransfer: true,
          isReversal: false,
          category: 'Transfer',
          confidence: 0.9
        };
      }
      
      // Check expense patterns
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
      
      // For unmatched negative amounts, be conservative - might be transfers
      return {
        isIncome: false,
        isExpense: false,
        isTransfer: false,
        isReversal: false,
        category: 'Other',
        subcategory: 'UNCLASSIFIED_DEBIT',
        confidence: 0.3
      };
    }

    // Default fallback (should not reach here)
    return {
      isIncome: false,
      isExpense: false,
      isTransfer: false,
      isReversal: false,
      category: 'Other',
      subcategory: 'UNKNOWN',
      confidence: 0.1
    };
  }

  /**
   * Detect and remove reversal pairs - improved matching logic
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

      // Look for matching reversal within 14 days with improved matching
      const matchingTransaction = sortedTransactions.find((other, otherIndex) => {
        if (otherIndex <= i || processedIds.has(other.id)) return false;
        
        const dateDiff = Math.abs(
          new Date(other.transaction_date).getTime() - 
          new Date(transaction.transaction_date).getTime()
        ) / (1000 * 60 * 60 * 24); // days
        
        const amountMatch = Math.abs(Math.abs(other.amount) - Math.abs(transaction.amount)) < 0.01;
        const oppositeSigns = (transaction.amount > 0) !== (other.amount > 0);
        const descriptionSimilar = this.isDescriptionSimilar(transaction.description, other.description);
        const merchantSimilar = this.isDescriptionSimilar(transaction.merchant || '', other.merchant || '');
        
        return dateDiff <= 14 && amountMatch && oppositeSigns && (descriptionSimilar || merchantSimilar);
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
        isIgnored: classification.isTransfer || classification.isReversal || 
                   (classification.category === 'Other' && !classification.isIncome && !classification.isExpense),
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
   * Remove duplicates across uploads - improved matching
   */
  public async removeDuplicates(newTransactions: any[], userId: string): Promise<any[]> {
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('description, amount, transaction_date, merchant')
      .eq('user_id', userId);

    const existingSignatures = new Set(
      (existingTransactions || []).map(t => {
        const cleanDesc = t.description.replace(/[^a-z0-9]/gi, '').toLowerCase();
        const cleanMerchant = (t.merchant || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
        return `${t.transaction_date}-${Math.abs(t.amount)}-${cleanDesc}-${cleanMerchant}`;
      })
    );

    const uniqueTransactions = newTransactions.filter(tx => {
      const cleanDesc = tx.description.replace(/[^a-z0-9]/gi, '').toLowerCase();
      const cleanMerchant = (tx.merchant || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
      const signature = `${tx.transaction_date}-${Math.abs(tx.amount)}-${cleanDesc}-${cleanMerchant}`;
      return !existingSignatures.has(signature);
    });

    console.log(`🔍 Duplicate check: ${newTransactions.length} new, ${uniqueTransactions.length} unique, ${newTransactions.length - uniqueTransactions.length} duplicates removed`);

    return uniqueTransactions;
  }
}

export const transactionClassifier = new TransactionClassifier();