import { normalizeDate, parseFloatSafe } from '../../utils/format';
import { Transaction } from './bankCsvParser';

export function parseANZ(data: any[]): Transaction[] {
  return data.map(row => ({
    date: normalizeDate(row['Date']),
    description: row['Details'] || '',
    amount: parseFloatSafe(row['Amount']),
    type: parseFloatSafe(row['Amount']) < 0 ? 'debit' : 'credit',
    account: 'ANZ',
  }));
}
