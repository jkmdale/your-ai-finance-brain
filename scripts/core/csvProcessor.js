import Papa from 'papaparse'; import { schemaTemplates } from '../data/schemaExamples.js';

export async function parseCSV(file, onComplete, onError) { if (!file) return onError('No file selected');

Papa.parse(file, { header: true, skipEmptyLines: true, complete: function (results) { if (!results.data || results.data.length === 0) { return onError('CSV appears to be empty'); }

console.log('🔍 CSV Headers detected:', results.meta.fields);
  const detectedSchema = detectSchema(results.meta.fields);
  if (!detectedSchema) {
    console.warn('⚠️ Using fallback schema for headers:', results.meta.fields);
    const fallbackSchema = createFallbackSchema(results.meta.fields);
    if (!fallbackSchema) {
      return onError('CSV format not recognized - no suitable columns found');
    }
    console.log('✅ Fallback schema applied:', fallbackSchema);
    return parseWithSchema(results.data, fallbackSchema, onComplete, onError);
  }
  
  console.log('✅ Schema detected:', detectedSchema);
  parseWithSchema(results.data, detectedSchema, onComplete, onError);
},
error: function (err) {
  onError('Error parsing CSV: ' + err.message);
}

}); }

function detectSchema(headers) { const lowerHeaders = headers.map(h => h.toLowerCase()); for (const template of schemaTemplates) { const match = template.fields.every(field => lowerHeaders.some(h => h.includes(field)) ); if (match) return template.map; } return null; }

function createFallbackSchema(headers) { const lowerHeaders = headers.map(h => h.toLowerCase());

const findMatch = (candidates) => lowerHeaders.find(h => candidates.some(c => h.includes(c)));

const dateKey = findMatch(['date', 'transaction', 'posting']); const descKey = findMatch(['description', 'particulars', 'narrative', 'details', 'payee']); const amountKey = findMatch(['amount', 'value', 'debit', 'credit']);

if (dateKey && descKey && amountKey) { return { date: headers[lowerHeaders.indexOf(dateKey)], description: headers[lowerHeaders.indexOf(descKey)], amount: headers[lowerHeaders.indexOf(amountKey)] }; }

return null; }

function parseWithSchema(data, schema, onComplete, onError) { const cleanedData = data.map((row, idx) => { const rawDate = row[schema.date]; const parsedDate = normalizeDate(rawDate); if (!parsedDate) { console.warn(Skipping row ${idx + 1} with invalid date: ${rawDate}); return null; } return { date: parsedDate, description: row[schema.description] || '', amount: parseFloat(row[schema.amount] || 0), category: null }; }).filter(Boolean);

onComplete(cleanedData); }

function normalizeDate(dateStr) { if (!dateStr) return null; const parts = dateStr.trim().split(/[/-]/); if (parts.length !== 3) return null;

const [a, b, c] = parts; let day, month, year;

if (c.length === 4) { // dd/mm/yyyy or mm/dd/yyyy day = parseInt(a); month = parseInt(b); year = parseInt(c); } else if (a.length === 4) { // yyyy-mm-dd year = parseInt(a); month = parseInt(b); day = parseInt(c); } else { return null; }

if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

const iso = new Date(year, month - 1, day).toISOString(); return iso.split('T')[0]; }

