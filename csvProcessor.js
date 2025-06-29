// /scripts/core/csvProcessor.js

import Papa from 'papaparse';
import { schemaTemplates } from '../data/schemaExamples.js';

export async function parseCSV(file, onComplete, onError) {
  if (!file) return onError('No file selected');

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      if (!results.data || results.data.length === 0) {
        return onError('CSV appears to be empty');
      }

      const detectedSchema = detectSchema(results.meta.fields);
      if (!detectedSchema) {
        return onError('CSV format not recognized');
      }

      const cleanedData = results.data.map((row) => {
        return {
          date: normalizeDate(row[detectedSchema.date]),
          description: row[detectedSchema.description] || '',
          amount: parseFloat(row[detectedSchema.amount] || 0),
          category: null // to be filled later
        };
      });

      onComplete(cleanedData);
    },
    error: function (err) {
      onError('Error parsing CSV: ' + err.message);
    }
  });
}

function detectSchema(headers) {
  for (const template of schemaTemplates) {
    const match = template.fields.every((field) =>
      headers.some((h) => h.toLowerCase().includes(field))
    );
    if (match) {
      return template.map;
    }
  }
  return null;
}

function normalizeDate(dateStr) {
  // Format agnostic parse (can use date-fns if needed)
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}
