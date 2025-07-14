// src/modules/import/parsers/tests/parseBankCSV.test.ts
import { parseBankCSV } from '../bankCsvParser'

describe('parseBankCSV', () => {
  // Fixed: Use object format instead of array format for parsed CSV data
  const mockData = [
    { Date: '2024-01-01', Amount: '-100.00', Description: 'Test item' }
  ]

  it('routes to ANZ parser when filename contains anz', () => {
    const parsed = parseBankCSV('anz_transactions.csv', mockData)
    expect(parsed[0].account).toBe('ANZ') // Updated from 'source' to 'account'
    expect(parsed[0].date).toBe('2024-01-01')
    expect(parsed[0].amount).toBe(-100.00)
  })

  it('routes to ASB parser when filename contains asb', () => {
    const parsed = parseBankCSV('asb-file.csv', mockData)
    expect(parsed[0].account).toBe('ASB') // Updated from 'source' to 'account'
    expect(parsed[0].date).toBe('2024-01-01')
    expect(parsed[0].amount).toBe(-100.00)
  })

  it('routes to BNZ parser when filename contains bnz', () => {
    const parsed = parseBankCSV('bnz-history.csv', mockData)
    expect(parsed[0].account).toBe('BNZ') // Updated from 'source' to 'account'
    expect(parsed[0].date).toBe('2024-01-01')
    expect(parsed[0].amount).toBe(-100.00)
  })

  it('routes to Westpac parser when filename contains westpac', () => {
    const parsed = parseBankCSV('westpac_data.csv', mockData)
    expect(parsed[0].account).toBe('Westpac') // Updated from 'source' to 'account'
    expect(parsed[0].date).toBe('2024-01-01')
    expect(parsed[0].amount).toBe(-100.00)
  })

  it('routes to Kiwibank parser when filename contains kiwibank', () => {
    const parsed = parseBankCSV('kiwibank_jan.csv', mockData)
    expect(parsed[0].account).toBe('Kiwibank') // Updated from 'source' to 'account'
    expect(parsed[0].date).toBe('2024-01-01')
    expect(parsed[0].amount).toBe(-100.00)
  })

  it('handles unknown bank names gracefully', () => {
    // Updated expectation - the unified parser now handles unknown formats
    const parsed = parseBankCSV('unknownbank.csv', mockData)
    expect(parsed).toBeDefined()
    expect(Array.isArray(parsed)).toBe(true)
    // Should still process data even if bank is unknown
    expect(parsed.length).toBeGreaterThan(0)
  })
})