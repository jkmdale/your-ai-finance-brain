// src/modules/import/parsers/tests/kiwibank.test.ts
import { parseKiwibank } from '@parsers/kiwibank'

describe('parseKiwibank', () => {
  it('parses Kiwibank CSV rows correctly', () => {
    const input = [
      ['Date', 'Amount', 'Description'],
      ['2023-07-01', '-50.00', 'Petrol Station'],
      ['2023-07-02', '1000.00', 'Invoice Payment']
    ]

    const result = parseKiwibank(input)

    expect(result).toEqual([
      {
        date: '2023-07-01',
        amount: -50.0,
        description: 'Petrol Station',
        source: 'Kiwibank'
      },
      {
        date: '2023-07-02',
        amount: 1000.0,
        description: 'Invoice Payment',
        source: 'Kiwibank'
      }
    ])
  })
})