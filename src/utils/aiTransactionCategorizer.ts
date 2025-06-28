
import { supabase } from '@/integrations/supabase/client';

export interface CategoryAnalysis {
  category: string;
  confidence: number;
  isIncome: boolean;
  merchant?: string;
  tags: string[];
  reasoning: string;
}

export interface CategoryMapping {
  [key: string]: {
    category: string;
    isIncome: boolean;
    keywords: string[];
    merchantPatterns: RegExp[];
  };
}

export class AITransactionCategorizer {
  private categoryMappings: CategoryMapping = {
    'Housing & Utilities': {
      category: 'Housing & Utilities',
      isIncome: false,
      keywords: ['rent', 'mortgage', 'property', 'utilities', 'electricity', 'gas', 'water', 'internet', 'phone', 'broadband', 'council', 'rates'],
      merchantPatterns: [/^(RENT|MORTGAGE|POWER|GAS|WATER|TELECOM|VODAFONE|SPARK|2DEGREES)/i]
    },
    'Groceries': {
      category: 'Groceries',
      isIncome: false,
      keywords: ['grocery', 'supermarket', 'food', 'fresh', 'countdown', 'paknsave', 'woolworths', 'coles', 'newworld', 'foodstuffs'],
      merchantPatterns: [/^(COUNTDOWN|PAKNSAVE|NEW WORLD|WOOLWORTHS|COLES|FOODTOWN)/i]
    },
    'Transportation': {
      category: 'Transportation',
      isIncome: false,
      keywords: ['uber', 'taxi', 'bus', 'train', 'fuel', 'petrol', 'gas', 'parking', 'transport', 'bp', 'shell', 'caltex', 'z energy'],
      merchantPatterns: [/^(UBER|TAXI|BP|SHELL|CALTEX|Z ENERGY|MOBIL|AUCKLAND TRANSPORT)/i]
    },
    'Dining Out': {
      category: 'Dining Out',
      isIncome: false,
      keywords: ['restaurant', 'cafe', 'takeaway', 'delivery', 'dining', 'mcdonald', 'kfc', 'starbucks', 'pizza', 'burger'],
      merchantPatterns: [/^(MCDONALD|KFC|STARBUCKS|PIZZA|BURGER|SUBWAY|DOMINO)/i]
    },
    'Entertainment': {
      category: 'Entertainment',
      isIncome: false,
      keywords: ['netflix', 'spotify', 'subscription', 'entertainment', 'movie', 'cinema', 'games', 'steam', 'playstation'],
      merchantPatterns: [/^(NETFLIX|SPOTIFY|STEAM|PLAYSTATION|XBOX|CINEMA|EVENT)/i]
    },
    'Healthcare': {
      category: 'Healthcare',
      isIncome: false,  
      keywords: ['doctor', 'hospital', 'pharmacy', 'medical', 'health', 'dental', 'chemist'],
      merchantPatterns: [/^(PHARMACY|CHEMIST|MEDICAL|DENTAL|HOSPITAL|DOCTOR)/i]
    },
    'Shopping': {
      category: 'Shopping',
      isIncome: false,
      keywords: ['amazon', 'shopping', 'retail', 'clothing', 'electronics', 'warehouse', 'kmart', 'target'],
      merchantPatterns: [/^(AMAZON|WAREHOUSE|KMART|TARGET|HARVEY NORMAN|JB HI-FI)/i]
    },
    'Salary': {
      category: 'Salary',
      isIncome: true,
      keywords: ['salary', 'wage', 'payroll', 'pay', 'employment', 'income'],
      merchantPatterns: [/^(PAYROLL|SALARY|WAGE)/i]
    },
    'Investment Income': {
      category: 'Investment Income',
      isIncome: true,
      keywords: ['dividend', 'interest', 'investment', 'sharesies', 'returns'],
      merchantPatterns: [/^(DIVIDEND|INTEREST|SHARESIES|INVESTNOW)/i]
    }
  };

  private async categorizeWithAI(description: string, amount: number, merchant?: string): Promise<CategoryAnalysis> {
    const prompt = `Categorize this financial transaction:

Description: "${description}"
Amount: ${amount}
Merchant: "${merchant || 'Unknown'}"

Analyze this transaction and determine:
1. Most appropriate category (Housing, Transportation, Groceries, Dining Out, Entertainment, Healthcare, Shopping, Salary, Investment Income, etc.)
2. Whether it's income or expense
3. Confidence level (0-1)
4. Any relevant tags
5. Brief reasoning

Consider merchant patterns, keywords, and context. Be specific but practical for personal finance tracking.

Return response in JSON format.`;

    try {
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { 
          message: prompt,
          type: 'transaction_categorization'
        }
      });

      if (error) throw error;

      return this.parseCategorizationResponse(data.response, description, amount);
    } catch (error) {
      console.error('AI categorization failed, using rule-based fallback:', error);
      return this.fallbackCategorization(description, amount, merchant);
    }
  }

  private parseCategorizationResponse(aiResponse: string, description: string, amount: number): CategoryAnalysis {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        category: analysisData.category || this.fallbackCategorization(description, amount).category,
        confidence: Math.min(1, Math.max(0, analysisData.confidence || 0.7)),
        isIncome: analysisData.isIncome || amount > 0,
        merchant: analysisData.merchant || this.extractMerchant(description),
        tags: Array.isArray(analysisData.tags) ? analysisData.tags : [],
        reasoning: analysisData.reasoning || 'AI analysis'
      };
    } catch (error) {
      console.error('Failed to parse AI categorization response:', error);
      return this.fallbackCategorization(description, amount);
    }
  }

  private fallbackCategorization(description: string, amount: number, merchant?: string): CategoryAnalysis {
    const desc = description.toLowerCase();
    
    // Income detection
    if (amount > 0) {
      for (const [categoryName, mapping] of Object.entries(this.categoryMappings)) {
        if (mapping.isIncome && mapping.keywords.some(keyword => desc.includes(keyword))) {
          return {
            category: categoryName,
            confidence: 0.8,
            isIncome: true,
            merchant: merchant || this.extractMerchant(description),
            tags: ['rule-based'],
            reasoning: `Matched income keywords: ${mapping.keywords.filter(k => desc.includes(k)).join(', ')}`
          };
        }
      }
      return {
        category: 'Other Income',
        confidence: 0.6,
        isIncome: true,
        merchant: merchant || this.extractMerchant(description),
        tags: ['fallback'],
        reasoning: 'Positive amount, no specific income category detected'
      };
    }

    // Expense categorization
    for (const [categoryName, mapping] of Object.entries(this.categoryMappings)) {
      if (!mapping.isIncome) {
        // Check merchant patterns
        if (mapping.merchantPatterns.some(pattern => pattern.test(description))) {
          return {
            category: categoryName,
            confidence: 0.9,
            isIncome: false,
            merchant: merchant || this.extractMerchant(description),
            tags: ['merchant-pattern'],
            reasoning: `Matched merchant pattern for ${categoryName}`
          };
        }
        
        // Check keywords
        const matchedKeywords = mapping.keywords.filter(keyword => desc.includes(keyword));
        if (matchedKeywords.length > 0) {
          return {
            category: categoryName,
            confidence: 0.7 + (matchedKeywords.length * 0.1),
            isIncome: false,
            merchant: merchant || this.extractMerchant(description),
            tags: ['keyword-match'],
            reasoning: `Matched keywords: ${matchedKeywords.join(', ')}`
          };
        }
      }
    }

    return {
      category: 'Uncategorised',
      confidence: 0.3,
      isIncome: false,
      merchant: merchant || this.extractMerchant(description),
      tags: ['uncategorised'],
      reasoning: 'No matching patterns found'
    };
  }

  private extractMerchant(description: string): string {
    // Clean and extract merchant name from description
    const cleaned = description
      .replace(/^(TST\*|SQ \*|AMZN MKTP|PAYPAL \*|POS |ATM |EFTPOS |PURCHASE |PAYMENT |DEBIT |CREDIT )/i, '')
      .replace(/\*\w+$/, '')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s&'-]/g, '')
      .trim();

    // Common merchant name mappings
    const merchantMappings: { [key: string]: string } = {
      'AMZN': 'Amazon',
      'AMAZON': 'Amazon',
      'SPOTIFY': 'Spotify',
      'NETFLIX': 'Netflix',
      'UBER': 'Uber',
      'MCDONALD': 'McDonald\'s',
      'STARBUCKS': 'Starbucks',
      'PAYPAL': 'PayPal',
      'COUNTDOWN': 'Countdown',
      'PAKNSAVE': 'Pak\'nSave',
      'NEW WORLD': 'New World'
    };

    const upperCleaned = cleaned.toUpperCase();
    for (const [pattern, merchant] of Object.entries(merchantMappings)) {
      if (upperCleaned.includes(pattern)) {
        return merchant;
      }
    }

    return cleaned.substring(0, 50) || 'Unknown Merchant';
  }

  public async categorizeTransaction(description: string, amount: number, merchant?: string): Promise<CategoryAnalysis> {
    console.log(`🏷️ Categorizing transaction: "${description}" (${amount})`);
    
    const analysis = await this.categorizeWithAI(description, amount, merchant);
    
    console.log(`✅ Categorized as: ${analysis.category} (${Math.round(analysis.confidence * 100)}% confidence)`);
    
    return analysis;
  }

  public async batchCategorize(transactions: Array<{description: string, amount: number, merchant?: string}>): Promise<CategoryAnalysis[]> {
    console.log(`📊 Batch categorizing ${transactions.length} transactions...`);
    
    const results = await Promise.all(
      transactions.map(tx => this.categorizeTransaction(tx.description, tx.amount, tx.merchant))
    );
    
    console.log(`✅ Batch categorization complete: ${results.length} transactions processed`);
    
    return results;
  }
}
