// src/modules/import/parsers/tests/kiwibank.test.ts
import { parseKiwibank } from '../kiwibank'

describe('parseKiwibank', () => {
  it('parses valid Kiwibank rows correctly', () => {
    const mock = [
      ['Date', 'Amount', 'Payee', 'Description'],
      ['2024-01-01', '-75.00', 'Countdown', 'Groceries'],
      ['2024-01-02', '1000.00', 'Employer', 'Salary']
    ]

    const result = parseKiwibank(mock)

    expect(result).toEqual([
      {
        date: '2024-01-01',
        amount: -75,
        description: 'Countdown - Groceries',
        source: 'Kiwibank'
      },
      {
        date: '2024-01-02',
        amount: 1000,
        description: 'Employer - Salary',
        source: 'Kiwibank'
      }
    ])
  })

  it('handles missing description gracefully', () => {
    const input = [
      ['Date', 'Amount', 'Payee', 'Description'],
      ['2024-01-03', '500.00', 'Refund', '']
    ]

    const result = parseKiwibank(input)
    expect(result[0].description).toBe('Refund')
  })

  it('parses NaN amount when value is invalid', () => {
    const input = [
      ['Date', 'Amount', 'Payee', 'Description'],
      ['2024-01-04', 'invalid', 'Shop', 'Item']
    ]

    const result = parseKiwibank(input)
    expect(result[0].amount).toBeNaN()
  })
})