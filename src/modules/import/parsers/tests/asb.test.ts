// src/modules/import/parsers/tests/asb.test.ts import { parseASB } from '@parsers/asb'

describe('parseASB', () => { it('parses ASB transactions correctly', () => { const csv = "Date","Amount","Description" "2024-01-01","-100.00","Test purchase" "2024-01-02","200.00","Test deposit"

const result = parseASB(csv)

expect(result).toEqual([
  {
    date: '2024-01-01',
    amount: -100.0,
    description: 'Test purchase'
  },
  {
    date: '2024-01-02',
    amount: 200.0,
    description: 'Test deposit'
  }
])

}) })

