/* File: src/modules/import/parsers/bnz.ts */
import { normalizeDate, parseFloatSafe } from '../../utils/format';
import { getField } from '../utils/parseHelpers';
import { Transaction } from '../../../types/Transaction';

export function parseBNZ(data: any[]): Transaction[] {
  return data.map(row => ({
    date: normalizeDate(getField(row, 'Date')),
    description: getField(row, 'Description'),
    amount: parseFloatSafe(getField(row, 'Amount')),
    type: parseFloatSafe(getField(row, 'Amount')) < 0 ? 'debit' : 'credit',
    account: 'BNZ',
  }));
}
