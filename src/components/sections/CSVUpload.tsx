import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Brain, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { claudeTransactionCategorizer, type CategorizationProgress } from '@/services/claudeTransactionCategorizer';

interface Transaction {
  date: string;
  description: string;
  amount: number;
}

interface BankFormat {
  name: string;
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  creditColumn?: string;
  debitColumn?: string;
}

interface UploadResult {
  success: boolean;
  totalTransactions: number;
  filesProcessed: number;
  errors: string[];
  transactions: Transaction[];
}

export const CSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'processing' | 'categorizing'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadResults, setUploadResults] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [categorizationProgress, setCategorizationProgress] = useState<CategorizationProgress | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // NZ Bank format detection
  const bankFormats: BankFormat[] = [
    {
      name: 'ANZ',
      dateColumn: 'Date',
      descriptionColumn: 'Details',
      amountColumn: 'Amount'
    },
    {
      name: 'ASB',
      dateColumn: 'Date',
      descriptionColumn: 'Particulars',
      amountColumn: 'Amount'
    },
    {
      name: 'Westpac',
      dateColumn: 'Date',
      descriptionColumn: 'Transaction Details',
      amountColumn: 'Amount'
    },
    {
      name: 'Kiwibank',
      dateColumn: 'Date',
      descriptionColumn: 'Payee',
      amountColumn: 'Amount'
    }
  ];

  const detectBankFormat = (headers: string[]): BankFormat | null => {
    for (const format of bankFormats) {
      const hasRequiredColumns = [
        format.dateColumn,
        format.descriptionColumn,
        format.amountColumn
      ].every(col => 
        headers.some(h => h.toLowerCase().includes(col.toLowerCase()))
      );
      
      if (hasRequiredColumns) {
        console.log(`🏦 Detected ${format.name} bank format`);
        return format;
      }
    }
    return null;
  };

  const parseDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Try various date formats common in NZ banks
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Try DD/MM/YYYY format
    const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return parsedDate.toISOString().split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
  };

  const parseAmount = (amountStr: string): number => {
    if (!amountStr) return 0;
    
    // Remove currency symbols, commas, and spaces
    const cleaned = amountStr.replace(/[$,\s]/g, '');
    
    // Handle negative amounts in parentheses
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      return -parseFloat(cleaned.slice(1, -1)) || 0;
    }
    
    return parseFloat(cleaned) || 0;
  };

  const parseCSVFile = (file: File): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const headers = results.meta.fields || [];
            const bankFormat = detectBankFormat(headers);
            
            if (!bankFormat) {
              reject(new Error(`Unsupported CSV format in ${file.name}. Expected ANZ, ASB, Westpac, or Kiwibank format.`));
              return;
            }

            const transactions: Transaction[] = [];
            
            for (const row of results.data as any[]) {
              // Skip empty rows
              if (!row || Object.values(row).every(val => !val || val.toString().trim() === '')) {
                continue;
              }

              const date = parseDate(row[bankFormat.dateColumn]);
              const description = (row[bankFormat.descriptionColumn] || '').toString().trim();
              const amount = parseAmount(row[bankFormat.amountColumn]);

              // Skip if missing critical data
              if (!description || amount === 0) {
                continue;
              }

              transactions.push({
                date,
                description,
                amount
              });
            }

            console.log(`✅ Parsed ${transactions.length} transactions from ${file.name}`);
            resolve(transactions);
          } catch (error) {
            reject(new Error(`Error parsing ${file.name}: ${error.message}`));
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error in ${file.name}: ${error.message}`));
        }
      });
    });
  };

  const startCategorization = async (transactions: Transaction[]) => {
    setUploadStatus('categorizing');
    setUploadMessage(`Starting AI categorization with Claude...`);
    setProgress(0);
    setCategorizationProgress({ total: transactions.length, completed: 0, failed: 0 });

    try {
      const categorizedTransactions = await claudeTransactionCategorizer.categorizeTransactions(
        transactions,
        (progress: CategorizationProgress) => {
          setCategorizationProgress(progress);
          const progressPercent = Math.round((progress.completed / progress.total) * 100);
          setProgress(progressPercent);
          setUploadMessage(
            `Categorizing with Claude AI: ${progress.completed}/${progress.total} transactions (${progress.failed} failed)`
          );
        }
      );

      // Final success message
      const finalProgress = categorizationProgress || { total: transactions.length, completed: 0, failed: 0 };
      const successCount = finalProgress.total - finalProgress.failed;
      
      setUploadStatus('success');
      setUploadMessage(`✅ All ${successCount} transactions categorized with Claude AI`);
      
      toast({
        title: "AI Categorization Complete",
        description: `✅ All ${successCount} transactions categorized with Claude AI${finalProgress.failed > 0 ? ` (${finalProgress.failed} failed)` : ''}`,
        duration: 5000,
      });

      if (finalProgress.failed > 0) {
        toast({
          title: "Some Categorizations Failed",
          description: `❌ ${finalProgress.failed} transactions failed to categorize`,
          variant: "destructive",
          duration: 3000,
        });
      }

      // Dispatch event with categorized transactions
      window.dispatchEvent(new CustomEvent('transactions-categorized', { 
        detail: { 
          transactions: categorizedTransactions,
          totalCategorized: successCount,
          totalFailed: finalProgress.failed
        } 
      }));

    } catch (error: any) {
      console.error('Categorization error:', error);
      setUploadStatus('error');
      setUploadMessage(`Categorization failed: ${error.message}`);
      
      toast({
        title: "Categorization Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setProgress(0);
        setCategorizationProgress(null);
      }, 3000);
    }
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
    setUploadMessage(`Processing ${files.length} CSV file(s)...`);
    setProgress(10);

    const allTransactions: Transaction[] = [];
    const errors: string[] = [];
    
    try {
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileProgress = 10 + ((i + 1) / files.length) * 80;
        
        setUploadMessage(`Processing file ${i + 1}/${files.length}: ${file.name}`);
        setProgress(fileProgress);

        try {
          const transactions = await parseCSVFile(file);
          allTransactions.push(...transactions);
        } catch (error: any) {
          console.error(`Error processing ${file.name}:`, error);
          errors.push(error.message);
        }
      }

      // Store parsed data for later use
      localStorage.setItem('parsedTransactions', JSON.stringify(allTransactions));
      
      setProgress(100);
      
      if (allTransactions.length > 0) {
        setUploadStatus('success');
        setUploadResults({
          success: true,
          totalTransactions: allTransactions.length,
          filesProcessed: files.length,
          errors,
          transactions: allTransactions
        });
        
        toast({
          title: "CSV Upload Successful",
          description: `✅ Uploaded ${files.length} files with ${allTransactions.length} total transactions`,
          duration: 5000,
        });
        
        // Start Claude categorization
        await startCategorization(allTransactions);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('csv-upload-complete', { 
          detail: { 
            transactions: allTransactions,
            totalFiles: files.length,
            totalTransactions: allTransactions.length
          } 
        }));
        
      } else {
        setUploadStatus('error');
        setUploadMessage('No valid transactions found in the uploaded files');
        
        toast({
          title: "Upload Failed",
          description: "No valid transactions found in the uploaded files",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setUploadMessage(`Upload failed: ${error.message}`);
      
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <div id="upload" className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Upload className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white">CSV Upload</h3>
          <p className="text-white/70 text-sm">Upload multiple CSV files from NZ banks (ANZ, ASB, Westpac, Kiwibank)</p>
        </div>
      </div>

      {!user && (
        <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 text-sm font-medium">⚠️ Please log in to upload CSV files</p>
        </div>
      )}

      <div className="space-y-6">
        {/* File Upload Area */}
        <div className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center hover:border-white/50 transition-colors">
          <input
            type="file"
            multiple
            accept=".csv,text/csv"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            disabled={uploading || !user}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <FileText className="w-12 h-12 text-white/60 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">
              {uploading ? 'Processing...' : 'Select CSV Files'}
            </p>
            <p className="text-white/60 text-sm">
              Choose multiple CSV files from your bank (ANZ, ASB, Westpac, Kiwibank)
            </p>
          </label>
        </div>

        {/* Progress Bar */}
        {progress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-white/70">
              <span>Processing...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
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
            {uploadStatus === 'processing' && <Upload className="w-5 h-5 flex-shrink-0 animate-pulse" />}
            {uploadStatus === 'categorizing' && <Brain className="w-5 h-5 flex-shrink-0 animate-pulse" />}
            <p className="text-sm font-medium">{uploadMessage}</p>
          </div>
        )}

        {/* Results Summary */}
        {uploadResults && uploadResults.success && (
          <div className="bg-white/10 rounded-lg p-4 space-y-3">
            <h4 className="text-white font-medium flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>Upload Complete</span>
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-white/70">
                <span className="block text-white font-medium">{uploadResults.totalTransactions}</span>
                <span>Total Transactions</span>
              </div>
              <div className="text-white/70">
                <span className="block text-white font-medium">{uploadResults.filesProcessed}</span>
                <span>Files Processed</span>
              </div>
            </div>
            {uploadResults.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-red-300 text-sm font-medium mb-1">Errors:</p>
                <ul className="text-red-300/70 text-xs space-y-1">
                  {uploadResults.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Feature Info */}
        <div className="bg-white/5 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Supported Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/70">
            <div>✅ Multiple file upload</div>
            <div>✅ NZ bank format detection</div>
            <div>✅ Automatic data normalization</div>
            <div>✅ Error handling & validation</div>
          </div>
        </div>
      </div>
    </div>
  );
};
