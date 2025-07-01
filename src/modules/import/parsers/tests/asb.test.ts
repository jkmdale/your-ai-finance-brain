/* File: __tests__/parsers/asb.test.ts */
import { parseASB } from '../../../src/modules/import/parsers/asb';

describe('parseASB', () => {
  it('parses ASB transactions correctly', () => {
    const mockData = [
      { Date: '15/05/2024', Particulars: 'Uber Eats', Amount: '-22.40' },
      { Date: '16/05/2024', Particulars: 'Refund', Amount: '10.00' }
    ];

    const result = parseASB(mockData);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      date: '2024-05-15',
      description: 'Uber Eats',
      amount: -22.4,
      type: 'debit',
      account: 'ASB'
    });

    expect(result[1]).toMatchObject({
      date: '2024-05-16',
      description: 'Refund',
      amount: 10.0,
      type: 'credit',
      account: 'ASB'
    });
  });
});
