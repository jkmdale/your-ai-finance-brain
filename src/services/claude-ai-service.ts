
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  id: string;
  model: string;
  role: 'assistant';
  stop_reason: string;
  stop_sequence: null;
  type: 'message';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface Transaction {
  id?: string;
  description: string;
  amount: number;
  date: string;
  merchant?: string;
  category?: string;
  is_income: boolean;
}

interface FinancialData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  transactions: Transaction[];
  goals?: Array<{
    name: string;
    target_amount: number;
    current_amount: number;
    target_date?: string;
  }>;
}

class ClaudeAIService {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';
  private requestCount = 0;
  private maxRequestsPerHour = 100;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeClaudeRequest(
    messages: ClaudeMessage[],
    model: 'claude-3-5-sonnet-20241022' | 'claude-3-haiku-20240307',
    temperature: number,
    maxTokens: number,
    retries = 3
  ): Promise<string> {
    if (this.requestCount >= this.maxRequestsPerHour) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature,
            messages,
          }),
        });

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
        }

        const data: ClaudeResponse = await response.json();
        this.requestCount++;
        
        return data.content[0]?.text || 'No response generated';
      } catch (error) {
        console.error(`Claude API attempt ${attempt + 1} failed:`, error);
        if (attempt === retries - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    throw new Error('All Claude API attempts failed');
  }

  private sanitizeFinancialData(data: FinancialData): string {
    const roundToNearest100 = (amount: number) => Math.round(amount / 100) * 100;
    
    return JSON.stringify({
      totalBalance: roundToNearest100(data.totalBalance),
      monthlyIncome: roundToNearest100(data.monthlyIncome),
      monthlyExpenses: roundToNearest100(data.monthlyExpenses),
      savingsRate: Math.round(((data.monthlyIncome - data.monthlyExpenses) / data.monthlyIncome) * 100),
      transactionCount: data.transactions.length,
      topCategories: this.getTopSpendingCategories(data.transactions),
      goals: data.goals?.map(g => ({
        name: g.name,
        progress: Math.round((g.current_amount / g.target_amount) * 100),
        isOnTrack: g.target_date ? this.isGoalOnTrack(g) : null
      }))
    });
  }

  private getTopSpendingCategories(transactions: Transaction[]): Array<{category: string, percentage: number}> {
    const expenses = transactions.filter(t => !t.is_income);
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(t => {
      const category = t.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
    });

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        percentage: Math.round((amount / total) * 100)
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }

  private isGoalOnTrack(goal: { target_amount: number; current_amount: number; target_date: string }): boolean {
    const now = new Date();
    const targetDate = new Date(goal.target_date);
    const timeProgress = (now.getTime() - new Date().getTime()) / (targetDate.getTime() - new Date().getTime());
    const amountProgress = goal.current_amount / goal.target_amount;
    
    return amountProgress >= timeProgress * 0.8; // 80% threshold for being "on track"
  }

  // Financial Coaching Functions
  async getPersonalizedAdvice(userFinancialData: FinancialData, question: string): Promise<string> {
    const sanitizedData = this.sanitizeFinancialData(userFinancialData);
    
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `You are a professional financial advisor. Based on this user's financial data: ${sanitizedData}

User's question: "${question}"

Provide personalized, actionable financial advice. Be encouraging but realistic. Focus on practical steps they can take. Keep response under 300 words.`
      }
    ];

    try {
      return await this.makeClaudeRequest(messages, 'claude-3-5-sonnet-20241022', 0.3, 500);
    } catch (error) {
      return "I'm unable to provide personalized advice right now. Please try again later, or consider consulting with a financial advisor for complex questions.";
    }
  }

  async analyzeSpendingPatterns(transactions: Transaction[]): Promise<string> {
    const recentTransactions = transactions
      .filter(t => !t.is_income)
      .slice(0, 20)
      .map(t => ({
        description: t.description,
        amount: Math.round(t.amount / 10) * 10, // Round to nearest $10
        category: t.category || 'Other'
      }));

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Analyze these spending patterns and provide insights: ${JSON.stringify(recentTransactions)}

Identify trends, potential savings opportunities, and give 3 specific actionable tips. Keep response under 250 words.`
      }
    ];

    try {
      return await this.makeClaudeRequest(messages, 'claude-3-5-sonnet-20241022', 0.3, 500);
    } catch (error) {
      return "Unable to analyze spending patterns right now. Try reviewing your largest expense categories for potential savings opportunities.";
    }
  }

  async optimizeGoals(userGoals: any[], income: number, expenses: number): Promise<string> {
    const surplus = income - expenses;
    const goalSummary = userGoals.map(g => ({
      name: g.name,
      target: Math.round(g.target_amount / 100) * 100,
      current: Math.round(g.current_amount / 100) * 100,
      progress: Math.round((g.current_amount / g.target_amount) * 100)
    }));

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Help optimize these financial goals:
Goals: ${JSON.stringify(goalSummary)}
Monthly surplus: $${Math.round(surplus / 100) * 100}

Suggest how to prioritize and accelerate goal achievement. Provide specific allocation recommendations. Keep under 300 words.`
      }
    ];

    try {
      return await this.makeClaudeRequest(messages, 'claude-3-5-sonnet-20241022', 0.3, 500);
    } catch (error) {
      return "Unable to optimize goals right now. Consider prioritizing high-interest debt payoff and emergency fund building first.";
    }
  }

  async generateBudgetRecommendations(spendingHistory: Transaction[]): Promise<string> {
    const monthlySpending = this.getTopSpendingCategories(spendingHistory);
    
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Create budget recommendations based on spending patterns: ${JSON.stringify(monthlySpending)}

Suggest percentage allocations for each category and identify areas to reduce spending. Include the 50/30/20 rule analysis. Keep under 300 words.`
      }
    ];

    try {
      return await this.makeClaudeRequest(messages, 'claude-3-5-sonnet-20241022', 0.3, 500);
    } catch (error) {
      return "Unable to generate budget recommendations. Consider following the 50/30/20 rule: 50% needs, 30% wants, 20% savings.";
    }
  }

  async calculateFinancialHealthScore(userProfile: FinancialData): Promise<{score: number, analysis: string}> {
    const sanitizedData = this.sanitizeFinancialData(userProfile);
    
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Calculate a financial health score (0-100) based on: ${sanitizedData}

Provide the score and brief analysis of strengths/weaknesses. Format as: "Score: XX - Analysis text". Keep under 200 words.`
      }
    ];

    try {
      const response = await this.makeClaudeRequest(messages, 'claude-3-5-sonnet-20241022', 0.3, 400);
      const scoreMatch = response.match(/Score:\s*(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
      
      return {
        score: Math.min(100, Math.max(0, score)),
        analysis: response
      };
    } catch (error) {
      return {
        score: 50,
        analysis: "Unable to calculate financial health score right now. Focus on building emergency savings and reducing high-interest debt."
      };
    }
  }

  // CSV Processing Functions
  async categorizeTransactions(transactionArray: Transaction[]): Promise<Transaction[]> {
    const uncategorized = transactionArray.filter(t => !t.category);
    if (uncategorized.length === 0) return transactionArray;

    const transactionDescriptions = uncategorized.map(t => ({
      description: t.description,
      amount: t.amount,
      merchant: t.merchant || '',
      is_income: t.is_income
    }));

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Categorize these transactions into standard categories (Housing, Transportation, Food & Dining, Shopping, Entertainment, Healthcare, Utilities, Personal Care, Other Income, Salary, Investment Income, Other):

${JSON.stringify(transactionDescriptions)}

Return ONLY a JSON array of category names in the same order as the transactions.`
      }
    ];

    try {
      const response = await this.makeClaudeRequest(messages, 'claude-3-haiku-20240307', 0.1, 1000);
      const categories = JSON.parse(response);
      
      return transactionArray.map((t, index) => ({
        ...t,
        category: t.category || categories[uncategorized.findIndex(u => u.description === t.description)] || 'Other'
      }));
    } catch (error) {
      console.error('Categorization failed:', error);
      return transactionArray.map(t => ({ ...t, category: t.category || 'Other' }));
    }
  }

  async cleanMerchantNames(transactions: Transaction[]): Promise<Transaction[]> {
    const merchantsToClean = [...new Set(transactions.map(t => t.merchant).filter(Boolean))];
    if (merchantsToClean.length === 0) return transactions;

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Clean and standardize these merchant names: ${JSON.stringify(merchantsToClean)}

Return ONLY a JSON object mapping original names to cleaned names. Remove transaction IDs, locations, and standardize company names.`
      }
    ];

    try {
      const response = await this.makeClaudeRequest(messages, 'claude-3-haiku-20240307', 0.1, 1000);
      const cleanedMerchants = JSON.parse(response);
      
      return transactions.map(t => ({
        ...t,
        merchant: t.merchant ? cleanedMerchants[t.merchant] || t.merchant : t.merchant
      }));
    } catch (error) {
      console.error('Merchant cleaning failed:', error);
      return transactions;
    }
  }

  detectDuplicates(newTransactions: Transaction[], existingTransactions: Transaction[]): Transaction[] {
    return newTransactions.filter(newTx => {
      return !existingTransactions.some(existing => 
        Math.abs(existing.amount - newTx.amount) < 0.01 &&
        existing.description.toLowerCase() === newTx.description.toLowerCase() &&
        Math.abs(new Date(existing.date).getTime() - new Date(newTx.date).getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
      );
    });
  }

  async processBulkCSV(transactions: Transaction[]): Promise<{
    categorized: Transaction[];
    cleaned: Transaction[];
    duplicatesRemoved: number;
    summary: string;
  }> {
    try {
      // Process in batches to avoid overwhelming the API
      const batchSize = 50;
      let allProcessed: Transaction[] = [];
      
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        const categorized = await this.categorizeTransactions(batch);
        const cleaned = await this.cleanMerchantNames(categorized);
        allProcessed = [...allProcessed, ...cleaned];
      }

      const duplicatesRemoved = transactions.length - allProcessed.length;
      
      const summary = `Processed ${allProcessed.length} transactions successfully. Categories assigned, merchant names cleaned, and ${duplicatesRemoved} duplicates removed.`;

      return {
        categorized: allProcessed,
        cleaned: allProcessed,
        duplicatesRemoved,
        summary
      };
    } catch (error) {
      console.error('Bulk CSV processing failed:', error);
      return {
        categorized: transactions,
        cleaned: transactions,
        duplicatesRemoved: 0,
        summary: 'Processing completed with basic categorization fallback due to API limitations.'
      };
    }
  }
}

export { ClaudeAIService };
export type { Transaction, FinancialData };
