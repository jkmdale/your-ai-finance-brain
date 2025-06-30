/* File: src/modules/import/parsers/bankCsvParser.ts Description: Normalizes bank-specific CSV formats (ANZ, ASB, Westpac, Kiwibank, BNZ) into a unified transaction schema. */

import { parseANZ } from './anz'; import { parseASB } from './asb'; import { parseWestpac } from './westpac'; import { parseKiwibank } from './kiwibank'; import { parseBNZ } from './bnz';

interface Transaction { date: string; description: string; amount: number; type: 'debit' | 'credit'; account: string; }

export function parseBankCSV(filename: string, data: any[]): Transaction[] { const lower = filename.toLowerCase(); if (lower.includes('anz')) return parseANZ(data); if (lower.includes('asb')) return parseASB(data); if (lower.includes('westpac')) return parseWestpac(data); if (lower.includes('kiwibank')) return parseKiwibank(data); if (lower.includes('bnz')) return parseBNZ(data);

throw new Error(Unknown bank CSV format: ${filename}); }

// --- Dummy bank parsers ---

export function parseANZ(data: any[]): Transaction[] { return data.map(row => ({ date: row['Date'] || '', description: row['Details'] || '', amount: parseFloat(row['Amount'] || '0'), type: parseFloat(row['Amount']) < 0 ? 'debit' : 'credit', account: 'ANZ', })); }

export function parseASB(data: any[]): Transaction[] { return data.map(row => ({ date: row['Date'] || '', description: row['Particulars'] || '', amount: parseFloat(row['Amount'] || '0'), type: parseFloat(row['Amount']) < 0 ? 'debit' : 'credit', account: 'ASB', })); }

export function parseWestpac(data: any[]): Transaction[] { return data.map(row => ({ date: row['Date'] || '', description: row['Transaction Details'] || '', amount: parseFloat(row['Amount'] || '0'), type: parseFloat(row['Amount']) < 0 ? 'debit' : 'credit', account: 'Westpac', })); }

export function parseKiwibank(data: any[]): Transaction[] { return data.map(row => ({ date: row['Date'] || '', description: row['Payee'] || '', amount: parseFloat(row['Amount'] || '0'), type: parseFloat(row['Amount']) < 0 ? 'debit' : 'credit', account: 'Kiwibank', })); }

export function parseBNZ(data: any[]): Transaction[] { return data.map(row => ({ date: row['Date'] || '', description: row['Description'] || '', amount: parseFloat(row['Amount'] || '0'), type: parseFloat(row['Amount']) < 0 ? 'debit' : 'credit', account: 'BNZ', })); }

