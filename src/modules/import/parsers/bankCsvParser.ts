/* File: src/modules/import/parsers/bankCsvParser.ts Description: Normalizes bank-specific CSV formats (ANZ, ASB, Westpac, Kiwibank, BNZ) into a unified transaction schema. */

import { parseANZ } from './anz' import { parseASB } from './asb' import { parseWestpac } from './westpac' import { parseKiwibank } from './kiwibank' import { parseBNZ } from './bnz' import { parseFloatSafe, normalizeDate } from '../../utils/format'

export interface Transaction { date: string description: string amount: number source: string }

export function parseBankCSV(filename: string, data: string[][]): Transaction[] { const lower = filename.toLowerCase() if (lower.includes('anz')) return parseANZ(data) if (lower.includes('asb')) return parseASB(data) if (lower.includes('westpac')) return parseWestpac(data) if (lower.includes('kiwibank')) return parseKiwibank(data) if (lower.includes('bnz')) return parseBNZ(data)

throw new Error(Unknown bank CSV format: ${filename}) }

// --- Mock Parsers --- export function parseANZ(data: string[][]): Transaction[] { return data.slice(1).map(row => ({ date: normalizeDate(row[0]), amount: parseFloatSafe(row[1]), description: row[2] || '', source: 'ANZ' })) }

export function parseASB(data: string[][]): Transaction[] { return data.slice(1).map(row => ({ date: normalizeDate(row[0]), amount: parseFloatSafe(row[1]), description: row[2] || '', source: 'ASB' })) }

export function parseWestpac(data: string[][]): Transaction[] { return data.slice(1).map(row => ({ date: normalizeDate(row[0]), amount: parseFloatSafe(row[1]), description: row[2] || '', source: 'Westpac' })) }

export function parseKiwibank(data: string[][]): Transaction[] { return data.slice(1).map(row => ({ date: normalizeDate(row[0]), amount: parseFloatSafe(row[1]), description: row[2] || '', source: 'Kiwibank' })) }

export function parseBNZ(data: string[][]): Transaction[] { return data.slice(1).map(row => ({ date: normalizeDate(row[0]), amount: parseFloatSafe(row[1]), description: row[2] || '', source: 'BNZ' })) }

