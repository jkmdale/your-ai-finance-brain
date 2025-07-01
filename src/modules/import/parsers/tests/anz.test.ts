/* File: __tests__/parsers/anz.test.ts */
import { parseANZ } from '../../../src/modules/import/parsers/anz';

describe('parseANZ', () => {
  it('parses valid debit and credit transactions', () => {
    const mockData = [
      { Date: '01/06/2024', Details: 'Coffee Shop', Amount: '-5.00' },
      { Date: '02/06/2024', Details: 'Salary Payment', Amount: '2500.00' }
    ];

    const result = parseANZ(mockData);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      date: '2024-06-01',
      description: 'Coffee Shop',
      amount: -5.0,
      type: 'debit',
      account: 'ANZ'
    });

    expect(result[1]).toMatchObject({
      date: '2024-06-02',
      description: 'Salary Payment',
      amount: 2500.0,
      type: 'credit',
      account: 'ANZ'
    });
  });
});
