// src/modules/import/parsers/tests/kiwibank.test.ts
import { parseKiwibank } from '@parsers/kiwibank'

describe('parseKiwibank', () => {
  it('parses Kiwibank CSV rows correctly', () => {
    const csv = `"Date","Amount","Description"
"2024-01-07","-20.00","Coffee"
"2024-01-08","300.00","Bonus"`

    const result = parseKiwibank(csv)

    expect(result).toEqual([
      {
        date: '2024-01-07',
        amount: -20.0,
        description: 'Coffee'
      },
      {
        date: '2024-01-08',
        amount: 300.0,
        description: 'Bonus'
      }
    ])
  })
})