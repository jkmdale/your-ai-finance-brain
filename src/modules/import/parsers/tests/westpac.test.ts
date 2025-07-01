// src/modules/import/parsers/tests/westpac.test.ts
import { parseWestpac } from '@parsers/westpac'

describe('parseWestpac', () => {
  it('parses valid Westpac transactions', () => {
    const rows = [
      ['Date', 'Amount', 'Transaction Details'],
      ['2024-01-01', '-60.00', 'Transport'],
      ['2024-01-02', '700.00', 'Payroll']
    ]

    const result = parseWestpac(rows)

    expect(result).toEqual([
      {
        date: '2024-01-01',
        amount: -60,
        description: 'Transport',
        source: 'Westpac'
      },
      {
        date: '2024-01-02',
        amount: 700,
        description: 'Payroll',
        source: 'Westpac'
      }
    ])
  })

  it('handles missing description field gracefully', () => {
    const input = [
      ['Date', 'Amount', 'Transaction Details'],
      ['2024-01-03', '500.00', '']
    ]

    const result = parseWestpac(input)
    expect(result[0].description).toBe('')
  })

  it('returns NaN for invalid amount', () => {
    const input = [
      ['Date', 'Amount', 'Transaction Details'],
      ['2024-01-04', 'oops', 'Error']
    ]

    const result = parseWestpac(input)
    expect(result[0].amount).toBeNaN()
  })
})