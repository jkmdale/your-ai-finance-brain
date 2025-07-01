// src/modules/import/parsers/tests/westpac.test.ts
import { parseWestpac } from '@parsers/westpac'

describe('parseWestpac', () => {
  it('parses Westpac CSV rows correctly', () => {
    const input = [
      ['Date', 'Amount', 'Description'],
      ['2023-07-01', '-25.00', 'Uber Ride'],
      ['2023-07-02', '150.00', 'Freelance Work']
    ]

    const result = parseWestpac(input)

    expect(result).toEqual([
      {
        date: '2023-07-01',
        amount: -25.0,
        description: 'Uber Ride',
        source: 'Westpac'
      },
      {
        date: '2023-07-02',
        amount: 150.0,
        description: 'Freelance Work',
        source: 'Westpac'
      }
    ])
  })
})