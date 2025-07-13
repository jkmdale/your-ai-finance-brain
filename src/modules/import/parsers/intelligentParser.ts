/*
  File: src/modules/import/parsers/intelligentParser.ts
  Description: Intelligent CSV parser that can handle unknown bank formats
  using pattern matching and heuristics
*/

import { normalizeDate, parseFloatSafe } from '../../utils/format';
import { Transaction } from '../../../types/Transaction';

interface ColumnMapping {
  dateColumns: string[];
  descriptionColumns: string[];
  amountColumns: string[];
  debitColumns: string[];
  creditColumns: string[];
  balanceColumns: string[];
  referenceColumns: string[];
}

// Common column name patterns used by NZ banks
const COLUMN_PATTERNS = {
  date: [
    'date', 'transaction date', 'trans date', 'posting date', 'processed date',
    'value date', 'txn date', 'transaction_date', 'trans_date', 'datetime'
  ],
  description: [
    'description', 'details', 'particulars', 'transaction details', 'memo',
    'narrative', 'reference', 'merchant', 'payee', 'transaction', 'trans details',
    'payment details', 'transaction_description', 'desc', 'trans_desc'
  ],
  amount: [
    'amount', 'value', 'transaction amount', 'trans amount', 'txn amount',
    'payment', 'sum', 'total', 'transaction_amount', 'trans_amt'
  ],
  debit: [
    'debit', 'withdrawal', 'money out', 'outgoing', 'expense', 'payment out',
    'debit_amount', 'debit_amt', 'withdrawals', 'debits'
  ],
  credit: [
    'credit', 'deposit', 'money in', 'incoming', 'income', 'payment in',
    'credit_amount', 'credit_amt', 'deposits', 'credits'
  ],
  balance: [
    'balance', 'running balance', 'closing balance', 'available balance',
    'current balance', 'account balance', 'bal', 'running_balance'
  ],
  reference: [
    'reference', 'ref', 'transaction ref', 'reference number', 'ref no',
    'transaction_ref', 'trans_ref', 'code', 'analysis code'
  ]
};

export function parseIntelligently(data: any[], headers?: string[]): Transaction[] {
  if (!data || data.length === 0) {
    return [];
  }

  // Detect column mappings
  const mapping = detectColumns(data[0], headers);
  console.log('🧠 Intelligent parser detected columns:', mapping);

  // Parse transactions using detected mappings
  const transactions = data.map((row, index) => {
    try {
      // Get date
      const date = extractDate(row, mapping.dateColumns);
      
      // Get description (combine multiple fields if necessary)
      const description = extractDescription(row, mapping.descriptionColumns, mapping.referenceColumns);
      
      // Get amount (handle different amount column scenarios)
      const amount = extractAmount(row, mapping);
      
      // Determine transaction type
      const type = amount < 0 ? 'debit' : 'credit';
      
      return {
        date: normalizeDate(date),
        description: description || `Transaction ${index + 1}`,
        amount: Math.abs(amount),
        type,
        account: 'Unknown Bank',
        source: 'intelligent-parser'
      };
    } catch (error) {
      console.warn(`⚠️ Failed to parse row ${index}:`, error);
      return null;
    }
  }).filter(Boolean) as Transaction[];

  console.log(`✅ Intelligent parser processed ${transactions.length} transactions`);
  return transactions;
}

function detectColumns(sampleRow: any, headers?: string[]): ColumnMapping {
  const keys = headers || Object.keys(sampleRow);
  const mapping: ColumnMapping = {
    dateColumns: [],
    descriptionColumns: [],
    amountColumns: [],
    debitColumns: [],
    creditColumns: [],
    balanceColumns: [],
    referenceColumns: []
  };

  // Detect columns by matching patterns
  keys.forEach(key => {
    const normalizedKey = key.toLowerCase().trim();
    
    // Check each pattern category
    if (matchesPattern(normalizedKey, COLUMN_PATTERNS.date)) {
      mapping.dateColumns.push(key);
    }
    if (matchesPattern(normalizedKey, COLUMN_PATTERNS.description)) {
      mapping.descriptionColumns.push(key);
    }
    if (matchesPattern(normalizedKey, COLUMN_PATTERNS.amount)) {
      mapping.amountColumns.push(key);
    }
    if (matchesPattern(normalizedKey, COLUMN_PATTERNS.debit)) {
      mapping.debitColumns.push(key);
    }
    if (matchesPattern(normalizedKey, COLUMN_PATTERNS.credit)) {
      mapping.creditColumns.push(key);
    }
    if (matchesPattern(normalizedKey, COLUMN_PATTERNS.balance)) {
      mapping.balanceColumns.push(key);
    }
    if (matchesPattern(normalizedKey, COLUMN_PATTERNS.reference)) {
      mapping.referenceColumns.push(key);
    }
  });

  // If no columns detected, use positional fallback
  if (mapping.dateColumns.length === 0 && keys.length > 0) {
    mapping.dateColumns.push(keys[0]);
  }
  if (mapping.descriptionColumns.length === 0 && keys.length > 1) {
    mapping.descriptionColumns.push(keys[1]);
  }
  if (mapping.amountColumns.length === 0 && mapping.debitColumns.length === 0 && 
      mapping.creditColumns.length === 0 && keys.length > 2) {
    mapping.amountColumns.push(keys[2]);
  }

  return mapping;
}

function matchesPattern(key: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const normalizedPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedKey = key.replace(/[^a-z0-9]/g, '');
    return normalizedKey.includes(normalizedPattern) || normalizedPattern.includes(normalizedKey);
  });
}

function extractDate(row: any, dateColumns: string[]): string {
  // Try each date column in order
  for (const col of dateColumns) {
    const value = row[col];
    if (value && value.toString().trim()) {
      return value.toString().trim();
    }
  }
  
  // Fallback: look for date-like values in any column
  const values = Object.values(row);
  for (const value of values) {
    if (value && isDateLike(value.toString())) {
      return value.toString();
    }
  }
  
  return new Date().toISOString().split('T')[0];
}

function extractDescription(row: any, descColumns: string[], refColumns: string[]): string {
  const parts: string[] = [];
  
  // Collect description columns
  for (const col of descColumns) {
    const value = row[col];
    if (value && value.toString().trim()) {
      parts.push(value.toString().trim());
    }
  }
  
  // Add reference columns if no description found
  if (parts.length === 0) {
    for (const col of refColumns) {
      const value = row[col];
      if (value && value.toString().trim()) {
        parts.push(value.toString().trim());
      }
    }
  }
  
  // If still nothing, collect all non-numeric, non-date values
  if (parts.length === 0) {
    const values = Object.values(row);
    for (const value of values) {
      const str = value?.toString().trim();
      if (str && !isNumericLike(str) && !isDateLike(str)) {
        parts.push(str);
      }
    }
  }
  
  return parts.join(' - ');
}

function extractAmount(row: any, mapping: ColumnMapping): number {
  // Scenario 1: Single amount column (can be positive or negative)
  if (mapping.amountColumns.length > 0) {
    for (const col of mapping.amountColumns) {
      const value = parseFloatSafe(row[col]);
      if (value !== 0) return value;
    }
  }
  
  // Scenario 2: Separate debit and credit columns
  if (mapping.debitColumns.length > 0 || mapping.creditColumns.length > 0) {
    let debit = 0;
    let credit = 0;
    
    for (const col of mapping.debitColumns) {
      const value = parseFloatSafe(row[col]);
      if (value !== 0) debit = Math.abs(value);
    }
    
    for (const col of mapping.creditColumns) {
      const value = parseFloatSafe(row[col]);
      if (value !== 0) credit = Math.abs(value);
    }
    
    // Return negative for debits, positive for credits
    if (debit > 0) return -debit;
    if (credit > 0) return credit;
  }
  
  // Scenario 3: Try to infer from balance changes
  if (mapping.balanceColumns.length > 0) {
    // This would require comparing with previous row - skip for now
  }
  
  // Fallback: Look for any numeric value
  const values = Object.values(row);
  for (const value of values) {
    if (value && isNumericLike(value.toString())) {
      const parsed = parseFloatSafe(value);
      if (parsed !== 0 && Math.abs(parsed) < 1000000) { // Sanity check
        return parsed;
      }
    }
  }
  
  return 0;
}

function isDateLike(str: string): boolean {
  // Check for common date patterns
  const datePatterns = [
    /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/,  // DD/MM/YYYY or similar
    /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/,     // YYYY-MM-DD
    /^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,  // DD Month
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i   // Month DD
  ];
  
  return datePatterns.some(pattern => pattern.test(str.trim()));
}

function isNumericLike(str: string): boolean {
  // Remove currency symbols and commas
  const cleaned = str.replace(/[$,\s]/g, '');
  return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned));
}