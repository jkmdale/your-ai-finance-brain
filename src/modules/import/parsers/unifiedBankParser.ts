/*
  File: src/modules/import/parsers/unifiedBankParser.ts
  Description: Unified bank CSV parser that combines configuration-based
  and intelligent parsing for maximum flexibility
*/

import { normalizeDate, parseFloatSafe } from '../../utils/format';
import { Transaction } from '../../../types/Transaction';
import { getField } from '../utils/parseHelpers';
import { BankConfig, detectBankConfig } from './bankConfigs';
import { parseIntelligently } from './intelligentParser';

export interface ParseResult {
  transactions: Transaction[];
  detectedBank?: string;
  confidence: 'high' | 'medium' | 'low';
  warnings?: string[];
}

export function parseUnifiedBankCSV(
  filename: string,
  data: any[],
  headers?: string[]
): ParseResult {
  if (!data || data.length === 0) {
    return {
      transactions: [],
      confidence: 'low',
      warnings: ['No data to parse']
    };
  }

  const warnings: string[] = [];
  
  // Step 1: Try to detect bank using configuration
  const bankConfig = detectBankConfig(filename, headers, data);
  
  if (bankConfig) {
    console.log(`🏦 Detected bank: ${bankConfig.name}`);
    try {
      const transactions = parseWithBankConfig(data, bankConfig);
      
      if (transactions.length > 0) {
        return {
          transactions,
          detectedBank: bankConfig.name,
          confidence: 'high',
          warnings
        };
      } else {
        warnings.push(`Failed to parse using ${bankConfig.name} configuration`);
      }
    } catch (error) {
      warnings.push(`Error parsing with ${bankConfig.name} config: ${error.message}`);
    }
  }
  
  // Step 2: Fall back to intelligent parsing
  console.log('🤖 Using intelligent parser for unknown format');
  try {
    const transactions = parseIntelligently(data, headers);
    
    if (transactions.length > 0) {
      return {
        transactions,
        detectedBank: 'Unknown',
        confidence: bankConfig ? 'medium' : 'low',
        warnings
      };
    }
  } catch (error) {
    warnings.push(`Intelligent parser error: ${error.message}`);
  }
  
  // Step 3: Last resort - basic parsing
  console.log('⚠️ Using basic fallback parser');
  const transactions = parseBasicFallback(data);
  
  return {
    transactions,
    detectedBank: 'Unknown',
    confidence: 'low',
    warnings: [...warnings, 'Used basic fallback parser - results may be incomplete']
  };
}

function parseWithBankConfig(data: any[], config: BankConfig): Transaction[] {
  return data.map((row, index) => {
    try {
      // Get date
      const date = extractFieldFromConfig(row, config.columns.date);
      
      // Get description (combine description and reference fields)
      const descParts: string[] = [];
      if (config.columns.description) {
        const desc = extractFieldFromConfig(row, config.columns.description);
        if (desc) descParts.push(desc);
      }
      if (config.columns.reference) {
        const ref = extractFieldFromConfig(row, config.columns.reference);
        if (ref) descParts.push(ref);
      }
      const description = descParts.join(' - ') || `Transaction ${index + 1}`;
      
      // Get amount
      const amount = extractAmountFromConfig(row, config);
      
      // Determine transaction type
      const type = amount < 0 ? 'debit' : 'credit';
      
      return {
        date: normalizeDate(date),
        description,
        amount: Math.abs(amount),
        type,
        account: config.name,
        source: 'bank-config'
      };
    } catch (error) {
      console.warn(`Failed to parse row ${index} with ${config.name} config:`, error);
      return null;
    }
  }).filter(Boolean) as Transaction[];
}

function extractFieldFromConfig(row: any, fieldNames?: string[]): string {
  if (!fieldNames || fieldNames.length === 0) return '';
  
  // Try each field name
  for (const fieldName of fieldNames) {
    const value = getField(row, fieldName);
    if (value) return value;
  }
  
  // Try case-insensitive match
  const rowKeys = Object.keys(row);
  for (const fieldName of fieldNames) {
    const match = rowKeys.find(key => 
      key.toLowerCase() === fieldName.toLowerCase()
    );
    if (match && row[match]) {
      return row[match].toString();
    }
  }
  
  return '';
}

function extractAmountFromConfig(row: any, config: BankConfig): number {
  // Scenario 1: Single amount column
  if (config.columns.amount && config.columns.amount.length > 0) {
    const amountStr = extractFieldFromConfig(row, config.columns.amount);
    if (amountStr) {
      return parseFloatSafe(amountStr);
    }
  }
  
  // Scenario 2: Separate debit/credit columns
  if (config.columns.debit || config.columns.credit) {
    let debit = 0;
    let credit = 0;
    
    if (config.columns.debit) {
      const debitStr = extractFieldFromConfig(row, config.columns.debit);
      if (debitStr) debit = Math.abs(parseFloatSafe(debitStr));
    }
    
    if (config.columns.credit) {
      const creditStr = extractFieldFromConfig(row, config.columns.credit);
      if (creditStr) credit = Math.abs(parseFloatSafe(creditStr));
    }
    
    // Return negative for debits, positive for credits
    if (debit > 0) return -debit;
    if (credit > 0) return credit;
  }
  
  return 0;
}

function parseBasicFallback(data: any[]): Transaction[] {
  return data.map((row, index) => {
    try {
      const keys = Object.keys(row);
      const values = Object.values(row);
      
      // Find first date-like value
      let date = '';
      for (const value of values) {
        const str = value?.toString().trim();
        if (str && looksLikeDate(str)) {
          date = str;
          break;
        }
      }
      
      // Find first text value for description
      let description = '';
      for (const value of values) {
        const str = value?.toString().trim();
        if (str && !looksLikeDate(str) && !looksLikeNumber(str)) {
          description = str;
          break;
        }
      }
      
      // Find first numeric value for amount
      let amount = 0;
      for (const value of values) {
        const str = value?.toString().trim();
        if (str && looksLikeNumber(str)) {
          amount = parseFloatSafe(str);
          if (amount !== 0) break;
        }
      }
      
      return {
        date: normalizeDate(date),
        description: description || `Transaction ${index + 1}`,
        amount: Math.abs(amount),
        type: amount < 0 ? 'debit' : 'credit',
        account: 'Unknown',
        source: 'fallback'
      };
    } catch (error) {
      return null;
    }
  }).filter(Boolean) as Transaction[];
}

function looksLikeDate(str: string): boolean {
  const patterns = [
    /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/,
    /\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/
  ];
  return patterns.some(p => p.test(str));
}

function looksLikeNumber(str: string): boolean {
  const cleaned = str.replace(/[$,\s]/g, '');
  return !isNaN(parseFloat(cleaned));
}