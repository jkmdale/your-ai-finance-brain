
import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Eye, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface UploadResult {
  success: boolean;
  processed: number;
  transactions: any[];
  accountBalance: number;
  analysis?: string;
  categories?: any[];
}

export const CSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadResults, setUploadResults] = useState<UploadResult | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const { user } = useAuth();

  const analyzeTransactions = async (transactions: any[]) => {
    if (!transactions.length) return;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { 
          message: `Analyze these newly uploaded transactions and provide insights on spending patterns, budget impact, and recommendations: ${JSON.stringify(transactions.slice(0, 20))}`,
          type: 'analysis'
        }
      });

      if (error) throw error;

      setUploadResults(prev => prev ? { ...prev, analysis: data.response } : null);
    } catch (error: any) {
      console.error('Analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!user) {
      setUploadStatus('error');
      setUploadMessage('Please log in to upload CSV files');
      return;
    }

    const nonCsvFiles = Array.from(files).filter(
      file => file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel' && !file.name.endsWith('.csv')
    );
    if (nonCsvFiles.length > 0) {
      setUploadStatus('error');
      setUploadMessage(`Please upload only CSV files. Found non-CSV files: ${nonCsvFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setUploading(true);
    setUploadStatus('idle');
    setUploadResults(null);

    try {
      let totalProcessed = 0;
      const allTransactions: any[] = [];
      const results = [];

      for (const file of Array.from(files)) {
        const text = await file.text();

        if (!text.trim()) {
          results.push({ fileName: file.name, success: false, error: 'File is empty' });
          continue;
        }

        const { data, error } = await supabase.functions.invoke('process-csv', {
          body: { csvData: text, fileName: file.name }
        });

        if (error) {
          results.push({ fileName: file.name, success: false, error: error.message });
        } else {
          results.push({ fileName: file.name, success: true, processed: data.processed });
          totalProcessed += data.processed;
          allTransactions.push(...(data.transactions || []));
        }
      }

      const successfulFiles = results.filter(r => r.success);
      const failedFiles = results.filter(r => !r.success);

      if (successfulFiles.length === files.length) {
        setUploadStatus('success');
        setUploadMessage(`Successfully processed ${totalProcessed} transactions from ${files.length} file${files.length > 1 ? 's' : ''}`);
        
        const uploadResult: UploadResult = {
          success: true,
          processed: totalProcessed,
          transactions: allTransactions,
          accountBalance: results[0]?.accountBalance || 0
        };
        
        setUploadResults(uploadResult);
        
        // Auto-analyze the transactions
        if (allTransactions.length > 0) {
          analyzeTransactions(allTransactions);
        }
      } else if (successfulFiles.length > 0) {
        setUploadStatus('success');
        setUploadMessage(`Processed ${totalProcessed} transactions from ${successfulFiles.length}/${files.length} files. ${failedFiles.length} files failed.`);
        
        setUploadResults({
          success: true,
          processed: totalProcessed,
          transactions: allTransactions,
          accountBalance: 0
        });
      } else {
        setUploadStatus('error');
        setUploadMessage(`Failed to process any files. Errors: ${failedFiles.map(f => `${f.fileName}: ${f.error}`).join('; ')}`);
      }

      event.target.value = ''; // reset input
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setUploadMessage(error.message || 'Failed to process CSV files');
    } finally {
      setUploading(false);
    }
  };

  const getCategoryBadgeColor = (isIncome: boolean) => {
    return isIncome ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300';
  };

  return (
    <div id="upload" className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Import Transactions</h3>
          <p className="text-white/60 text-sm">Upload your bank CSV files to automatically categorize transactions</p>
        </div>
      </div>

      {!user && (
        <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 text-sm">Please log in to upload CSV files</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="relative" id="csv-upload-container">
          <label htmlFor="csv-upload" className="block w-full h-full cursor-pointer">
            <div
              className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all duration-200 ${
                uploading || !user
                  ? 'border-white/20 bg-white/5 cursor-not-allowed'
                  : 'border-white/40 bg-white/10 hover:bg-white/20 hover:border-white/60'
              }`}
            >
              <div className="text-center pointer-events-none">
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-white/60 mx-auto mb-2 animate-spin" />
                ) : (
                  <FileText className="w-8 h-8 text-white/60 mx-auto mb-2" />
                )}
                <p className="text-white/80 font-medium">
                  {uploading ? 'Processing...' : !user ? 'Please log in to upload' : 'Click to upload CSV files'}
                </p>
                <p className="text-white/50 text-sm mt-1">
                  {!user ? 'Authentication required' : 'Select multiple files to upload at once'}
                </p>
              </div>
            </div>
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            multiple
            onChange={handleFileUpload}
            disabled={uploading || !user}
            className="absolute inset-0 w-full h-full opacity-0 z-10"
            aria-label="Upload CSV files"
          />
        </div>

        {uploadStatus !== 'idle' && (
          <div className={`flex items-center space-x-2 p-3 rounded-lg ${
            uploadStatus === 'success' 
              ? 'bg-green-500/20 border border-green-500/30' 
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            {uploadStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className={`text-sm ${
              uploadStatus === 'success' ? 'text-green-300' : 'text-red-300'
            }`}>
              {uploadMessage}
            </span>
          </div>
        )}

        {uploadResults && (
          <div className="space-y-4">
            {/* Transaction Summary */}
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium">Upload Summary</h4>
                <button
                  onClick={() => setShowTransactions(!showTransactions)}
                  className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{showTransactions ? 'Hide' : 'View'} Transactions</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/70">Transactions Processed:</span>
                  <p className="text-white font-medium">{uploadResults.processed}</p>
                </div>
                <div>
                  <span className="text-white/70">Account Balance:</span>
                  <p className="text-white font-medium">${uploadResults.accountBalance?.toLocaleString() || 0}</p>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            {analyzing && (
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-purple-300 text-sm">Analyzing transactions with AI...</span>
                </div>
              </div>
            )}

            {uploadResults.analysis && (
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <h4 className="text-white font-medium">AI Analysis</h4>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{uploadResults.analysis}</p>
              </div>
            )}

            {/* Transactions Table */}
            {showTransactions && uploadResults.transactions.length > 0 && (
              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Recent Transactions</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-white/70">Date</TableHead>
                        <TableHead className="text-white/70">Description</TableHead>
                        <TableHead className="text-white/70">Amount</TableHead>
                        <TableHead className="text-white/70">Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadResults.transactions.slice(0, 10).map((transaction, index) => (
                        <TableRow key={index} className="border-white/10">
                          <TableCell className="text-white/80 text-sm">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-white/80 text-sm">{transaction.description}</TableCell>
                          <TableCell className={`text-sm font-medium ${transaction.is_income ? 'text-green-400' : 'text-white'}`}>
                            {transaction.is_income ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs rounded-full ${getCategoryBadgeColor(transaction.is_income)}`}>
                              {transaction.categories?.name || 'Other'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {uploadResults.transactions.length > 10 && (
                    <p className="text-white/60 text-xs mt-2 text-center">
                      Showing 10 of {uploadResults.transactions.length} transactions
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white/10 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">CSV Format Requirements:</h4>
          <ul className="text-white/70 text-sm space-y-1">
            <li>• Headers: Date, Description, Amount (Merchant optional)</li>
            <li>• Date format: YYYY-MM-DD or DD/MM/YYYY</li>
            <li>• Positive amounts for income, negative for expenses</li>
            <li>• Transactions will be automatically categorized</li>
            <li>• Select multiple files to upload them all at once</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
