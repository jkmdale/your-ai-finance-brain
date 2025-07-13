/*
  File: src/modules/import/parsers/tests/unifiedParser.test.ts
  Description: Tests for the unified bank parser
*/

/// <reference types="jest" />

import { parseUnifiedBankCSV } from '../unifiedBankParser';
import { addBankConfig } from '../bankConfigs';

describe('Unified Bank Parser', () => {
  describe('Known Bank Formats', () => {
    it('should parse ANZ format correctly', () => {
      const data = [
        { 'Date': '01/12/2024', 'Details': 'Coffee Shop', 'Amount': '-5.50' },
        { 'Date': '02/12/2024', 'Details': 'Salary', 'Amount': '3500.00' }
      ];
      
      const result = parseUnifiedBankCSV('anz-statement.csv', data);
      
      expect(result.detectedBank).toBe('ANZ');
      expect(result.confidence).toBe('high');
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]).toMatchObject({
        date: '2024-12-01',
        description: 'Coffee Shop',
        amount: 5.50,
        type: 'debit',
        account: 'ANZ'
      });
    });

    it('should parse Kiwibank with separate debit/credit columns', () => {
      const data = [
        { 'Date': '01/12/2024', 'Payee': 'Supermarket', 'Debit': '125.00', 'Credit': '' },
        { 'Date': '02/12/2024', 'Payee': 'Interest', 'Debit': '', 'Credit': '2.50' }
      ];
      
      const result = parseUnifiedBankCSV('kiwibank_export.csv', data);
      
      expect(result.detectedBank).toBe('Kiwibank');
      expect(result.transactions[0].type).toBe('debit');
      expect(result.transactions[0].amount).toBe(125.00);
      expect(result.transactions[1].type).toBe('credit');
      expect(result.transactions[1].amount).toBe(2.50);
    });
  });

  describe('Unknown Bank Formats', () => {
    it('should handle unknown format with standard column names', () => {
      const data = [
        { 'Transaction Date': '2024-12-01', 'Merchant': 'Gas Station', 'Transaction Amount': '-65.00' },
        { 'Transaction Date': '2024-12-02', 'Merchant': 'Bank Transfer', 'Transaction Amount': '500.00' }
      ];
      
      const result = parseUnifiedBankCSV('unknown-bank.csv', data);
      
      expect(result.detectedBank).toBe('Unknown');
      expect(result.confidence).toBe('low');
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].description).toBe('Gas Station');
    });

    it('should handle unusual column names', () => {
      const data = [
        { 'TxnDate': '01/12/24', 'Details/Narrative': 'Online Purchase', 'Value': '-89.99' },
        { 'TxnDate': '02/12/24', 'Details/Narrative': 'Refund', 'Value': '45.00' }
      ];
      
      const result = parseUnifiedBankCSV('weird-format.csv', data);
      
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].date).toBe('2024-12-01');
      expect(result.transactions[0].amount).toBe(89.99);
    });

    it('should handle formats with combined description fields', () => {
      const data = [
        { 
          'Date': '2024-12-01', 
          'Code': 'POS', 
          'Reference': '12345', 
          'Description': 'Retail Store',
          'Amount': '-45.00'
        }
      ];
      
      const result = parseUnifiedBankCSV('complex-bank.csv', data);
      
      expect(result.transactions[0].description).toContain('Retail Store');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data gracefully', () => {
      const result = parseUnifiedBankCSV('empty.csv', []);
      
      expect(result.transactions).toHaveLength(0);
      expect(result.confidence).toBe('low');
      expect(result.warnings).toContain('No data to parse');
    });

    it('should handle malformed amounts', () => {
      const data = [
        { 'Date': '01/12/2024', 'Description': 'Test 1', 'Amount': '$1,234.56' },
        { 'Date': '02/12/2024', 'Description': 'Test 2', 'Amount': 'NZD 500.00' },
        { 'Date': '03/12/2024', 'Description': 'Test 3', 'Amount': '(100.00)' } // Accounting format
      ];
      
      const result = parseUnifiedBankCSV('amounts-test.csv', data);
      
      expect(result.transactions[0].amount).toBe(1234.56);
      expect(result.transactions[1].amount).toBe(500.00);
      // Note: Current parser doesn't handle accounting format () as negative
    });

    it('should handle various date formats', () => {
      const data = [
        { 'Date': '01/12/2024', 'Desc': 'NZ Format', 'Amt': '-10' },
        { 'Date': '2024-12-02', 'Desc': 'ISO Format', 'Amt': '-20' },
        { 'Date': '3.12.24', 'Desc': 'Dot Format', 'Amt': '-30' },
        { 'Date': '04-12-2024', 'Desc': 'Dash Format', 'Amt': '-40' }
      ];
      
      const result = parseUnifiedBankCSV('dates-test.csv', data);
      
      expect(result.transactions[0].date).toBe('2024-12-01');
      expect(result.transactions[1].date).toBe('2024-12-02');
      expect(result.transactions[2].date).toBe('2024-12-03');
      expect(result.transactions[3].date).toBe('2024-12-04');
    });
  });

  describe('Custom Bank Configuration', () => {
    it('should support adding new bank configurations', () => {
      // Add a custom bank configuration
      addBankConfig({
        name: 'Future Bank NZ',
        identifiers: {
          filePatterns: ['futurebank', 'fbnz'],
          headerPatterns: ['futurebank', 'txn_id'],
          contentPatterns: ['future bank nz']
        },
        columns: {
          date: ['Txn Date', 'Transaction Date'],
          description: ['Txn Description', 'Details'],
          amount: ['Txn Amount'],
          reference: ['Txn ID', 'Reference Number']
        }
      });
      
      const data = [
        { 
          'Txn Date': '01/12/2024', 
          'Txn Description': 'Future Purchase',
          'Txn Amount': '-99.99',
          'Txn ID': 'FB123456'
        }
      ];
      
      const result = parseUnifiedBankCSV('futurebank_export.csv', data);
      
      expect(result.detectedBank).toBe('Future Bank NZ');
      expect(result.confidence).toBe('high');
      expect(result.transactions[0].description).toContain('Future Purchase');
      expect(result.transactions[0].description).toContain('FB123456');
    });
  });
});