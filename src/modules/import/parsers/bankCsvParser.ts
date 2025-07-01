/* File: src/modules/import/parsers/bankCsvParser.ts */
import { parseANZ } from './anz';
import { parseASB } from './asb';
import { parseWestpac } from './westpac';
import { parseKiwibank } from './kiwibank';
import { parseBNZ } from './bnz';
import { getField, sanitizeString } from '../utils/parseHelpers';
import { Transaction } from '../../../types/Transaction';

export function parseBankCSV(filename: string, data: any[]): Transaction[] {
  const lower = filename.toLowerCase();

  if (lower.includes('anz')) return parseANZ(data);
  if (lower.includes('asb')) return parseASB(data);
  if (lower.includes('westpac')) return parseWestpac(data);
  if (lower.includes('kiwibank')) return parseKiwibank(data);
  if (lower.includes('bnz')) return parseBNZ(data);

  const headerSample = Object.keys(data?.[0] || {}).map(sanitizeString).join(', ');
  throw new Error(`Unknown bank CSV format for file "${filename}". Headers found: [${headerSample}]`);
}
