// src/modules/import/parsers/tests/asb.test.ts
import { parseASB } from '@parsers/asb'

describe('parseASB', () => {
  it('parses ASB transactions correctly', () => {
    const input = [
      ['Date', 'Amount', 'Description'],
      ['2023-07-01', '-10.00', 'Grocery Store'],
      ['2023-07-02', '200.00', 'Salary']
    ]

    const result = parseASB(input)

    expect(result).toEqual([
      {
        date: '2023-07-01',
        amount: -10.0,
        description: 'Grocery Store',
        source: 'ASB'
      },
      {
        date: '2023-07-02',
        amount: 200.0,
        description: 'Salary',
        source: 'ASB'
      }
    ])
  })
})