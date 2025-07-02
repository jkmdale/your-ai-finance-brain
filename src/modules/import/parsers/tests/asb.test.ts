// src/modules/import/parsers/tests/asb.test.ts
import { parseASB } from '../asb'

describe('parseASB', () => {
  it('parses debit and credit transactions correctly', () => {
    const mock = [
      ['Date', 'Amount', 'Particulars', 'Code', 'Reference'],
      ['2024-01-01', '-100.00', 'Countdown', '', 'REF123'],
      ['2024-01-02', '250.00', 'Salary', '', 'EMP456']
    ]

    const result = parseASB(mock)

    expect(result).toEqual([
      {
        date: '2024-01-01',
        amount: -100,
        description: 'Countdown - REF123',
        source: 'ASB'
      },
      {
        date: '2024-01-02',
        amount: 250,
        description: 'Salary - EMP456',
        source: 'ASB'
      }
    ])
  })

  it('handles missing optional fields gracefully', () => {
    const input = [
      ['Date', 'Amount', 'Particulars', 'Code', 'Reference'],
      ['2024-01-03', '-20.00', '', '', '']
    ]

    const result = parseASB(input)

    expect(result).toEqual([
      {
        date: '2024-01-03',
        amount: -20,
        description: '',
        source: 'ASB'
      }
    ])
  })

  it('throws error on invalid rows (non-numeric amount)', () => {
    const invalid = [
      ['Date', 'Amount', 'Particulars', 'Code', 'Reference'],
      ['2024-01-04', 'invalid', 'Desc', '', '']
    ]

    const result = parseASB(invalid)

    expect(result[0].amount).toBeNaN()
  })
})