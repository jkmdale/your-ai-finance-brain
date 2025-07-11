/* File: src/modules/import/parsers/bankCsvParser.ts Description: Normalizes bank-specific CSV formats (ANZ, ASB, Westpac, Kiwibank, BNZ) into a unified transaction schema. */

import { parseANZ as parseANZFile } from './anz';
import { parseASB as parseASBFile } from './asb';
import { parseWestpac as parseWestpacFile } from './westpac';
import { parseKiwibank as parseKiwibankFile } from './kiwibank';
import { parseBNZ as parseBNZFile } from './bnz';
import { parseFloatSafe, normalizeDate } from '../../utils/format';
// Goals integration removed from parser - handled in the upload flow

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  account: string;
  category?: string;
  source?: string;
}

export function parseBankCSV(filename: string, data: any[], headers?: string[]): Transaction[] {
  const lower = filename.toLowerCase();
  
  // Try filename-based detection first
  let bankType = detectBankFromFilename(lower);
  
  // If filename detection fails, try header-based detection
  if (!bankType && headers) {
    bankType = detectBankFromHeaders(headers);
  }
  
  // If still no detection, try content-based detection
  if (!bankType && data.length > 0) {
    bankType = detectBankFromContent(data[0]);
  }
  
  let transactions: Transaction[];
  
  switch (bankType) {
    case 'anz':
      transactions = parseANZFile(data);
      break;
    case 'asb':
      transactions = parseASBFile(data);
      break;
    case 'westpac':
      transactions = parseWestpacFile(data);
      break;
    case 'kiwibank':
      transactions = parseKiwibankFile(data);
      break;
    case 'bnz':
      transactions = parseBNZFile(data);
      break;
    default:
      // Try generic parsing as fallback
      transactions = parseGeneric(data);
  }

  console.log(`✅ Parsed ${transactions.length} transactions using ${bankType || 'generic'} format`);
  return transactions;
}

function detectBankFromFilename(filename: string): string | null {
  if (filename.includes('anz')) return 'anz';
  if (filename.includes('asb')) return 'asb';
  if (filename.includes('westpac')) return 'westpac';
  if (filename.includes('kiwibank')) return 'kiwibank';
  if (filename.includes('bnz')) return 'bnz';
  return null;
}

function detectBankFromHeaders(headers: string[]): string | null {
  const headerStr = headers.join('|').toLowerCase();
  
  if (headerStr.includes('anz') || (headerStr.includes('account') && headerStr.includes('balance'))) return 'anz';
  if (headerStr.includes('asb') || headerStr.includes('particulars')) return 'asb';
  if (headerStr.includes('westpac') || headerStr.includes('transaction details')) return 'westpac';
  if (headerStr.includes('kiwibank') || headerStr.includes('payee')) return 'kiwibank';
  if (headerStr.includes('bnz')) return 'bnz';
  
  return null;
}

function detectBankFromContent(firstRow: any): string | null {
  const values = Object.values(firstRow).join('|').toLowerCase();
  
  if (values.includes('anz')) return 'anz';
  if (values.includes('asb')) return 'asb';
  if (values.includes('westpac')) return 'westpac';
  if (values.includes('kiwibank')) return 'kiwibank';
  if (values.includes('bnz')) return 'bnz';
  
  return null;
}

function parseGeneric(data: any[]): Transaction[] {
  return data.map((row, index) => {
    const keys = Object.keys(row);
    const dateKey = keys.find(k => k.toLowerCase().includes('date')) || keys[0];
    const descKey = keys.find(k => k.toLowerCase().includes('desc') || k.toLowerCase().includes('detail') || k.toLowerCase().includes('particular')) || keys[1];
    const amountKey = keys.find(k => k.toLowerCase().includes('amount') || k.toLowerCase().includes('value')) || keys[2];
    
    return {
      date: normalizeDate(row[dateKey]),
      description: row[descKey] || `Transaction ${index + 1}`,
      amount: parseFloatSafe(row[amountKey]),
      type: parseFloat(row[amountKey] || '0') < 0 ? 'debit' : 'credit',
      account: 'Generic',
    };
  });
}
