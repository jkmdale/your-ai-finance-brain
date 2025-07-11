import React, { useState } from 'react';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { FileUploadZone } from '@/components/csv/FileUploadZone';

const schemaTemplates = [
  {
    name: 'ANZ Bank',
    fields: ['date', 'amount', 'particulars'],
    map: { date: 'Date', amount: 'Amount', description: 'Particulars' }
  },
  {
    name: 'ASB Bank',
    fields: ['date', 'amount', 'description'],
    map: { date: 'Date', amount: 'Amount', description: 'Description' }
  },
  {
    name: 'Westpac Bank',
    fields: ['date', 'amount', 'transaction details'],
    map: { date: 'Date', amount: 'Amount', description: 'Transaction Details' }
  },
  {
    name: 'Kiwibank',
    fields: ['date', 'amount', 'payee'],
    map: { date: 'Date', amount: 'Amount', description: 'Payee' }
  },
  {
    name: 'Generic Format',
    fields: ['date', 'amount', 'description'],
    map: { date: 'Date', amount: 'Amount', description: 'Description' }
  }
];

function detectSchema(headers: string[]) {
  for (const template of schemaTemplates) {
    const match = template.fields.every(field =>
      headers.some(h => h.toLowerCase().includes(field.toLowerCase()))
    );
    if (match) return template.map;
  }
  return null;
}

function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim();
  const patterns = [
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy' },
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy2' },
    { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd' },
    { regex: /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i, type: 'dmmy' }
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern.regex);
    if (match) {
      try {
        let day, month, year;
        if (pattern.type === 'ymd') {
          [ , year, month, day ] = match.slice(1).map(Number);
        } else if (pattern.type === 'dmy2') {
          [ , day, month, year ] = match.slice(1).map(Number);
          year = year > 50 ? 1900 + year : 2000 + year;
        } else if (pattern.type === 'dmmy') {
          day = parseInt(match[1]);
          const monthMap = {
            jan:1,feb:2,mar:3,apr:4,may:5,jun:6,
            jul:7,aug:8,sep:9,oct:10,nov:11,dec:12
          };
          month = monthMap[match[2].toLowerCase()];
          year = parseInt(match[3]);
        } else {
          [ , day, month, year ] = match.slice(1).map(Number);
        }
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          return date.toISOString().split('T')[0];
        }
      } catch (err) {
        continue;
      }
    }
  }
  return null;
}

export function CSVUpload() {
  const { toast } = useToast();
  const [parsed, setParsed] = useState([]);

  function handleFiles(files: File[]) {
    if (!files || files.length === 0) return;
    const file = files[0];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        const headers = results.meta.fields || [];
        const map = detectSchema(headers);

        if (!map) {
          toast({
            title: "CSV format not recognised",
            description: "Try using ANZ, ASB, Westpac, or Kiwibank exports"
          });
          return;
        }

        const transactions = [];

        for (const row of rows) {
          const rawDate = row[map.date];
          const rawAmount = row[map.amount];
          const rawDesc = row[map.description];

          const date = normalizeDate(rawDate);
          const amount = parseFloat(String(rawAmount).replace(/[^0-9\.-]/g, ''));
          const description = rawDesc?.trim() || '';

          if (!date || isNaN(amount) || !description) {
            console.warn("Skipping invalid row:", row);
            continue;
          }

          transactions.push({ date, amount, description });
        }

        if (transactions.length === 0) {
          toast({ title: "No valid transactions found", description: "Check date and amount formatting" });
          return;
        }

        setParsed(transactions);
        toast({ title: "CSV processed!", description: `${transactions.length} transactions imported.` });

        // Optional: Trigger Claude or backend save here
        // await sendToClaudeOrSupabase(transactions);
      }
    });
  }

  return (
    <div className="w-full">
      <FileUploadZone onFilesSelected={handleFiles} />
      {parsed.length > 0 && (
        <pre className="mt-4 text-sm text-left whitespace-pre-wrap">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  );
}
