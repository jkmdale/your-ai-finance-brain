import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Brain, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { FileUploadZone } from '@/components/csv/FileUploadZone';
import Papa from 'papaparse';

// Schema detection for NZ banks
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
    fields: ['date', 'amount', 'transaction details'],
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
    name: 'Generic Format',
    fields: ['date', 'amount', 'description'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Description'
    }
  }
];

function detectSchema(headers: string[]) {
  for (const template of schemaTemplates) {
    const match = template.fields.every((field) =>
      headers.some((h) => h.toLowerCase().includes(field.toLowerCase()))
    );
    if (match) {
      return template.map;
    }
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
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, type: 'dmy' },
    // DD/MM/YY (2-digit year)
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, type: 'dmy2' },
    // YYYY-MM-DD (ISO format)
    { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, type: 'ymd' },
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

    try {
      // Use the unified processor instead of duplicated Papa.parse logic
      const { UnifiedTransactionProcessor } = await import('@/services/unifiedTransactionProcessor');
      const processor = new UnifiedTransactionProcessor();
      const result = await processor.processCSVFiles(files, user.id);
      
      console.log('✅ Processing completed:', result);
      
      setProcessingStage('Upload completed successfully!');
      setUploadStatus('success');
      setUploadMessage(`Successfully processed ${result.transactions.length} transactions from ${result.summary.totalFiles} files`);
      
      toast({
        title: "CSV Processing Complete! 🎉", 
        description: `${result.transactions.length} transactions processed`,
        duration: 8000,
      });

      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('csv-data-ready', { 
        detail: {
          transactions: result.transactions,
          success: true
        }
      }));
      
    } catch (error: any) {
      console.error('❌ CSV processing failed:', error);
      setProcessingStage('Upload failed');
      setUploadStatus('error');
      setUploadMessage(error.message || 'Failed to process CSV files');
      
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
      </div>
    </div>
  );
};