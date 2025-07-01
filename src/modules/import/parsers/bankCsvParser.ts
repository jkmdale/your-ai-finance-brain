/*
  File: src/modules/import/parsers/bankCsvParser.ts
  Description: Normalizes bank-specific CSV formats (ANZ, ASB, Westpac, Kiwibank, BNZ) into a unified transaction schema.
*/

import { parseFloatSafe, normalizeDate } from '../../utils/format';

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  account: string;
}

export function parseBankCSV(filename: string, data: any[]): Transaction[] {
  const lower = filename.toLowerCase();
  if (lower.includes('anz')) return parseBankCSV_ANZ(data);
  if (lower.includes('asb')) return parseBankCSV_ASB(data);
  if (lower.includes('westpac')) return parseBankCSV_WESTPAC(data);
  if (lower.includes('kiwibank')) return parseBankCSV_KIWIBANK(data);
  if (lower.includes('bnz')) return parseBankCSV_BNZ(data);

  throw new Error(`Unknown bank CSV format: ${filename}`);
}

function parseBankCSV_ANZ(data: any[]): Transaction[] {
  return data.map(row => ({
    date: normalizeDate(row['Date']),
    description: row['Details'] || '',
    amount: parseFloatSafe(row['Amount']),
    type: parseFloatSafe(row['Amount']) < 0 ? 'debit' : 'credit',
    account: 'ANZ',
  }));
}

function parseBankCSV_ASB(data: any[]): Transaction[] {
  return data.map(row => ({
    date: normalizeDate(row['Date']),
    description: row['Particulars'] || '',
    amount: parseFloatSafe(row['Amount']),
    type: parseFloatSafe(row['Amount']) < 0 ? 'debit' : 'credit',
    account: 'ASB',
  }));
}

function parseBankCSV_WESTPAC(data: any[]): Transaction[] {
  return data.map(row => ({
    date: normalizeDate(row['Date']),
    description: row['Transaction Details'] || '',
    amount: parseFloatSafe(row['Amount']),
    type: parseFloatSafe(row['Amount']) < 0 ? 'debit' : 'credit',
    account: 'Westpac',
  }));
}

function parseBankCSV_KIWIBANK(data: any[]): Transaction[] {
  return data.map(row => ({
    date: normalizeDate(row['Date']),
    description: row['Payee'] || '',
    amount: parseFloatSafe(row['Amount']),
    type: parseFloatSafe(row['Amount']) < 0 ? 'debit' : 'credit',
    account: 'Kiwibank',
  }));
}

function parseBankCSV_BNZ(data: any[]): Transaction[] {
  return data.map(row => ({
    date: normalizeDate(row['Date']),
    description: row['Description'] || '',
    amount: parseFloatSafe(row['Amount']),
    type: parseFloatSafe(row['Amount']) < 0 ? 'debit' : 'credit',
    account: 'BNZ',
  }));
}
