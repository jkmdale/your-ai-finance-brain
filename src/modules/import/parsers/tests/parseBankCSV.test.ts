// src/modules/import/parsers/tests/parseBankCSV.test.ts
import { parseBankCSV } from '@parsers/bankCsvParser'

const mockData = [
  ['Date', 'Amount', 'Description'],
  ['2024-01-01', '-100.00', 'Test item']
]

describe('parseBankCSV', () => {
  it('routes to ANZ parser when filename contains anz', () => {
    const parsed = parseBankCSV('anz_transactions.csv', mockData)
    expect(parsed[0].source).toBe('ANZ')
  })

  it('routes to ASB parser when filename contains asb', () => {
    const parsed = parseBankCSV('asb-file.csv', mockData)
    expect(parsed[0].source).toBe('ASB')
  })

  it('routes to BNZ parser when filename contains bnz', () => {
    const parsed = parseBankCSV('bnz-history.csv', mockData)
    expect(parsed[0].source).toBe('BNZ')
  })

  it('routes to Westpac parser when filename contains westpac', () => {
    const parsed = parseBankCSV('westpac_data.csv', mockData)
    expect(parsed[0].source).toBe('Westpac')
  })

  it('routes to Kiwibank parser when filename contains kiwibank', () => {
    const parsed = parseBankCSV('kiwibank_jan.csv', mockData)
    expect(parsed[0].source).toBe('Kiwibank')
  })

  it('throws an error for unknown bank names', () => {
    expect(() => parseBankCSV('unknownbank.csv', mockData)).toThrow(
      'Unknown bank CSV format: unknownbank.csv'
    )
  })
})