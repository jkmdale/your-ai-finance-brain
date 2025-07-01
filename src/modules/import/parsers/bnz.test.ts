/* File: __tests__/parsers/bnz.test.ts */
import { parseBNZ } from '../../../src/modules/import/parsers/bnz';

describe('parseBNZ', () => {
  it('parses BNZ CSV rows correctly', () => {
    const mockData = [
      { Date: '20/02/2024', Description: 'ATM Withdrawal', Amount: '-200.00' },
      { Date: '21/02/2024', Description: 'Deposit', Amount: '500.00' }
    ];

    const result = parseBNZ(mockData);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      date: '2024-02-20',
      description: 'ATM Withdrawal',
      amount: -200.0,
      type: 'debit',
      account: 'BNZ'
    });

    expect(result[1]).toMatchObject({
      date: '2024-02-21',
      description: 'Deposit',
      amount: 500.0,
      type: 'credit',
      account: 'BNZ'
    });
  });
});
