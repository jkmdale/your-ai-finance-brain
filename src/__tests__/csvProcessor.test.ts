import { detectSchema } from '@/utils/csv/csvProcessor';
import { schemaTemplates } from '@/utils/csv/schemaExamples';

test('CustomLoanCSV format is correctly recognized', () => {
  const headers = ['Date', 'Details', 'Amount', 'PrincipalBalance'];
  const result = detectSchema(headers);

  expect(result).not.toBeNull();
  expect(result?.description).toBe('Details');
  expect(schemaTemplates.some(t => t.bank === 'CustomLoanCSV')).toBe(true);
});