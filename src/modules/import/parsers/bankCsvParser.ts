/* File: src/modules/import/parsers/bankCsvParser.ts Description: Parses bank-specific CSV formats (ANZ, ASB, Westpac, Kiwibank, BNZ) into a unified transaction schema. */

import { parseFloatSafe, normalizeDate } from '../../utils/format'

export interface Transaction { date: string description: string amount: number source: string }

export function parseBankCSV(filename: string, data: string[][]): Transaction[] { const lower = filename.toLowerCase() if (lower.includes('anz')) return parseANZ(data) if (lower.includes('asb')) return parseASB(data) if (lower.includes('westpac')) return parseWestpac(data) if (lower.includes('kiwibank')) return parseKiwibank(data) if (lower.includes('bnz')) return parseBNZ(data)

throw new Error(Unknown bank CSV format: ${filename}) }

export function parseANZ(data: string[][]): Transaction[] { const headers = data[0] return data.slice(1).map(row => { const record = Object.fromEntries(headers.map((h, i) => [h, row[i]])) return { date: normalizeDate(record['Date']), amount: parseFloatSafe(record['Amount']), description: [record['Details'], record['Particulars'], record['Reference']].filter(Boolean).join(' - '), source: 'ANZ' } }) }

export function parseASB(data: string[][]): Transaction[] { const headers = data[0] return data.slice(1).map(row => { const record = Object.fromEntries(headers.map((h, i) => [h, row[i]])) return { date: normalizeDate(record['Date']), amount: parseFloatSafe(record['Amount']), description: [record['Particulars'], record['Code'], record['Reference']].filter(Boolean).join(' - '), source: 'ASB' } }) }

export function parseWestpac(data: string[][]): Transaction[] { const headers = data[0] return data.slice(1).map(row => { const record = Object.fromEntries(headers.map((h, i) => [h, row[i]])) return { date: normalizeDate(record['Date']), amount: parseFloatSafe(record['Amount']), description: record['Transaction Details'] || '', source: 'Westpac' } }) }

export function parseKiwibank(data: string[][]): Transaction[] { const headers = data[0] return data.slice(1).map(row => { const record = Object.fromEntries(headers.map((h, i) => [h, row[i]])) return { date: normalizeDate(record['Date']), amount: parseFloatSafe(record['Amount']), description: [record['Payee'], record['Description']].filter(Boolean).join(' - '), source: 'Kiwibank' } }) }

export function parseBNZ(data: string[][]): Transaction[] { const headers = data[0] return data.slice(1).map(row => { const record = Object.fromEntries(headers.map((h, i) => [h, row[i]])) return { date: normalizeDate(record['Date']), amount: parseFloatSafe(record['Amount']), description: record['Description'] || '', source: 'BNZ' } }) }

