/* File: src/modules/import/parsers/asb.ts */
import { normalizeDate, parseFloatSafe } from '../../utils/format';
import { getField } from '../utils/parseHelpers';
import { Transaction } from '../../../types/Transaction';

export function parseASB(data: any[]): Transaction[] {
  return data.map(row => ({
    date: normalizeDate(getField(row, 'Date')),
    description: getField(row, 'Particulars'),
    amount: parseFloatSafe(getField(row, 'Amount')),
    type: parseFloatSafe(getField(row, 'Amount')) < 0 ? 'debit' : 'credit',
    account: 'ASB',
  }));
}
