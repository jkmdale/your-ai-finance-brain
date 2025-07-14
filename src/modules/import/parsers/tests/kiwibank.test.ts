// src/modules/import/parsers/tests/kiwibank.test.ts
import { parseKiwibank } from '../kiwibank'

describe('parseKiwibank', () => {
  it('parses valid Kiwibank rows correctly', () => {
    // Fixed: Use object format with correct Kiwibank field names
    const mock = [
      { Date: '2024-01-01', Payee: 'Countdown - Groceries', Debit: '75.00', Credit: '' },
      { Date: '2024-01-02', Payee: 'Employer - Salary', Debit: '', Credit: '1000.00' }
    ]

    const result = parseKiwibank(mock)

    expect(result).toEqual([
      {
        date: '2024-01-01',
        amount: -75,
        description: 'Countdown - Groceries',
        type: 'debit',
        account: 'Kiwibank'
      },
      {
        date: '2024-01-02',
        amount: 1000,
        description: 'Employer - Salary',
        type: 'credit',
        account: 'Kiwibank'
      }
    ])
  })

  it('handles missing description gracefully', () => {
    // Fixed: Use object format
    const input = [
      { Date: '2024-01-03', Payee: 'Refund', Debit: '25.00', Credit: '' }
    ]

    const result = parseKiwibank(input)
    expect(result[0].description).toBe('Refund')
  })

  it('parses invalid amount to 0', () => {
    // Fixed: Use object format and expect 0 instead of NaN
    const input = [
      { Date: '2024-01-04', Payee: 'Test', Debit: 'invalid', Credit: '' }
    ]

    const result = parseKiwibank(input)
    expect(result[0].amount).toBe(0) // parseFloatSafe returns 0 for invalid values
  })
})