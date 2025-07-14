// src/modules/import/parsers/tests/anz.test.ts
import { parseANZ } from '../anz'

describe('parseANZ', () => {
  it('parses ANZ data correctly', () => {
    // Fixed: Use object format with correct ANZ field names
    const rows = [
      { Date: '2024-01-01', Details: 'Store - Groceries - 1234', Amount: '-55.00' },
      { Date: '2024-01-02', Details: 'Company - Salary', Amount: '600.00' }
    ]

    const result = parseANZ(rows)

    expect(result).toEqual([
      {
        date: '2024-01-01',
        amount: -55,
        description: 'Store - Groceries - 1234',
        type: 'debit',
        account: 'ANZ'
      },
      {
        date: '2024-01-02',
        amount: 600,
        description: 'Company - Salary',
        type: 'credit',
        account: 'ANZ'
      }
    ])
  })

  it('parses invalid amounts to 0', () => {
    // Fixed: Use correct object format and expect 0 instead of NaN
    const rows = [
      { Date: '2024-01-01', Details: 'Test', Amount: 'invalid' }
    ]

    const result = parseANZ(rows)
    expect(result[0].amount).toBe(0) // parseFloatSafe returns 0 for invalid values
  })

  it('handles missing fields safely', () => {
    const rows = [
      { Date: '2024-01-01' } // Missing Details and Amount
    ]

    const result = parseANZ(rows)
    expect(result[0].date).toBe('2024-01-01')
    expect(result[0].description).toBe('') // getField returns empty string for missing fields
    expect(result[0].amount).toBe(0) // parseFloatSafe returns 0 for undefined
    expect(result[0].account).toBe('ANZ')
  })
})