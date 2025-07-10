import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Brain, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { FileUploadZone } from '@/components/csv/FileUploadZone';
import Papa from 'papaparse';

// Schema detection for NZ banks and common formats
const schemaTemplates = [
  {
    name: 'ANZ Bank',
    fields: ['date', 'amount', 'particulars'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Particulars'
    }
  },
  {
    name: 'ASB Bank',
    fields: ['date', 'amount', 'description'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Description'
    }
  },
  {
    name: 'Westpac Bank',
    fields: ['date', 'amount', 'transaction'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Transaction Details'
    }
  },
  {
    name: 'Kiwibank',
    fields: ['date', 'amount', 'payee'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Payee'
    }
  },
  {
    name: 'BNZ Bank',
    fields: ['date', 'amount', 'reference'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Reference'
    }
  },
  {
    name: 'Generic Format',
    fields: ['date', 'amount'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Description'
    }
  }
];

function detectSchema(headers: string[], setDebugInfo?: (info: string) => void) {
  const debug = (message: string) => {
    console.log(message);
    if (setDebugInfo) {
      setDebugInfo(message);
    }
  };
  
  debug('🔍 CSV Headers found: ' + JSON.stringify(headers));
  debug('🔍 Headers type: ' + typeof headers + ', Length: ' + headers.length);
  debug('🔍 Raw headers: ' + JSON.stringify(headers));
  
  // Handle edge cases
  if (!headers || headers.length === 0) {
    debug('❌ No headers found in CSV');
    return null;
  }
  
  // Clean and normalize headers
  const cleanHeaders = headers
    .map(h => String(h || '').trim()) // Convert to string and trim
    .filter(h => h.length > 0); // Remove empty headers
    
  if (cleanHeaders.length === 0) {
    debug('❌ All headers are empty after cleaning');
    return null;
  }
  
  const lowerHeaders = cleanHeaders.map(h => h.toLowerCase().trim());
  debug('🔍 Cleaned headers: ' + JSON.stringify(cleanHeaders));
  debug('🔍 Normalized headers: ' + JSON.stringify(lowerHeaders));
  
  // Try exact template matching first
  for (const template of schemaTemplates) {
    debug(`🔍 Testing template: ${template.name} (requires: ${template.fields.join(', ')})`);
    const match = template.fields.every((field) => {
      const found = lowerHeaders.some((h) => h.includes(field.toLowerCase()));
      debug(`  - Looking for "${field}": ${found ? '✅' : '❌'}`);
      return found;
    });
    if (match) {
      debug(`✅ Matched template: ${template.name}`);
      return template.map;
    }
  }
  
  // If no template matches, try intelligent fallback detection
  debug('⚠️ No template matched, trying intelligent detection...');
  
  const schema = createFlexibleSchema(cleanHeaders, setDebugInfo);
  if (schema) {
    debug('✅ Created flexible schema: ' + JSON.stringify(schema));
    return schema;
  }
  
  // Last resort: try super flexible detection
  debug('⚠️ Flexible detection failed, trying super flexible detection...');
  const superFlexibleSchema = createSuperFlexibleSchema(cleanHeaders, setDebugInfo);
  if (superFlexibleSchema) {
    debug('✅ Created super flexible schema: ' + JSON.stringify(superFlexibleSchema));
    return superFlexibleSchema;
  }
  
  debug('❌ No schema could be detected. All available headers: ' + JSON.stringify(cleanHeaders));
  debug('❌ Consider these column names: Date/Amount are minimum required');
  return null;
}

function createFlexibleSchema(headers: string[], setDebugInfo?: (info: string) => void) {
  const debug = (message: string) => {
    console.log(message);
    if (setDebugInfo) {
      setDebugInfo(message);
    }
  };
  
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Find date column
  const datePatterns = ['date', 'transaction_date', 'posting_date', 'value_date', 'processed_date'];
  const dateHeader = findBestMatch(lowerHeaders, datePatterns);
  
  // Find separate debit/credit columns first
  const debitPatterns = ['debit', 'debit_amount', 'withdrawal', 'out'];
  const creditPatterns = ['credit', 'credit_amount', 'deposit', 'in'];
  const debitHeader = findBestMatch(lowerHeaders, debitPatterns);
  const creditHeader = findBestMatch(lowerHeaders, creditPatterns);
  
  // Find single amount column if no debit/credit
  const amountPatterns = ['amount', 'value', 'transaction_amount', 'net_amount'];
  const amountHeader = findBestMatch(lowerHeaders, amountPatterns);
  
  // Find description column
  const descriptionPatterns = ['description', 'particulars', 'payee', 'reference', 'details', 'memo', 'narrative', 'transaction_details'];
  const descriptionHeader = findBestMatch(lowerHeaders, descriptionPatterns);
  
  debug('🔍 Detected columns: ' + JSON.stringify({ dateHeader, amountHeader, debitHeader, creditHeader, descriptionHeader }));
  
  const originalHeaders = headers; // Keep original case
  
  // Check if we have separate debit/credit columns
  if (dateHeader && debitHeader && creditHeader) {
    return {
      date: originalHeaders[lowerHeaders.indexOf(dateHeader)],
      debit: originalHeaders[lowerHeaders.indexOf(debitHeader)],
      credit: originalHeaders[lowerHeaders.indexOf(creditHeader)],
      description: descriptionHeader ? originalHeaders[lowerHeaders.indexOf(descriptionHeader)] : debitHeader // fallback
    };
  }
  
  // Otherwise we need at least date and amount columns
  if (dateHeader && amountHeader) {
    return {
      date: originalHeaders[lowerHeaders.indexOf(dateHeader)],
      amount: originalHeaders[lowerHeaders.indexOf(amountHeader)],
      description: descriptionHeader ? originalHeaders[lowerHeaders.indexOf(descriptionHeader)] : amountHeader // fallback to amount column name
    };
  }
  
  return null;
}

function createSuperFlexibleSchema(headers: string[], setDebugInfo?: (info: string) => void) {
  const debug = (message: string) => {
    console.log(message);
    if (setDebugInfo) {
      setDebugInfo(message);
    }
  };
  
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  debug('🔍 Super flexible detection for headers: ' + JSON.stringify(lowerHeaders));
  
  // Very broad patterns - match even partial words
  let dateCol = null;
  let amountCol = null;
  let descCol = null;
  
  // Find date column (very flexible)
  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i];
    if (h.includes('date') || h.includes('time') || h.includes('day') || 
        h.includes('transaction') || h.includes('posting') || h.includes('process')) {
      dateCol = headers[i];
      debug(`📅 Found date column: "${dateCol}" (from "${h}")`);
      break;
    }
  }
  
  // Find amount column (very flexible)
  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i];
    if (h.includes('amount') || h.includes('value') || h.includes('total') ||
        h.includes('sum') || h.includes('balance') || h.includes('money') ||
        h.includes('debit') || h.includes('credit') || h.includes('$')) {
      amountCol = headers[i];
      debug(`💰 Found amount column: "${amountCol}" (from "${h}")`);
      break;
    }
  }
  
  // Find description column (very flexible)
  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i];
    if (h.includes('desc') || h.includes('detail') || h.includes('particular') ||
        h.includes('payee') || h.includes('reference') || h.includes('memo') ||
        h.includes('narrative') || h.includes('comment') || h.includes('note')) {
      descCol = headers[i];
      debug(`📝 Found description column: "${descCol}" (from "${h}")`);
      break;
    }
  }
  
  // If we still don't have essentials, use positional fallback
  if (!dateCol && headers.length > 0) {
    dateCol = headers[0];
    debug(`📅 Using first column as date: "${dateCol}"`);
  }
  
  if (!amountCol && headers.length > 1) {
    amountCol = headers[1];
    debug(`💰 Using second column as amount: "${amountCol}"`);
  }
  
  if (!descCol && headers.length > 2) {
    descCol = headers[2];
    debug(`📝 Using third column as description: "${descCol}"`);
  }
  
  if (dateCol && amountCol) {
    return {
      date: dateCol,
      amount: amountCol,
      description: descCol || amountCol
    };
  }
  
  debug('❌ Super flexible detection failed. Headers: ' + JSON.stringify(headers));
  return null;
}

function findBestMatch(headers: string[], patterns: string[]): string | null {
  // First try exact matches
  for (const pattern of patterns) {
    const match = headers.find(h => h === pattern);
    if (match) return match;
  }
  
  // Then try contains matches
  for (const pattern of patterns) {
    const match = headers.find(h => h.includes(pattern));
    if (match) return match;
  }
  
  // Finally try partial matches where header is contained in pattern
  for (const pattern of patterns) {
    const match = headers.find(h => pattern.includes(h) && h.length > 2);
    if (match) return match;
  }
  
  return null;
}

function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  const cleanDateStr = String(dateStr).trim();
  if (!cleanDateStr) return null;
  
  // NZ bank date format patterns
  const patterns = [
    // DD/MM/YYYY (most common NZ format)
    { regex: /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/, type: 'dmy' },
    // DD/MM/YY (2-digit year)
    { regex: /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/, type: 'dmy2' },
    // YYYY-MM-DD (ISO format)
    { regex: /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/, type: 'ymd' },
    // DD MMM YYYY (like 25 Dec 2023)
    { regex: /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i, type: 'dmmy' }
  ];

  for (const pattern of patterns) {
    const match = cleanDateStr.match(pattern.regex);
    if (match) {
      try {
        let day: number, month: number, year: number;
        
        if (pattern.type === 'ymd') {
          [, year, month, day] = match.slice(1).map(Number);
        } else if (pattern.type === 'dmy2') {
          [, day, month, year] = match.slice(1).map(Number);
          // Convert 2-digit year to 4-digit (assume 50+ = 19xx, otherwise 20xx)
          year = year > 50 ? 1900 + year : 2000 + year;
        } else if (pattern.type === 'dmmy') {
          day = parseInt(match[1]);
          const monthMap: { [key: string]: number } = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
          };
          month = monthMap[match[2].toLowerCase()];
          year = parseInt(match[3]);
        } else {
          [, day, month, year] = match.slice(1).map(Number);
        }
        
        // Validate ranges
        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
          continue;
        }
        
        // Create date object (month is 0-indexed in JS)
        const date = new Date(year, month - 1, day);
        
        // Verify the date is valid (handles leap years, month days, etc.)
        if (date.getFullYear() === year && 
            date.getMonth() === month - 1 && 
            date.getDate() === day) {
          return date.toISOString().split('T')[0];
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return null;
}

async function fetchClaudeResponse(transactions: any[]): Promise<any[]> {
  const CLAUDE_PROXY_URL = 'https://gzznuwtxyyaqlbbrxsuz.supabase.co/functions/v1/ai-coach';
  
  const categorizedTransactions = [];
  
  for (const transaction of transactions) {
    try {
      const prompt = `Categorize the following transaction description into a personal finance category such as groceries, dining, rent, transport, shopping, utilities, salary, or other. Just return the category.

Transaction: "${transaction.description}"`;

      const response = await fetch(CLAUDE_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const data = await response.json();
        const category = (data.completion || '').trim().toLowerCase();
        categorizedTransactions.push({
          ...transaction,
          category: category || 'other'
        });
      } else {
        categorizedTransactions.push({
          ...transaction,
          category: 'other'
        });
      }
    } catch (error) {
      console.warn('Claude categorization failed for:', transaction.description);
      categorizedTransactions.push({
        ...transaction,
        category: 'other'
      });
    }
  }
  
  return categorizedTransactions;
}

function generateZeroBasedBudget(transactions: any[]) {
  const categories: { [key: string]: { budgeted: number; actual: number } } = {};
  let totalIncome = 0;
  let totalExpenses = 0;

  // Calculate actual spending by category
  transactions.forEach(transaction => {
    const amount = Math.abs(transaction.amount);
    const category = transaction.category || 'other';
    
    if (transaction.amount > 0) {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
      if (!categories[category]) {
        categories[category] = { budgeted: 0, actual: 0 };
      }
      categories[category].actual += amount;
    }
  });

  // Generate budget recommendations (simple 50/30/20 rule)
  const disposableIncome = Math.max(0, totalIncome - totalExpenses);
  
  Object.keys(categories).forEach(category => {
    // Set budget as 110% of actual spending (allowing for some growth)
    categories[category].budgeted = Math.round(categories[category].actual * 1.1);
  });

  return {
    categories,
    totalIncome,
    totalExpenses,
    savings: disposableIncome
  };
}

function generateSmartGoals(transactions: any[]) {
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const disposableIncome = Math.max(0, totalIncome - totalExpenses);
  
  const goals = [];
  
  if (disposableIncome > 0) {
    goals.push({
      name: `Emergency Fund Goal`,
      target_amount: Math.round(totalExpenses * 3), // 3 months expenses
      deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year
      rationale: `Build emergency fund equal to 3 months of expenses ($${Math.round(totalExpenses * 3)}) for financial security`
    });
    
    if (disposableIncome > 200) {
      goals.push({
        name: `Monthly Savings Goal`,
        target_amount: Math.round(disposableIncome * 0.2), // 20% of disposable income
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 month
        rationale: `Save 20% of disposable income ($${Math.round(disposableIncome * 0.2)}) each month for long-term financial health`
      });
    }
  }
  
  return goals;
}

export const CSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'processing'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [processingStage, setProcessingStage] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenFilePicker = () => {
    setIsPickerOpen(true);
    fileInputRef.current?.click();
    // Reset after a brief moment to avoid UI flickering
    setTimeout(() => setIsPickerOpen(false), 100);
  };

  const handleFileUpload = async (files: FileList) => {
    if (!user) {
      setUploadStatus('error');
      setUploadMessage('Please log in to upload CSV files');
      return;
    }

    // Validate file types
    const nonCsvFiles = Array.from(files).filter(
      file => !file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')
    );
    
    if (nonCsvFiles.length > 0) {
      setUploadStatus('error');
      setUploadMessage(`Please upload only CSV files. Found: ${nonCsvFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setUploading(true);
    setUploadStatus('processing');
    setUploadMessage('Starting CSV processing...');
    setDebugInfo(''); // Clear previous debug info

    try {
      const allTransactions: any[] = [];
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingStage(`Processing file ${i + 1}/${files.length}: ${file.name}`);
        
        const transactions = await new Promise<any[]>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
              console.log('📄 CSV parse results:', results);
              
              if (!results.data || results.data.length === 0) {
                reject(new Error('CSV appears to be empty'));
                return;
              }

              // Clear previous debug info and start fresh
              setDebugInfo('📄 Starting CSV analysis...\n');
              
              const detectedSchema = detectSchema(results.meta.fields || [], (info) => {
                setDebugInfo(prev => prev + info + '\n');
              });
              console.log('🔍 Detected schema:', detectedSchema);
              
              if (!detectedSchema) {
                const headers = results.meta.fields || [];
                const errorMsg = `CSV format not recognized. Found headers: [${headers.join(', ')}]. Please ensure your CSV has columns for Date and Amount. Supported formats include ANZ, ASB, Westpac, Kiwibank, BNZ, or any CSV with date/amount columns.`;
                console.error('❌ Schema detection failed:', errorMsg);
                setDebugInfo(prev => prev + '❌ ' + errorMsg + '\n');
                reject(new Error(errorMsg));
                return;
              }

              const cleanedData = (results.data as any[])
                .map((row) => {
                  const rawDate = row[detectedSchema.date];
                  const parsedDate = normalizeDate(rawDate);
                  if (!parsedDate) {
                    console.warn(`Skipping row with invalid date: ${rawDate}`);
                    return null;
                  }
                  
                  // Handle different amount column scenarios
                  let amount = 0;
                  if ('debit' in detectedSchema && 'credit' in detectedSchema) {
                    // Separate debit/credit columns
                    const debit = parseFloat(row[detectedSchema.debit] || '0');
                    const credit = parseFloat(row[detectedSchema.credit] || '0');
                    amount = credit - debit; // Credit is positive, debit is negative
                  } else if ('amount' in detectedSchema) {
                    // Single amount column
                    amount = parseFloat(row[detectedSchema.amount] || '0');
                  }
                  
                  return {
                    date: parsedDate,
                    description: row[detectedSchema.description] || '',
                    amount: amount,
                    category: null // to be filled later
                  };
                })
                .filter(Boolean);

              console.log(`✅ Cleaned ${cleanedData.length} transactions from ${file.name}`);
              resolve(cleanedData);
            },
            error: function(err) {
              reject(new Error('Error parsing CSV: ' + err.message));
            }
          });
        });
        
        allTransactions.push(...transactions);
      }
      
      setProcessingStage(`Categorizing ${allTransactions.length} transactions with Claude AI...`);
      
      // Claude categorization
      const categorizedTransactions = await fetchClaudeResponse(allTransactions);
      
      setProcessingStage('Generating budget and goals...');
      
      // Generate budget and goals
      const budget = generateZeroBasedBudget(categorizedTransactions);
      const goals = generateSmartGoals(categorizedTransactions);
      
      console.log('💰 Generated budget:', budget);
      console.log('🎯 Generated goals:', goals);
      
      setUploadStatus('success');
      setUploadMessage(`✅ Complete! Processed ${categorizedTransactions.length} transactions with AI categorization`);
      
      toast({
        title: "CSV Processing Complete! 🎉",
        description: `${categorizedTransactions.length} transactions processed with AI categorization`,
        duration: 8000,
      });

      // Trigger dashboard refresh with the exact event name you mentioned
      window.dispatchEvent(new CustomEvent('csv-data-ready', { 
        detail: {
          transactions: categorizedTransactions,
          budget,
          goals,
          success: true
        }
      }));
      
    } catch (error: any) {
      console.error('❌ CSV processing error:', error);
      setUploadStatus('error');
      setUploadMessage(`Processing failed: ${error.message}`);
      
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProcessingStage('');
    }
  };

  return (
    <div id="upload" className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Upload className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white">Smart CSV Processing</h3>
          <p className="text-white/70 text-sm">Upload → Claude Categorization → Budget → Goals → Dashboard Update</p>
        </div>
      </div>

      {!user && (
        <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 text-sm font-medium">⚠️ Please log in to upload CSV files</p>
        </div>
      )}

      <div className="space-y-6">
        {/* File Upload Zone */}
        <FileUploadZone
          user={user}
          uploading={uploading}
          processing={uploadStatus === 'processing'}
          isPickerOpen={isPickerOpen}
          onFilesSelected={handleFileUpload}
          onOpenFilePicker={handleOpenFilePicker}
        />
        
        {/* Hidden file input for click-to-upload */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,text/csv"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          disabled={uploading || !user}
          className="hidden"
        />

        {/* Processing Stage */}
        {processingStage && (
          <div className="p-4 rounded-lg border bg-blue-500/20 border-blue-500/30 text-blue-300 flex items-center space-x-3">
            <Brain className="w-5 h-5 flex-shrink-0 animate-pulse" />
            <p className="text-sm font-medium">{processingStage}</p>
          </div>
        )}

        {/* Status Message */}
        {uploadMessage && (
          <div className={`p-4 rounded-lg border flex items-center space-x-3 ${
            uploadStatus === 'success' 
              ? 'bg-green-500/20 border-green-500/30 text-green-300'
              : uploadStatus === 'error'
              ? 'bg-red-500/20 border-red-500/30 text-red-300'
              : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
          }`}>
            {uploadStatus === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {uploadStatus === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            {uploadStatus === 'processing' && <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />}
            <p className="text-sm font-medium">{uploadMessage}</p>
          </div>
        )}

        {/* Debug Information */}
        {debugInfo && uploadStatus === 'error' && (
          <div className="p-4 rounded-lg border bg-gray-500/20 border-gray-500/30 text-gray-300">
            <h4 className="text-sm font-medium mb-2">🔍 CSV Analysis Debug Info:</h4>
            <pre className="text-xs whitespace-pre-wrap font-mono bg-black/20 p-3 rounded overflow-x-auto">
              {debugInfo}
            </pre>
            <p className="text-xs text-gray-400 mt-2">
              💡 This shows exactly what headers were found and how the detection process worked. 
              Share this info if you need help troubleshooting.
            </p>
          </div>
        )}

        {/* Feature Info */}
        <div className="bg-white/5 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Complete AI-Powered Workflow</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/70">
            <div>🏦 NZ bank format detection (ANZ, ASB, Westpac, Kiwibank, BNZ)</div>
            <div>🧠 Claude AI transaction categorization</div>
            <div>🔄 Automatic date normalization (dd/MM/yyyy, yyyy-MM-dd, etc.)</div>
            <div>💰 Zero-based budget generation</div>
            <div>🎯 SMART financial goals creation</div>
            <div>📊 Real-time dashboard updates</div>
          </div>
        </div>

        {/* Supported Formats */}
        <div className="bg-white/5 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Supported CSV Formats</h4>
          <div className="text-sm text-white/70 space-y-2">
            <div><strong className="text-white/90">Required columns:</strong> Date + Amount (any name variations)</div>
            <div><strong className="text-white/90">Optional:</strong> Description, Particulars, Reference, Payee, etc.</div>
            <div><strong className="text-white/90">Example headers:</strong></div>
            <div className="ml-4 space-y-1 text-xs">
              <div>• ANZ: "Date, Amount, Particulars"</div>
              <div>• ASB: "Date, Amount, Description"</div>
              <div>• Generic: "Date, Debit Amount, Reference"</div>
            </div>
            <div className="text-blue-300 text-xs mt-2">
              💡 The system will auto-detect your format and show detailed logs in the browser console if issues occur.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};