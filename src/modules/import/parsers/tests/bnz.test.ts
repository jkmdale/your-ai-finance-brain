// src/modules/import/parsers/tests/bnz.test.ts
import { parseBNZ } from '../bnz'

describe('parseBNZ', () => {
  it('parses BNZ transactions correctly', () => {
    const data = [
      { Date: '2024-01-05', Amount: '-75.00', Description: 'Restaurant' },
      { Date: '2024-01-06', Amount: '150.00', Description: 'Refund' }
    ]

    const result = parseBNZ(data)

    expect(result).toEqual([
      {
        date: '2024-01-05',
        amount: -75.0,
        description: 'Restaurant',
        type: 'debit',
        account: 'BNZ'
      },
      {
        date: '2024-01-06',
        amount: 150.0,
        description: 'Refund',
        type: 'credit',
        account: 'BNZ'
      }
    ])
  })
})