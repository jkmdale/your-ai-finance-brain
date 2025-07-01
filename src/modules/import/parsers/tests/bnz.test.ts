// src/modules/import/parsers/tests/bnz.test.ts
import { parseBNZ } from '@parsers/bnz'

describe('parseBNZ', () => {
  it('parses BNZ transactions correctly', () => {
    const csv = `"Date","Amount","Description"
"2024-01-05","-75.00","Restaurant"
"2024-01-06","150.00","Refund"`

    const result = parseBNZ(csv)

    expect(result).toEqual([
      {
        date: '2024-01-05',
        amount: -75.0,
        description: 'Restaurant'
      },
      {
        date: '2024-01-06',
        amount: 150.0,
        description: 'Refund'
      }
    ])
  })
})