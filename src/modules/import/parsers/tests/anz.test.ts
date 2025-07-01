// src/modules/import/parsers/tests/anz.test.ts
import { parseANZ } from '@parsers/anz'

describe('parseANZ', () => {
  it('parses ANZ transactions correctly', () => {
    const csv = `"Date","Amount","Description"
"2024-01-03","-50.00","Groceries"
"2024-01-04","100.00","Salary"`

    const result = parseANZ(csv)

    expect(result).toEqual([
      {
        date: '2024-01-03',
        amount: -50.0,
        description: 'Groceries'
      },
      {
        date: '2024-01-04',
        amount: 100.0,
        description: 'Salary'
      }
    ])
  })
})