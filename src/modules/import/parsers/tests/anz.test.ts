// src/modules/import/parsers/tests/anz.test.ts
import { parseANZ } from '@parsers/anz'

describe('parseANZ', () => {
  it('parses ANZ data correctly', () => {
    const rows = [
      ['Date', 'Amount', 'Details', 'Particulars', 'Reference'],
      ['2024-01-01', '-55.00', 'Store', 'Groceries', '1234'],
      ['2024-01-02', '600.00', 'Company', 'Salary', '']
    ]

    const result = parseANZ(rows)

    expect(result).toEqual([
      {
        date: '2024-01-01',
        amount: -55,
        description: 'Store - Groceries - 1234',
        source: 'ANZ'
      },
      {
        date: '2024-01-02',
        amount: 600,
        description: 'Company - Salary',
        source: 'ANZ'
      }
    ])
  })

  it('parses invalid amounts to NaN', () => {
    const rows = [
      ['Date', 'Amount', 'Details', 'Particulars', 'Reference'],
      ['2024-01-03', 'invalid', 'Foo', '', '']
    ]

    const result = parseANZ(rows)
    expect(result[0].amount).toBeNaN()
  })

  it('handles missing fields safely', () => {
    const rows = [
      ['Date', 'Amount', 'Details', 'Particulars', 'Reference'],
      ['2024-01-04', '50.00', '', '', '']
    ]

    const result = parseANZ(rows)
    expect(result[0].description).toBe('')
  })
})