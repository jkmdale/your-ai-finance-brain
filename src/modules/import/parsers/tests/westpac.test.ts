// src/modules/import/parsers/tests/westpac.test.ts
import { parseWestpac } from '../westpac'

describe('parseWestpac', () => {
  it('parses valid Westpac transactions', () => {
    // Fixed: Use object format with correct Westpac field names
    const rows = [
      { Date: '2024-01-01', Description: 'Transport', Amount: '-60.00' },
      { Date: '2024-01-02', Description: 'Payroll', Amount: '700.00' }
    ]

    const result = parseWestpac(rows)

    expect(result).toEqual([
      {
        date: '2024-01-01',
        amount: -60,
        description: 'Transport',
        type: 'debit',
        account: 'Westpac'
      },
      {
        date: '2024-01-02',
        amount: 700,
        description: 'Payroll',
        type: 'credit',
        account: 'Westpac'
      }
    ])
  })

  it('handles missing description field gracefully', () => {
    // Fixed: Use object format
    const data = [
      { Date: '2024-01-03', Amount: '100.00' } // Missing Description
    ]

    const result = parseWestpac(data)
    expect(result[0].description).toBe('') // getField returns empty string for missing fields
    expect(result[0].amount).toBe(100)
    expect(result[0].account).toBe('Westpac')
  })

  it('parses invalid amount to 0', () => {
    // Fixed: Use object format and expect 0 instead of NaN
    const input = [
      { Date: '2024-01-04', Description: 'Test', Amount: 'invalid' }
    ]

    const result = parseWestpac(input)
    expect(result[0].amount).toBe(0) // parseFloatSafe returns 0 for invalid values
  })
})