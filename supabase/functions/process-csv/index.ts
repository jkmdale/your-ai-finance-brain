// File: supabase/functions/process-csv/index.ts import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'; import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; import { Database } from '../../_shared/database.types.ts'; import { CSVProcessor } from '../../../src/utils/csv/csvProcessor.ts';

serve(async (req) => { const supabaseClient = createClient<Database>( Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } }, } );

const { csvData, fileName } = await req.json(); const user = await supabaseClient.auth.getUser();

if (!user || !user.data?.user?.id) { return new Response( JSON.stringify({ error: 'User not authenticated.' }), { status: 401 } ); }

if (!csvData || typeof csvData !== 'string') { return new Response( JSON.stringify({ error: 'No CSV data provided' }), { status: 400 } ); }

const processor = new CSVProcessor(); const { headers, transactions, skippedRows, warnings, errors } = await processor.processCSV(csvData);

let processedCount = 0; let failedCount = 0; const insertedTransactions = [];

for (const txn of transactions) { const { error } = await supabaseClient.from('transactions').insert(txn); if (error) { failedCount++; errors.push(Insert failed for ${txn.id}: ${error.message}); } else { insertedTransactions.push(txn); processedCount++; } }

return new Response( JSON.stringify({ success: processedCount > 0, processed: processedCount, failed: failedCount, skipped: skippedRows.length, warnings, errors, insertedTransactions }), { status: 200 } ); });
