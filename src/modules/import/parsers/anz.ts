/* File: src/modules/import/parsers/anz.ts */
import { normalizeDate, parseFloatSafe } from '../../utils/format';
import { getField } from '../utils/parseHelpers';
import { Transaction } from '../../../types/Transaction';

export function parseANZ(data: any[]): Transaction[] {
  return data.map(row => ({
    date: normalizeDate(getField(row, 'Date')),
    description: getField(row, 'Details'),
    amount: parseFloatSafe(getField(row, 'Amount')),
    type: parseFloatSafe(getField(row, 'Amount')) < 0 ? 'debit' : 'credit',
    account: 'ANZ',
  }));
}
