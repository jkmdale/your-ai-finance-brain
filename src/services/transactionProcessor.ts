
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
  confidence: number;
  subcategory?: string;
  isRecurring: boolean;
  accountType?: string;
}

interface MonthlyStats {
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
  categoryBreakdown: { [key: string]: number };
  expenseCategories: { [key: string]: number };
  incomeCategories: { [key: string]: number };
}

interface FinancialHealthMetrics {
  riskLevel: 'HEALTHY' | 'MODERATE_RISK' | 'HIGH_RISK' | 'CRISIS';
  deficitPercentage: number;
  expenseRatio: number;
  discretionaryRatio: number;
  recommendations: string[];
}

export class TransactionProcessor {
  // Enhanced account patterns for comprehensive transfer detection
  private accountPatterns = [
    /06-0817/,           // Main account number pattern
    /9171$/,             // Credit card ending
    /88419319/,          // Loan account
    /662330/,            // KiwiSaver account
    /internal.*transfer/i,
    /account.*transfer/i,
    /between.*accounts/i,
    /payment.*to.*account/i,
    /transfer.*from/i,
    /transfer.*to/i,
    /trf/i,
    /xfer/i
  ];

  // Comprehensive income source patterns
  private incomePatterns = {
    SALARY: [
      /pathway.*engineer/i,
      /salary/i,
      /wage/i,
      /payroll/i,
      /employer/i,
      /income/i
    ],
    GOVERNMENT: [
      /ird/i,
      /working.*for.*families/i,
      /accommodation.*supplement/i,
      /benefit/i,
      /tax.*credit/i
    ],
    INVESTMENT: [
      /dividend/i,
      /interest.*received/i,
      /capital.*gain/i,
      /investment.*return/i
    ],
    BUSINESS: [
      /invoice/i,
      /payment.*received/i,
      /freelance/i,
      /contractor/i
    ],
    REFUNDS: [
      /refund/i,
      /return/i,
      /reimbursement/i,
      /cashback/i
    ]
  };

  // Detailed expense categories with NZ-specific patterns
  private expenseCategories = {
    // Housing (Essential)
    MORTGAGE: [/loan.*payment/i, /mortgage/i, /home.*loan/i],
    RATES: [/rates/i, /council/i, /city.*council/i],
    POWER: [/powershop/i, /meridian/i, /contact.*energy/i, /genesis/i, /electric/i],
    INSURANCE: [/vero/i, /partners.*life/i, /aa.*insurance/i, /state.*insurance/i, /insurance/i],
    INTERNET: [/spark/i, /vodafone/i, /2degrees/i, /internet/i, /broadband/i],
    
    // Family (Essential)
    CHILDCARE: [/grow.*active/i, /daycare/i, /kindergarten/i, /childcare/i, /babysitter/i],
    EDUCATION: [/school/i, /university/i, /course.*fees/i, /tuition/i],
    KIDS_ACTIVITIES: [/swimming/i, /sports.*club/i, /music.*lessons/i, /ballet/i],
    
    // Living Expenses (Essential)
    GROCERIES: [/new.*world/i, /countdown/i, /pak.*n.*save/i, /woolworths/i, /four.*square/i, /supermarket/i],
    FUEL: [/bp.*connect/i, /mobil/i, /z.*energy/i, /caltex/i, /petrol/i, /gas.*station/i],
    PHONE: [/2degrees/i, /vodafone/i, /spark/i, /mobile/i, /phone.*bill/i],
    HEALTHCARE: [/chemist/i, /pharmacy/i, /doctor/i, /medical/i, /hospital/i, /dental/i],
    
    // Discretionary
    DINING: [/kfc/i, /mcdonalds/i, /subway/i, /uber.*eats/i, /restaurant/i, /cafe/i, /takeaway/i],
    ENTERTAINMENT: [/spotify/i, /netflix/i, /sky/i, /google/i, /youtube/i, /movie/i, /cinema/i],
    FITNESS: [/gym/i, /fitness/i, /aquagym/i, /yoga/i, /pilates/i],
    SHOPPING: [/warehouse/i, /kmart/i, /farmers/i, /clothing/i, /amazon/i, /trademe/i],
    HOME_HARDWARE: [/bunnings/i, /mitre.*10/i, /hardware/i, /home.*depot/i],
    TRAVEL: [/singapore.*airlines/i, /jetstar/i, /air.*new.*zealand/i, /hotel/i, /accommodation/i],
    
    // Financial
    INVESTMENTS: [/sharesies/i, /kiwisaver/i, /investment/i, /shares/i],
    BANK_FEES: [/monthly.*fee/i, /overdraft/i, /bank.*fee/i, /transaction.*fee/i],
    CREDIT_CARD: [/credit.*card.*payment/i, /visa/i, /mastercard/i]
  };

  private isTransfer(description: string, merchant?: string, amount?: number): boolean {
    const textToCheck = `${description} ${merchant || ''}`.toLowerCase();
    
    // Check for account number patterns
    const hasAccountPattern = this.accountPatterns.some(pattern => pattern.test(textToCheck));
    
    // Check for transfer keywords
    const hasTransferKeywords = /transfer|payment.*to.*account|internal|between.*accounts/.test(textToCheck);
    
    // Check for round amounts (often transfers)
    const isRoundAmount = amount && (amount % 50 === 0 || amount % 100 === 0) && amount > 500;
    
    return hasAccountPattern || hasTransferKeywords || (isRoundAmount && hasTransferKeywords);
  }

  private categorizeTransaction(description: string, amount: number, merchant?: string): {
    isIncome: boolean;
    category: string;
    subcategory?: string;
    isTransfer: boolean;
    confidence: number;
    isRecurring: boolean;
  } {
    const textToCheck = `${description} ${merchant || ''}`.toLowerCase();
    
    // First check if it's a transfer
    if (this.isTransfer(description, merchant, amount)) {
      return {
        isIncome: false,
        category: 'Transfer',
        isTransfer: true,
        confidence: 0.95,
        isRecurring: false
      };
    }

    // Check for income patterns
    for (const [incomeType, patterns] of Object.entries(this.incomePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(textToCheck)) {
          return {
            isIncome: true,
            category: 'Income',
            subcategory: incomeType,
            isTransfer: false,
            confidence: 0.9,
            isRecurring: incomeType === 'SALARY'
          };
        }
      }
    }

    // Check for expense patterns
    for (const [expenseType, patterns] of Object.entries(this.expenseCategories)) {
      for (const pattern of patterns) {
        if (pattern.test(textToCheck)) {
          const isEssential = ['MORTGAGE', 'RATES', 'POWER', 'INSURANCE', 'GROCERIES', 'FUEL', 'HEALTHCARE', 'CHILDCARE'].includes(expenseType);
          return {
            isIncome: false,
            category: 'Expense',
            subcategory: expenseType,
            isTransfer: false,
            confidence: 0.85,
            isRecurring: isEssential
          };
        }
      }
    }

    // Default categorization based on amount and patterns
    if (amount > 0) {
      return {
        isIncome: true,
        category: 'Income',
        subcategory: 'OTHER',
        isTransfer: false,
        confidence: 0.6,
        isRecurring: false
      };
    } else {
      return {
        isIncome: false,
        category: 'Expense',
        subcategory: 'OTHER',
        isTransfer: false,
        confidence: 0.6,
        isRecurring: false
      };
    }
  }

  private getMonthYear(dateString: string): string {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  public processTransactions(transactions: any[]): ProcessedTransaction[] {
    return transactions.map(transaction => {
      // Prioritize merchant field over description for display
      const merchantName = transaction.merchant && transaction.merchant.trim() ? transaction.merchant.trim() : null;
      const description = transaction.description && transaction.description.trim() ? transaction.description.trim() : '';
      
      // Use merchant name if available and not a card number
      const displayDescription = this.getDisplayDescription(merchantName, description);
      
      const categorization = this.categorizeTransaction(
        displayDescription,
        transaction.amount,
        merchantName
      );

      return {
        id: transaction.id,
        date: transaction.transaction_date,
        amount: Math.abs(transaction.amount),
        description: displayDescription,
        merchant: merchantName,
        category: categorization.subcategory || categorization.category,
        isIncome: categorization.isIncome,
        isTransfer: categorization.isTransfer,
        isIgnored: categorization.isTransfer,
        monthYear: this.getMonthYear(transaction.transaction_date),
        confidence: categorization.confidence,
        subcategory: categorization.subcategory,
        isRecurring: categorization.isRecurring,
        accountType: this.detectAccountType(displayDescription)
      };
    });
  }

  private getDisplayDescription(merchant: string | null, description: string): string {
    // If we have a merchant that's not a card number, use it
    if (merchant && !this.isCardNumber(merchant)) {
      return merchant;
    }
    
    // If description is not a card number, use it
    if (description && !this.isCardNumber(description)) {
      return description;
    }
    
    // If both are card numbers or empty, prefer merchant, then description
    return merchant || description || 'Unknown Transaction';
  }

  private isCardNumber(text: string): boolean {
    if (!text) return false;
    
    // Check for card number patterns (e.g., "4835-****-4301 Df", "**** 1234", etc.)
    const cardPatterns = [
      /\d{4}[\s\-\*]*\*{4}[\s\-\*]*\d{4}/,  // 4835-****-4301
      /\*{4}[\s\-]*\d{4}/,                   // **** 1234
      /\d{4}[\s\-]*\*{4}/,                   // 1234 ****
      /\d{4}[\s\-\*]{1,3}\d{4}[\s\-\*]{1,3}\d{4}[\s\-\*]{1,3}\d{4}/, // Full card numbers
    ];
    
    return cardPatterns.some(pattern => pattern.test(text.trim()));
  }

  private detectAccountType(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('credit card') || desc.includes('visa') || desc.includes('mastercard')) return 'CREDIT_CARD';
    if (desc.includes('savings') || desc.includes('save')) return 'SAVINGS';
    if (desc.includes('kiwisaver')) return 'KIWISAVER';
    if (desc.includes('loan') || desc.includes('mortgage')) return 'LOAN';
    return 'CHECKING';
  }

  public calculateMonthlyStats(transactions: ProcessedTransaction[], targetMonth?: string): MonthlyStats {
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

    // Category breakdown
    const categoryBreakdown: { [key: string]: number } = {};
    const expenseCategories: { [key: string]: number } = {};
    const incomeCategories: { [key: string]: number } = {};

    monthTransactions.forEach(t => {
      if (!categoryBreakdown[t.category]) categoryBreakdown[t.category] = 0;
      categoryBreakdown[t.category] += t.amount;

      if (t.isIncome) {
        if (!incomeCategories[t.category]) incomeCategories[t.category] = 0;
        incomeCategories[t.category] += t.amount;
      } else {
        if (!expenseCategories[t.category]) expenseCategories[t.category] = 0;
        expenseCategories[t.category] += t.amount;
      }
    });

    return {
      income,
      expenses,
      balance,
      savingsRate,
      transactionCount: monthTransactions.length,
      categoryBreakdown,
      expenseCategories,
      incomeCategories
    };
  }

  public assessFinancialHealth(stats: MonthlyStats): FinancialHealthMetrics {
    const deficitPercentage = stats.income > 0 ? ((stats.expenses - stats.income) / stats.income) * 100 : 0;
    const expenseRatio = stats.income > 0 ? (stats.expenses / stats.income) * 100 : 0;
    
    // Calculate discretionary spending ratio
    const discretionaryCategories = ['DINING', 'ENTERTAINMENT', 'SHOPPING', 'TRAVEL'];
    const discretionarySpending = Object.entries(stats.expenseCategories)
      .filter(([category]) => discretionaryCategories.includes(category))
      .reduce((sum, [, amount]) => sum + amount, 0);
    
    const discretionaryRatio = stats.income > 0 ? (discretionarySpending / stats.income) * 100 : 0;

    // Determine risk level
    let riskLevel: 'HEALTHY' | 'MODERATE_RISK' | 'HIGH_RISK' | 'CRISIS';
    if (deficitPercentage > 50) riskLevel = 'CRISIS';
    else if (deficitPercentage > 20) riskLevel = 'HIGH_RISK';
    else if (deficitPercentage > 5) riskLevel = 'MODERATE_RISK';
    else riskLevel = 'HEALTHY';

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (deficitPercentage > 0) {
      recommendations.push(`You're spending ${deficitPercentage.toFixed(1)}% more than you earn`);
    }
    
    if (discretionaryRatio > 15) {
      recommendations.push(`Consider reducing discretionary spending (${discretionaryRatio.toFixed(1)}% of income)`);
    }
    
    if (stats.expenseCategories['DINING'] > stats.income * 0.1) {
      recommendations.push('Dining out expenses are high - consider cooking more at home');
    }

    if (riskLevel === 'CRISIS') {
      recommendations.push('URGENT: Your financial situation requires immediate attention');
    }

    return {
      riskLevel,
      deficitPercentage,
      expenseRatio,
      discretionaryRatio,
      recommendations
    };
  }

  public validateRealisticNumbers(stats: MonthlyStats): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;

    // Check for unrealistic monthly income (over $15,000 NZD is suspicious for individual)
    if (stats.income > 15000) {
      warnings.push(`Monthly income of $${stats.income.toLocaleString()} seems unrealistic - check for transfer inclusion`);
      isValid = false;
    }

    // Check for negative savings rate over -100%
    if (stats.savingsRate < -100) {
      warnings.push(`Savings rate of ${stats.savingsRate.toFixed(1)}% indicates severe financial deficit`);
      isValid = false;
    }

    // Check for savings rate over 80% (unusual but not impossible)
    if (stats.savingsRate > 80) {
      warnings.push(`Savings rate of ${stats.savingsRate.toFixed(1)}% is unusually high - verify calculations`);
    }

    // Check for zero income with expenses
    if (stats.income === 0 && stats.expenses > 0) {
      warnings.push('No income detected but expenses found - check income categorization');
      isValid = false;
    }

    return { isValid, warnings };
  }

  public getTransferSummary(transactions: ProcessedTransaction[]): {
    totalTransfers: number;
    transferCount: number;
    excludedFromIncome: number;
    transfersByMonth: { [key: string]: number };
  } {
    const transfers = transactions.filter(t => t.isTransfer);
    const totalTransfers = transfers.reduce((sum, t) => sum + t.amount, 0);
    const excludedFromIncome = transfers.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);

    // Group transfers by month
    const transfersByMonth: { [key: string]: number } = {};
    transfers.forEach(t => {
      if (!transfersByMonth[t.monthYear]) transfersByMonth[t.monthYear] = 0;
      transfersByMonth[t.monthYear] += t.amount;
    });

    return {
      totalTransfers,
      transferCount: transfers.length,
      excludedFromIncome,
      transfersByMonth
    };
  }

  public getSpendingInsights(transactions: ProcessedTransaction[], months: number = 3): Array<{
    category: string;
    monthlyAverage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    isDiscretionary: boolean;
    recommendation?: string;
  }> {
    const discretionaryCategories = ['DINING', 'ENTERTAINMENT', 'SHOPPING', 'TRAVEL'];
    const insights: Array<{
      category: string;
      monthlyAverage: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      isDiscretionary: boolean;
      recommendation?: string;
    }> = [];

    // Group transactions by category and month
    const categoryByMonth: { [category: string]: { [month: string]: number } } = {};
    
    transactions.filter(t => !t.isTransfer && !t.isIncome).forEach(t => {
      if (!categoryByMonth[t.category]) categoryByMonth[t.category] = {};
      if (!categoryByMonth[t.category][t.monthYear]) categoryByMonth[t.category][t.monthYear] = 0;
      categoryByMonth[t.category][t.monthYear] += t.amount;
    });

    // Calculate insights for each category
    Object.entries(categoryByMonth).forEach(([category, monthlyData]) => {
      const amounts = Object.values(monthlyData);
      const monthlyAverage = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
      
      // Determine trend (simplified)
      const trend = amounts.length > 1 ? 
        (amounts[amounts.length - 1] > amounts[0] ? 'increasing' : 
         amounts[amounts.length - 1] < amounts[0] ? 'decreasing' : 'stable') : 'stable';

      const isDiscretionary = discretionaryCategories.includes(category);
      
      let recommendation: string | undefined;
      if (isDiscretionary && monthlyAverage > 300) {
        recommendation = `Consider reducing ${category.toLowerCase()} spending to save $${Math.round(monthlyAverage * 0.3)}/month`;
      }

      insights.push({
        category,
        monthlyAverage,
        trend,
        isDiscretionary,
        recommendation
      });
    });

    return insights.sort((a, b) => b.monthlyAverage - a.monthlyAverage);
  }
}

export const transactionProcessor = new TransactionProcessor();
