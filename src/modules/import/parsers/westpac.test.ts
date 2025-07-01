/* File: __tests__/parsers/westpac.test.ts */
import { parseWestpac } from '../../../src/modules/import/parsers/westpac';

describe('parseWestpac', () => {
  it('parses Westpac CSV rows correctly', () => {
    const mockData = [
      { Date: '01/04/2024', 'Transaction Details': 'BP Fuel', Amount: '-80.00' },
      { Date: '02/04/2024', 'Transaction Details': 'Interest', Amount: '1.25' }
    ];

    const result = parseWestpac(mockData);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      date: '2024-04-01',
      description: 'BP Fuel',
      amount: -80.0,
      type: 'debit',
      account: 'Westpac'
    });

    expect(result[1]).toMatchObject({
      date: '2024-04-02',
      description: 'Interest',
      amount: 1.25,
      type: 'credit',
      account: 'Westpac'
    });
  });
});
