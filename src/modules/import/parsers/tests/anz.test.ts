// src/modules/import/parsers/tests/anz.test.ts
import { parseANZ } from '@parsers/anz'

describe('parseANZ', () => {
  it('parses ANZ CSV rows correctly', () => {
    const input = [
      ['Date', 'Amount', 'Description'],
      ['2023-07-01', '-75.00', 'Online Shopping'],
      ['2023-07-02', '300.00', 'Project Payment']
    ]

    const result = parseANZ(input)

    expect(result).toEqual([
      {
        date: '2023-07-01',
        amount: -75.0,
        description: 'Online Shopping',
        source: 'ANZ'
      },
      {
        date: '2023-07-02',
        amount: 300.0,
        description: 'Project Payment',
        source: 'ANZ'
      }
    ])
  })
})