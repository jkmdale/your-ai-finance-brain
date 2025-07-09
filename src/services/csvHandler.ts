/**
 * CSV Handler - Complete CSV processing module for mobile-first finance PWA
 * Handles multiple NZ bank CSV uploads, Claude categorization, budget generation, and dashboard updates
 */

import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';

// Types
interface NormalizedTransaction {
  date: string;
  description: string;
  amount: number;
  source_bank?: string;
  category?: string;
  is_income?: boolean;
}

interface ProcessingResult {
  success: boolean;
  processed: number;
  categorized: number;
  budgetGenerated: boolean;
  smartGoals: number;
  errors: string[];
}

interface BankFormat {
  name: string;
  dateColumn: number;
  descriptionColumn: number;
  amountColumn: number;
  headerPatterns: string[];
}

// Bank format configurations
const BANK_FORMATS: BankFormat[] = [
  {
    name: 'ANZ',
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 2,
    headerPatterns: ['date', 'description', 'amount', 'balance']
  },
  {
    name: 'ASB',
    dateColumn: 0,
    descriptionColumn: 2,
    amountColumn: 3,
    headerPatterns: ['date', 'unique id', 'tran detail', 'amount']
  },
  {
    name: 'BNZ',
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 2,
    headerPatterns: ['date', 'payee', 'amount', 'particulars']
  },
  {
    name: 'Kiwibank',
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 2,
    headerPatterns: ['date', 'memo/description', 'amount']
  },
  {
    name: 'Westpac',
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 2,
    headerPatterns: ['date', 'narrative', 'amount', 'running balance']
  }
];

class CSVHandler {
  private transactions: NormalizedTransaction[] = [];
  private categorizedTransactions: NormalizedTransaction[] = [];
  private budget: any = null;
  private smartGoals: any[] = [];

  /**
   * Main entry point - process multiple CSV files
   */
  async processMultipleCSVs(
    files: FileList,
    userId: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      success: false,
      processed: 0,
      categorized: 0,
      budgetGenerated: false,
      smartGoals: 0,
      errors: []
    };

    try {
      onProgress?.('Starting CSV processing...', 5);
      
      // Step 1: Parse and normalize all CSV files
      await this.parseMultipleCSVs(files, onProgress);
      result.processed = this.transactions.length;

      if (this.transactions.length === 0) {
        result.errors.push('No valid transactions found in CSV files');
        return result;
      }

      onProgress?.('Categorizing transactions with Claude AI...', 30);

      // Step 2: Send to Claude for categorization in batches
      await this.categorizeWithClaude(onProgress);
      result.categorized = this.categorizedTransactions.length;

      onProgress?.('Saving to database...', 60);

      // Step 3: Save to Supabase
      await this.saveToDatabase(userId);

      onProgress?.('Generating zero-based budget...', 75);

      // Step 4: Generate budget
      this.budget = await this.generateZeroBasedBudget(this.categorizedTransactions);
      result.budgetGenerated = !!this.budget;

      onProgress?.('Creating SMART goals...', 85);

      // Step 5: Generate SMART goals
      this.smartGoals = await this.generateSmartGoals(this.budget);
      result.smartGoals = this.smartGoals.length;

      onProgress?.('Updating dashboard...', 95);

      // Step 6: Update dashboard
      await this.updateDashboard();

      onProgress?.('Complete!', 100);
      result.success = true;

    } catch (error: any) {
      console.error('CSV processing error:', error);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Parse multiple CSV files and normalize formats
   */
  private async parseMultipleCSVs(
    files: FileList,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<void> {
    this.transactions = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const progress = 5 + ((i / totalFiles) * 20);
      onProgress?.(`Processing ${file.name}...`, progress);

      try {
        const csvData = await this.readFileAsText(file);
        const parsed = Papa.parse(csvData, {
          header: false,
          skipEmptyLines: true,
          transformHeader: (header) => header.toLowerCase().trim()
        });

        if (parsed.errors.length > 0) {
          console.warn(`Parsing errors in ${file.name}:`, parsed.errors);
        }

        const normalized = this.detectAndMapCSV(parsed.data as string[][], file.name);
        this.transactions.push(...normalized);

      } catch (error: any) {
        console.error(`Failed to process ${file.name}:`, error);
      }
    }

    console.log(`📊 Processed ${this.transactions.length} transactions from ${totalFiles} files`);
  }

  /**
   * Detect bank format and normalize CSV data
   */
  private detectAndMapCSV(rows: string[][], fileName: string): NormalizedTransaction[] {
    if (rows.length < 2) {
      console.warn(`⚠️ ${fileName}: Insufficient data (less than 2 rows)`);
      return [];
    }

    const header = rows[0].map(col => col.toLowerCase().trim());
    const format = this.detectBankFormat(header, fileName);
    
    if (!format) {
      console.warn(`⚠️ ${fileName}: Unknown bank format`);
      return [];
    }

    console.log(`🏦 ${fileName}: Detected ${format.name} format`);

    const transactions: NormalizedTransaction[] = [];
    const dataRows = rows.slice(1); // Skip header

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      try {
        const normalized = this.mapRowToStandardFormat(row, format);
        if (normalized) {
          normalized.source_bank = format.name;
          transactions.push(normalized);
        }
      } catch (error) {
        console.warn(`⚠️ ${fileName} row ${i + 2}: ${error}`);
      }
    }

    return transactions;
  }

  /**
   * Detect bank format from header patterns
   */
  private detectBankFormat(header: string[], fileName: string): BankFormat | null {
    // First try filename detection
    const filenameLower = fileName.toLowerCase();
    for (const format of BANK_FORMATS) {
      if (filenameLower.includes(format.name.toLowerCase())) {
        return format;
      }
    }

    // Then try header pattern matching
    for (const format of BANK_FORMATS) {
      const matches = format.headerPatterns.filter(pattern => 
        header.some(col => col.includes(pattern))
      );
      
      if (matches.length >= 2) { // At least 2 pattern matches
        return format;
      }
    }

    return null;
  }

  /**
   * Map individual row to standard format
   */
  private mapRowToStandardFormat(row: string[], format: BankFormat): NormalizedTransaction | null {
    if (row.length < Math.max(format.dateColumn, format.descriptionColumn, format.amountColumn) + 1) {
      throw new Error(`Insufficient columns (${row.length})`);
    }

    // Parse date
    const dateStr = row[format.dateColumn]?.trim();
    if (!dateStr) {
      throw new Error('Missing date');
    }

    const date = this.parseDate(dateStr);
    if (!date) {
      throw new Error(`Invalid date: ${dateStr}`);
    }

    // Parse description
    const description = row[format.descriptionColumn]?.trim();
    if (!description) {
      throw new Error('Missing description');
    }

    // Parse amount
    const amountStr = row[format.amountColumn]?.trim();
    if (!amountStr) {
      throw new Error('Missing amount');
    }

    const amount = this.parseAmount(amountStr);
    if (isNaN(amount)) {
      throw new Error(`Invalid amount: ${amountStr}`);
    }

    return {
      date,
      description: description.substring(0, 255), // Limit length
      amount: Math.abs(amount),
      is_income: amount > 0
    };
  }

  /**
   * Parse date from various formats
   */
  private parseDate(dateStr: string): string | null {
    if (!dateStr?.trim()) {
      console.warn('Empty date string provided');
      return null;
    }

    const cleanDateStr = String(dateStr).trim();
    console.log(`🗓️ Parsing date: "${cleanDateStr}"`);
    
    // NZ bank date format patterns
    const patterns = [
      // DD/MM/YYYY (most common NZ format)
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy' },
      // DD/MM/YY (2-digit year)
      { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy2' },
      // YYYY-MM-DD (ISO format)
      { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd' },
      // Compact formats: DDMMYYYY, YYYYMMDD
      { regex: /^(\d{2})(\d{2})(\d{4})$/, type: 'dmy_compact' },
      { regex: /^(\d{4})(\d{2})(\d{2})$/, type: 'ymd_compact' }
    ];

    for (const pattern of patterns) {
      const match = cleanDateStr.match(pattern.regex);
      if (match) {
        try {
          let day: number, month: number, year: number;
          
          if (pattern.type === 'ymd' || pattern.type === 'ymd_compact') {
            [, year, month, day] = match.map(Number);
          } else if (pattern.type === 'dmy2') {
            [, day, month, year] = match.map(Number);
            // Convert 2-digit year to 4-digit (assume 50+ = 19xx, otherwise 20xx)
            year = year > 50 ? 1900 + year : 2000 + year;
          } else {
            [, day, month, year] = match.map(Number);
          }
          
          // Validate ranges
          if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
            console.warn(`Invalid date ranges: ${day}/${month}/${year}`);
            continue;
          }
          
          // Create date object (month is 0-indexed in JS)
          const date = new Date(year, month - 1, day);
          
          // Verify the date is valid (handles leap years, month days, etc.)
          if (date.getFullYear() === year && 
              date.getMonth() === month - 1 && 
              date.getDate() === day) {
            const formattedDate = date.toISOString().split('T')[0];
            console.log(`✅ Date parsed successfully: ${formattedDate}`);
            return formattedDate;
          }
        } catch (error) {
          console.error(`Date parsing error for "${cleanDateStr}":`, error);
          continue;
        }
      }
    }
    
    console.warn(`❌ Could not parse date: "${cleanDateStr}"`);
    return null;
  }

  /**
   * Parse amount from string
   */
  private parseAmount(amountStr: string): number {
    // Remove currency symbols, commas, and spaces
    const cleaned = amountStr.replace(/[$,\s]/g, '');
    
    // Handle negative amounts (brackets or minus sign)
    let isNegative = false;
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      isNegative = true;
    } else if (cleaned.startsWith('-')) {
      isNegative = true;
    }

    const numStr = cleaned.replace(/[()+-]/g, '');
    const amount = parseFloat(numStr);
    
    return isNegative ? -amount : amount;
  }

  /**
   * Categorize transactions using Claude AI in batches
   */
  private async categorizeWithClaude(onProgress?: (stage: string, progress: number) => void): Promise<void> {
    const BATCH_SIZE = 20;
    const batches = this.chunkArray(this.transactions, BATCH_SIZE);
    this.categorizedTransactions = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const progress = 30 + ((i / batches.length) * 25);
      onProgress?.(`Categorizing batch ${i + 1}/${batches.length}...`, progress);

      try {
        const categorized = await this.categorizeBatch(batch);
        this.categorizedTransactions.push(...categorized);
        
        // Small delay to avoid rate limiting
        if (i < batches.length - 1) {
          await this.sleep(500);
        }
      } catch (error) {
        console.error(`Failed to categorize batch ${i + 1}:`, error);
        
        // Add uncategorized transactions as fallback
        this.categorizedTransactions.push(...batch.map(tx => ({
          ...tx,
          category: 'Other'
        })));
      }
    }
  }

  /**
   * Categorize a single batch using Claude
   */
  private async categorizeBatch(batch: NormalizedTransaction[]): Promise<NormalizedTransaction[]> {
    const prompt = `Categorize the following financial transactions. Respond as a JSON array with fields: date, description, amount, category. Use these categories: Housing, Transportation, Food & Dining, Utilities, Healthcare, Entertainment, Shopping, Personal Care, Education, Savings, Salary, Investment Income, Other Income, Other.

Transactions:
${batch.map(tx => `${tx.date}: ${tx.description} - $${tx.amount}`).join('\n')}`;

    try {
      const response = await supabase.functions.invoke('claude-api-proxy', {
        body: {
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      const categorizedData = JSON.parse(result.content);

      // Map back to our format
      return batch.map((tx, index) => ({
        ...tx,
        category: categorizedData[index]?.category || 'Other'
      }));

    } catch (error) {
      console.error('Claude categorization failed:', error);
      throw error;
    }
  }

  /**
   * Save transactions to Supabase
   */
  private async saveToDatabase(userId: string): Promise<void> {
    // Ensure user has a bank account
    let { data: accounts } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    let accountId: string;
    if (!accounts || accounts.length === 0) {
      const { data: newAccount, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: userId,
          account_name: 'CSV Imports',
          bank_name: 'Mixed Banks',
          account_type: 'checking',
          currency: 'NZD',
          balance: 0
        })
        .select('id')
        .single();

      if (error) throw error;
      accountId = newAccount.id;
    } else {
      accountId = accounts[0].id;
    }

    // Prepare transactions for database
    const transactionsToInsert = this.categorizedTransactions.map(tx => ({
      user_id: userId,
      account_id: accountId,
      transaction_date: tx.date,
      description: tx.description,
      amount: tx.amount,
      is_income: tx.is_income,
      imported_from: `CSV - ${tx.source_bank}`,
      merchant: this.extractMerchant(tx.description)
    }));

    // Insert in batches to avoid timeout
    const BATCH_SIZE = 100;
    const batches = this.chunkArray(transactionsToInsert, BATCH_SIZE);

    for (const batch of batches) {
      const { error } = await supabase
        .from('transactions')
        .insert(batch);

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }
    }
  }

  /**
   * Generate zero-based budget from categorized transactions
   */
  private async generateZeroBasedBudget(transactions: NormalizedTransaction[]): Promise<any> {
    const categoryTotals: { [key: string]: number } = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    // Calculate totals by category
    transactions.forEach(tx => {
      const category = tx.category || 'Other';
      
      if (tx.is_income) {
        totalIncome += tx.amount;
      } else {
        totalExpenses += tx.amount;
        categoryTotals[category] = (categoryTotals[category] || 0) + tx.amount;
      }
    });

    const budget = {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
      categories: Object.entries(categoryTotals).map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      })).sort((a, b) => b.amount - a.amount),
      recommendations: this.generateBudgetRecommendations(categoryTotals, totalIncome)
    };

    return budget;
  }

  /**
   * Generate budget recommendations
   */
  private generateBudgetRecommendations(categories: { [key: string]: number }, totalIncome: number): string[] {
    const recommendations: string[] = [];
    const housingSpend = categories['Housing'] || 0;
    const transportSpend = categories['Transportation'] || 0;
    const foodSpend = categories['Food & Dining'] || 0;

    // Housing should be < 30% of income
    if (housingSpend > totalIncome * 0.3) {
      recommendations.push('Consider reducing housing costs - aim for less than 30% of income');
    }

    // Transportation should be < 15% of income
    if (transportSpend > totalIncome * 0.15) {
      recommendations.push('Transportation costs are high - consider carpooling or public transport');
    }

    // Food should be < 12% of income
    if (foodSpend > totalIncome * 0.12) {
      recommendations.push('Food spending is above recommended 12% - try meal planning and cooking at home');
    }

    return recommendations;
  }

  /**
   * Generate SMART financial goals
   */
  private async generateSmartGoals(budget: any): Promise<any[]> {
    const goals: any[] = [];

    // Emergency fund goal
    const monthlyExpenses = budget.totalExpenses;
    const emergencyTarget = monthlyExpenses * 3;
    
    goals.push({
      name: 'Build Emergency Fund',
      target: emergencyTarget,
      timeframe: '12 months',
      specific: `Save $${emergencyTarget.toLocaleString()} for 3 months of expenses`,
      measurable: `Monthly savings target: $${(emergencyTarget / 12).toLocaleString()}`,
      achievable: 'Automate savings and reduce discretionary spending',
      relevant: 'Essential for financial security and peace of mind',
      timeBound: 'Complete within 12 months'
    });

    // Savings rate improvement
    if (budget.savingsRate < 20) {
      const targetSavings = budget.totalIncome * 0.2;
      goals.push({
        name: 'Improve Savings Rate',
        target: targetSavings,
        timeframe: '6 months',
        specific: `Increase monthly savings to $${targetSavings.toLocaleString()} (20% of income)`,
        measurable: `Current: ${budget.savingsRate.toFixed(1)}%, Target: 20%`,
        achievable: 'Review and optimize spending in top categories',
        relevant: 'Building wealth and financial independence',
        timeBound: 'Achieve 20% savings rate within 6 months'
      });
    }

    // Category-specific reduction goal
    const topCategory = budget.categories[0];
    if (topCategory && topCategory.percentage > 15) {
      const reductionTarget = topCategory.amount * 0.8;
      goals.push({
        name: `Reduce ${topCategory.name} Spending`,
        target: reductionTarget,
        timeframe: '3 months',
        specific: `Reduce ${topCategory.name} spending by 20%`,
        measurable: `From $${topCategory.amount.toLocaleString()} to $${reductionTarget.toLocaleString()}`,
        achievable: 'Find alternatives and optimize spending habits',
        relevant: `${topCategory.name} represents ${topCategory.percentage.toFixed(1)}% of expenses`,
        timeBound: 'Achieve reduction within 3 months'
      });
    }

    return goals.slice(0, 3); // Return max 3 goals
  }

  /**
   * Update dashboard with new data
   */
  private async updateDashboard(): Promise<void> {
    // Trigger custom event for dashboard update
    const dashboardData = {
      transactions: this.categorizedTransactions,
      budget: this.budget,
      smartGoals: this.smartGoals,
      summary: {
        totalTransactions: this.categorizedTransactions.length,
        totalIncome: this.budget?.totalIncome || 0,
        totalExpenses: this.budget?.totalExpenses || 0,
        topCategories: this.budget?.categories?.slice(0, 5) || []
      }
    };

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('csv-processing-complete', {
      detail: dashboardData
    }));

    console.log('📊 Dashboard updated with new financial data');
  }

  /**
   * Get processed data for AI coach
   */
  public getDataForAICoach() {
    return {
      transactions: this.categorizedTransactions,
      budget: this.budget,
      smartGoals: this.smartGoals,
      
      // Helper methods for AI coach queries
      getSpendingByCategory: (category: string, months?: number) => {
        const filtered = this.categorizedTransactions.filter(tx => 
          tx.category === category && !tx.is_income
        );
        
        if (months) {
          const cutoffDate = new Date();
          cutoffDate.setMonth(cutoffDate.getMonth() - months);
          const cutoffStr = cutoffDate.toISOString().split('T')[0];
          
          return filtered.filter(tx => tx.date >= cutoffStr);
        }
        
        return filtered;
      },
      
      getTotalSpending: (months?: number) => {
        let transactions = this.categorizedTransactions.filter(tx => !tx.is_income);
        
        if (months) {
          const cutoffDate = new Date();
          cutoffDate.setMonth(cutoffDate.getMonth() - months);
          const cutoffStr = cutoffDate.toISOString().split('T')[0];
          
          transactions = transactions.filter(tx => tx.date >= cutoffStr);
        }
        
        return transactions.reduce((sum, tx) => sum + tx.amount, 0);
      },
      
      canAfford: (amount: number) => {
        const disposableIncome = (this.budget?.totalIncome || 0) - (this.budget?.totalExpenses || 0);
        return disposableIncome >= amount;
      }
    };
  }

  // Utility methods
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractMerchant(description: string): string | null {
    // Simple merchant extraction logic
    const cleaned = description.trim();
    
    // Remove common prefixes
    const patterns = [
      /^(EFTPOS|VISA|MASTERCARD|PURCHASE)\s+/i,
      /^(INTERNET BANKING|ONLINE)\s+/i,
    ];
    
    let merchant = cleaned;
    for (const pattern of patterns) {
      merchant = merchant.replace(pattern, '');
    }
    
    return merchant.substring(0, 100) || null;
  }
}

// Export singleton instance
export const csvHandler = new CSVHandler();

// Export for AI coach integration
export const getFinancialDataForAI = () => csvHandler.getDataForAICoach();