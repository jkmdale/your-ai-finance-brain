/* File: __tests__/parsers/kiwibank.test.ts */
import { parseKiwibank } from '../../../src/modules/import/parsers/kiwibank';

describe('parseKiwibank', () => {
  it('parses Kiwibank CSV rows correctly', () => {
    const mockData = [
      { Date: '10/03/2024', Payee: 'Countdown', Amount: '-75.32' },
      { Date: '11/03/2024', Payee: 'Deposit', Amount: '100.00' }
    ];

    const result = parseKiwibank(mockData);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      date: '2024-03-10',
      description: 'Countdown',
      amount: -75.32,
      type: 'debit',
      account: 'Kiwibank'
    });

    expect(result[1]).toMatchObject({
      date: '2024-03-11',
      description: 'Deposit',
      amount: 100.0,
      type: 'credit',
      account: 'Kiwibank'
    });
  });
});
