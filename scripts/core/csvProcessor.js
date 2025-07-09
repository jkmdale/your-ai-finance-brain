// scripts/core/csvProcessor.js

import Papa from 'papaparse'; import { parse as parseDate, isValid } from 'date-fns'; import { categoriseTransactions } from '../Ai/ai/claudeApi.js'; import { generateZeroBasedBudget } from './categoriser.js'; import { generateSmartGoals } from './categoriser.js'; import { updateDashboard } from '../../src/App.jsx'; // Adjust if needed

const supportedFormats = [ 'dd/MM/yyyy', 'yyyy-MM-dd', 'dd MMM yyyy', 'dd-MM-yy', 'MM/dd/yyyy', ];

function tryParseDate(dateStr) { const trimmed = dateStr.trim(); for (const fmt of supportedFormats) { const parsed = parseDate(trimmed, fmt, new Date()); if (isValid(parsed)) { return parsed.toISOString().split('T')[0]; } } console.warn('Unrecognized date format:', dateStr); return null; }

function detectAndMap(row, headers) { const lowerHeaders = headers.map(h => h.toLowerCase());

const dateKey = lowerHeaders.find(h => h.includes('date')); const descKey = lowerHeaders.find(h => h.includes('desc') || h.includes('particulars') || h.includes('details')); const amtKey = lowerHeaders.find(h => h.includes('amount') || h.includes('debit') || h.includes('credit'));

if (!dateKey || !descKey || !amtKey) { throw new Error('CSV format not supported — could not detect columns'); }

return { date: tryParseDate(row[dateKey] || ''), description: row[descKey]?.trim() || '', amount: parseFloat((row[amtKey] || '0').replace(/[^\d.-]/g, '')), }; }

export function handleCSVUpload(files) { if (!files.length) return;

const allTransactions = []; let filesProcessed = 0;

Array.from(files).forEach(file => { Papa.parse(file, { header: true, skipEmptyLines: true, complete: async (results) => { const headers = results.meta.fields || []; const rows = results.data;

for (let row of rows) {
      try {
        const tx = detectAndMap(row, headers);
        if (tx.date && !isNaN(tx.amount)) {
          allTransactions.push(tx);
        }
      } catch (err) {
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

