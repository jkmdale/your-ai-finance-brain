/* File: src/modules/import/parsers/bankCsvParser.ts Description: Normalizes bank-specific CSV formats (ANZ, ASB, Westpac, Kiwibank, BNZ) into a unified transaction schema. */

import { parseANZ } from './anz'; import { parseASB } from './asb'; import { parseWestpac } from './westpac'; import { parseKiwibank } from './kiwibank'; import { parseBNZ } from './bnz'; import { parseFloatSafe, normalizeDate } from '../../utils/format'; import { recommendSmartGoals } from '../../goals/recommendGoals';

export interface Transaction { date: string; description: string; amount: number; type: 'debit' | 'credit'; account: string; category?: string; }

export function parseBankCSV(filename: string, data: any[]): Transaction[] { const lower = filename.toLowerCase(); let transactions: Transaction[];

if (lower.includes('anz')) transactions = parseANZ(data); else if (lower.includes('asb')) transactions = parseASB(data); else if (lower.includes('westpac')) transactions = parseWestpac(data); else if (lower.includes('kiwibank')) transactions = parseKiwibank(data); else if (lower.includes('bnz')) transactions = parseBNZ(data); else throw new Error(Unknown bank CSV format: ${filename});

// 🔁 Trigger goal recommendation here const smartGoals = recommendSmartGoals(transactions); console.log('Recommended SMART Goals:', smartGoals);

return transactions; }

// --- Dummy bank parsers ---

export function parseANZ(data: any[]): Transaction[] { return data.map(row => ({ date: normalizeDate(row['Date']), description: row['Details'] || '', amount: parseFloatSafe(row['Amount']), type: parseFloat(row['Amount']) < 0 ? 'debit' : 'credit', account: 'ANZ', })); }

export function parseASB(data: any[]): Transaction[] { return data.map(row => ({ date: normalizeDate(row['Date']), description: row['Particulars'] || '', amount: parseFloatSafe(row['Amount']), type: parseFloat(row['Amount']) < 0 ? 'debit' : 'credit', account: 'ASB', })); }

export function parseWestpac(data: any[]): Transaction[] { return data.map(row => ({ date: normalizeDate(row['Date']), description: row['Transaction Details'] || '', amount: parseFloatSafe(row['Amount']), type: parseFloat(row['Amount']) < 0 ? 'debit' : 'credit', account: 'Westpac', })); }

export function parseKiwibank(data: any[]): Transaction[] { return data.map(row => ({ date: normalizeDate(row['Date']), description: row['Payee'] || '', amount: parseFloatSafe(row['Amount']), type: parseFloat(row['Amount']) < 0 ? 'debit' : 'credit', account: 'Kiwibank', })); }

export function parseBNZ(data: any[]): Transaction[] { return data.map(row => ({ date: normalizeDate(row['Date']), description: row['Description'] || '', amount: parseFloatSafe(row['Amount']), type: parseFloat(row['Amount']) < 0 ? 'debit' : 'credit', account: 'BNZ', })); }

