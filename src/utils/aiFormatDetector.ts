
import { supabase } from '@/integrations/supabase/client';

export interface BankFormatAnalysis {
  confidence: number;
  bankName?: string;
  country?: string;
  columnMappings: {
    date: { index: number; confidence: number; pattern: string };
    description: { index: number; confidence: number; pattern: string };
    amount: { index: number; confidence: number; pattern: string };
    balance?: { index: number; confidence: number; pattern: string };
    reference?: { index: number; confidence: number; pattern: string };
    merchant?: { index: number; confidence: number; pattern: string }; // Add merchant field
  };
  dateFormat: string;
  negativePattern: 'brackets' | 'minus' | 'debit_credit' | 'column_based';
  currencySymbol: string;
  skipRows: number[];
  specialInstructions: string[];
}

export class AIFormatDetector {
  private async analyzeWithAI(headers: string[], sampleRows: string[][]): Promise<BankFormatAnalysis> {
    const prompt = `Analyze this CSV bank statement format and provide intelligent column mapping:

Headers: ${headers.join(', ')}

Sample rows (first 5):
${sampleRows.slice(0, 5).map((row, i) => `Row ${i + 1}: ${row.join(' | ')}`).join('\n')}

Please identify:
1. Which column contains dates (look for date patterns, not just column names)
2. Which column contains transaction descriptions/details
3. Which column contains amounts (may be split into debit/credit columns)
4. Date format used (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
5. How negative amounts are indicated (brackets, minus signs, separate debit column, etc.)
6. Currency symbol used
7. Any rows that should be skipped (headers, totals, empty rows)
8. Bank name if identifiable from patterns

Return analysis in JSON format with confidence scores (0-1) for each mapping.`;

    try {
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { 
          message: prompt,
          type: 'csv_analysis'
        }
      });

      if (error) throw error;

      // Parse AI response and create structured analysis
      return this.parseAIResponse(data.response, headers, sampleRows);
    } catch (error) {
      console.error('AI analysis failed, using fallback detection:', error);
      return this.fallbackDetection(headers, sampleRows);
    }
  }

  private parseAIResponse(aiResponse: string, headers: string[], sampleRows: string[][]): BankFormatAnalysis {
    try {
      const analysisData = JSON.parse(aiResponse);
      
      return {
        confidence: analysisData.confidence || 0.8,
        bankName: analysisData.bankName,
        country: analysisData.country,
        columnMappings: {
          date: this.findBestColumn(headers, sampleRows, ['date', 'transaction_date', 'posting_date', 'value_date'], analysisData.dateColumn),
          description: this.findBestColumn(headers, sampleRows, ['description', 'details', 'particulars', 'memo', 'reference'], analysisData.descriptionColumn),
          amount: this.findBestColumn(headers, sampleRows, ['amount', 'value', 'debit', 'credit', 'transaction_amount'], analysisData.amountColumn),
          balance: this.findBestColumn(headers, sampleRows, ['balance', 'running_balance', 'account_balance'], analysisData.balanceColumn),
          reference: this.findBestColumn(headers, sampleRows, ['reference', 'ref', 'transaction_id', 'check_number'], analysisData.referenceColumn),
          merchant: this.findBestColumn(headers, sampleRows, ['particulars', 'code', 'merchant', 'other party', 'payee', 'narrative', 'memo'], analysisData.merchantColumn) // Add merchant mapping
        },
        dateFormat: analysisData.dateFormat || this.detectDateFormat(sampleRows),
        negativePattern: analysisData.negativePattern || this.detectNegativePattern(sampleRows),
        currencySymbol: analysisData.currencySymbol || this.detectCurrency(sampleRows),
        skipRows: analysisData.skipRows || [],
        specialInstructions: analysisData.specialInstructions || []
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.fallbackDetection(headers, sampleRows);
    }
  }

  private findBestColumn(headers: string[], sampleRows: string[][], keywords: string[], aiSuggestion?: number): { index: number; confidence: number; pattern: string } {
    // Use AI suggestion if provided and valid
    if (aiSuggestion !== undefined && aiSuggestion >= 0 && aiSuggestion < headers.length) {
      return { index: aiSuggestion, confidence: 0.9, pattern: 'ai_suggested' };
    }

    // Enhanced flexible column finding with pattern analysis
    let bestMatch = { index: -1, confidence: 0, pattern: '' };

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      for (const keyword of keywords) {
        const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        let confidence = 0;
        let pattern = '';

        // Exact match
        if (normalizedHeader === normalizedKeyword) {
          confidence = 1.0;
          pattern = 'exact_match';
        }
        // Contains match
        else if (normalizedHeader.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedHeader)) {
          confidence = 0.8;
          pattern = 'contains_match';
        }
        // Word similarity
        else {
          const similarity = this.calculateSimilarity(normalizedHeader, normalizedKeyword);
          if (similarity > 0.6) {
            confidence = similarity * 0.7;
            pattern = 'similarity_match';
          }
        }

        // Boost confidence based on data patterns in sample rows
        if (confidence > 0 && sampleRows.length > 0) {
          const dataPatternBoost = this.analyzeDataPattern(sampleRows, index, keyword);
          confidence = Math.min(1.0, confidence + dataPatternBoost);
        }

        if (confidence > bestMatch.confidence) {
          bestMatch = { index, confidence, pattern };
        }
      }
    });

    return bestMatch.confidence > 0.3 ? bestMatch : { index: -1, confidence: 0, pattern: 'not_found' };
  }

  private analyzeDataPattern(sampleRows: string[][], columnIndex: number, expectedType: string): number {
    if (columnIndex >= sampleRows[0]?.length) return 0;

    const sampleValues = sampleRows.slice(0, 5).map(row => row[columnIndex]?.trim() || '');
    let patternScore = 0;

    switch (expectedType) {
      case 'date':
        const datePatterns = [
          /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/,
          /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/,
          /^\d{8}$/
        ];
        const dateMatches = sampleValues.filter(val => 
          datePatterns.some(pattern => pattern.test(val))
        ).length;
        patternScore = dateMatches / sampleValues.length * 0.3;
        break;

      case 'amount':
        const amountPatterns = [
          /^-?[\d,]+\.?\d*$/,
          /^-?\$?[\d,]+\.?\d*$/,
          /^\([\d,]+\.?\d*\)$/
        ];
        const amountMatches = sampleValues.filter(val => 
          amountPatterns.some(pattern => pattern.test(val.replace(/[^\d\.,\-\(\)\$]/g, '')))
        ).length;
        patternScore = amountMatches / sampleValues.length * 0.3;
        break;

      case 'description':
        const avgLength = sampleValues.reduce((sum, val) => sum + val.length, 0) / sampleValues.length;
        if (avgLength > 10 && avgLength < 200) {
          patternScore = 0.2;
        }
        break;
    }

    return patternScore;
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

  private detectDateFormat(sampleRows: string[][]): string {
    // Analyze sample data to detect date format
    const dateValues = sampleRows.flatMap(row => row.filter(cell => 
      /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(cell?.trim() || '')
    ));

    if (dateValues.length === 0) return 'DD/MM/YYYY';

    // Heuristic: if we find a day > 12, it's likely DD/MM format
    const hasHighDay = dateValues.some(date => {
      const parts = date.split(/[\/\-\.]/);
      return parseInt(parts[0]) > 12;
    });

    return hasHighDay ? 'DD/MM/YYYY' : 'MM/DD/YYYY';
  }

  private detectNegativePattern(sampleRows: string[][]): 'brackets' | 'minus' | 'debit_credit' | 'column_based' {
    const allValues = sampleRows.flatMap(row => row);
    
    if (allValues.some(val => /^\(.*\)$/.test(val?.trim() || ''))) {
      return 'brackets';
    }
    if (allValues.some(val => /^-/.test(val?.trim() || ''))) {
      return 'minus';
    }
    if (allValues.some(val => /debit|credit/i.test(val?.trim() || ''))) {
      return 'debit_credit';
    }
    
    return 'column_based';
  }

  private detectCurrency(sampleRows: string[][]): string {
    const allValues = sampleRows.flatMap(row => row).join(' ');
    
    if (/\$/.test(allValues)) return '$';
    if (/£/.test(allValues)) return '£';
    if (/€/.test(allValues)) return '€';
    if (/¥/.test(allValues)) return '¥';
    
    return '$'; // Default
  }

  private fallbackDetection(headers: string[], sampleRows: string[][]): BankFormatAnalysis {
    console.log('🔄 Using fallback detection for bank format');
    
    return {
      confidence: 0.5,
      bankName: 'Unknown',
      country: 'Unknown',
      columnMappings: {
        date: this.findBestColumn(headers, sampleRows, ['date', 'transaction_date', 'posting_date', 'value_date']),
        description: this.findBestColumn(headers, sampleRows, ['description', 'details', 'particulars', 'memo']),
        amount: this.findBestColumn(headers, sampleRows, ['amount', 'value', 'debit', 'credit']),
        balance: this.findBestColumn(headers, sampleRows, ['balance', 'running_balance', 'account_balance']),
        reference: this.findBestColumn(headers, sampleRows, ['reference', 'ref', 'transaction_id']),
        merchant: this.findBestColumn(headers, sampleRows, ['particulars', 'code', 'merchant', 'other party', 'payee', 'narrative', 'memo']) // Add merchant fallback
      },
      dateFormat: this.detectDateFormat(sampleRows),
      negativePattern: this.detectNegativePattern(sampleRows),
      currencySymbol: this.detectCurrency(sampleRows),
      skipRows: [],
      specialInstructions: []
    };
  }

  public async detectFormat(headers: string[], sampleRows: string[][]): Promise<BankFormatAnalysis> {
    console.log('🤖 Starting AI-powered bank format detection...');
    
    const analysis = await this.analyzeWithAI(headers, sampleRows);
    
    console.log('✅ Format detection complete:', {
      confidence: analysis.confidence,
      bankName: analysis.bankName,
      mappings: Object.entries(analysis.columnMappings).map(([key, value]) => 
        `${key}: ${value.index >= 0 ? `column ${value.index} (${Math.round(value.confidence * 100)}%)` : 'not found'}`
      )
    });

    return analysis;
  }
}
