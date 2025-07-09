// /src/services/csv-handler.ts

import Papa from 'papaparse'; import { parse as parseDate, isValid } from 'date-fns'; import { categoriseTransactions } from '@/services/claude'; import { generateZeroBasedBudget } from '@/services/budget'; import { generateSmartGoals } from '@/services/goals'; import { updateDashboard } from '@/services/dashboard';

const supportedFormats = [ 'dd/MM/yyyy', 'yyyy-MM-dd', 'dd MMM yyyy', 'dd-MM-yy', 'MM/dd/yyyy', ];

function tryParseDate(dateStr: string): string | null { const trimmed = dateStr.trim(); for (const fmt of supportedFormats) { const parsed = parseDate(trimmed, fmt, new Date()); if (isValid(parsed)) { return parsed.toISOString().split('T')[0]; } } console.warn('Unrecognized date format:', dateStr); return null; }

function detectAndMap(row: Record<string, string>, headers: string[]) { const lowerHeaders = headers.map(h => h.toLowerCase());

let dateKey = lowerHeaders.find(h => h.includes('date')); let descKey = lowerHeaders.find(h => h.includes('desc') || h.includes('particulars') || h.includes('details')); let amtKey = lowerHeaders.find(h => h.includes('amount') || h.includes('debit') || h.includes('credit'));

if (!dateKey || !descKey || !amtKey) { throw new Error('CSV format not supported — could not detect columns'); }

return { date: tryParseDate(row[dateKey] ?? ''), description: row[descKey]?.trim() ?? '', amount: parseFloat((row[amtKey] ?? '0').replace(/[^\d.-]/g, '')), }; }

export async function handleCSVUpload(files: FileList | File[]) { if (!files.length) return;

const allTransactions: any[] = []; let filesProcessed = 0;

Array.from(files).forEach(file => { Papa.parse(file, { header: true, skipEmptyLines: true, complete: async (results: Papa.ParseResult<Record<string, string>>) => { const headers = results.meta.fields ?? []; const rows = results.data;

for (let row of rows) {
      try {
        const tx = detectAndMap(row, headers);
        if (tx.date && !isNaN(tx.amount)) {
          allTransactions.push(tx);
        }
      } catch (err: any) {
        console.warn('Skipping row due to error:', err.message, row);
        continue;
      }
    }

    filesProcessed++;
    if (filesProcessed === files.length) {
      try {
        const categorised = await categoriseTransactions(allTransactions);
        const budget = generateZeroBasedBudget(categorised);
        const goals = generateSmartGoals(budget);
        updateDashboard(categorised, budget, goals);
        console.log('✔ CSV upload and processing complete');
      } catch (e) {
        console.error('❌ Error running post-upload pipeline:', e);
      }
    }
  },
  error: (err) => {
    console.error('❌ CSV parse failed:', err.message);
  },
});

}); }

