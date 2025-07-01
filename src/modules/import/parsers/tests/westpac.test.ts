// src/modules/import/parsers/tests/westpac.test.ts
import { parseWestpac } from '@parsers/westpac'

describe('parseWestpac', () => {
  it('parses Westpac CSV data correctly', () => {
    const csv = `"Date","Amount","Description"
"2024-01-09","-45.00","Taxi"
"2024-01-10","500.00","Freelance"`

    const result = parseWestpac(csv)

    expect(result).toEqual([
      {
        date: '2024-01-09',
        amount: -45.0,
        description: 'Taxi'
      },
      {
        date: '2024-01-10',
        amount: 500.0,
        description: 'Freelance'
      }
    ])
  })
})