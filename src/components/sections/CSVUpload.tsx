
import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Eye, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CSVProcessor, ProcessedCSV } from '@/utils/csvProcessor';
import { DuplicateDetector, DuplicateMatch } from '@/utils/duplicateDetector';
import { budgetCreator } from '@/services/budgetCreator';

interface UploadResult {
  success: boolean;
  processed: number;
  transactions: any[];
  accountBalance: number;
  analysis?: string;
  bankFormat?: any;
  duplicates?: DuplicateMatch[];
  errors?: string[];
  warnings?: string[];
}

export const CSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'processing'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadResults, setUploadResults] = useState<UploadResult | null>(null);
  const [processedCSV, setProcessedCSV] = useState<ProcessedCSV | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const { user } = useAuth();

  const csvProcessor = new CSVProcessor();

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
    setProcessing(true);
    setUploadStatus('processing');
    setUploadResults(null);
    setProcessedCSV(null);

    try {
      let totalProcessed = 0;
      const allTransactions: any[] = [];
      const allErrors: string[] = [];
      const allWarnings: string[] = [];
      const allDuplicates: DuplicateMatch[] = [];

      // Get existing transactions for duplicate detection
      const { data: existingTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .limit(1000);

      const duplicateDetector = new DuplicateDetector(existingTransactions || []);

      for (const file of Array.from(files)) {
        const text = await file.text();

        if (!text.trim()) {
          allErrors.push(`File ${file.name} is empty`);
          continue;
        }

        setUploadMessage(`Processing ${file.name}...`);

        // Process CSV with new enhanced processor
        const processed = await csvProcessor.processCSV(text);
        
        if (processed.errors.length > 0) {
          allErrors.push(...processed.errors);
        }
        
        if (processed.warnings.length > 0) {
          allWarnings.push(...processed.warnings);
        }

        if (processed.transactions.length > 0) {
          // Detect duplicates
          const duplicates = duplicateDetector.findDuplicates(processed.transactions);
          allDuplicates.push(...duplicates);

          // Store processed data for preview
          setProcessedCSV(processed);
          
          // For now, send to existing endpoint for actual storage
          // This maintains compatibility while adding enhanced processing
          const csvData = text; // Keep original format for backend processing
          
          const { data, error } = await supabase.functions.invoke('process-csv', {
            body: { csvData, fileName: file.name }
          });

          if (error) {
            allErrors.push(`Error processing ${file.name}: ${error.message}`);
          } else {
            totalProcessed += data.processed;
            allTransactions.push(...(data.transactions || []));
          }
        }
      }

      if (totalProcessed > 0) {
        setUploadStatus('success');
        setUploadMessage(`Successfully processed ${totalProcessed} transactions with enhanced bank format detection`);
        
        // Auto-create budget from transactions
        try {
          console.log('Creating/updating budget from transactions...');
          const budgetResult = await budgetCreator.createBudgetFromTransactions(
            user.id,
            allTransactions,
            `Budget from ${new Date().toLocaleDateString()}`
          );
          
          console.log('Budget creation result:', budgetResult);
          
          // Update success message to include budget creation
          setUploadMessage(
            `Successfully processed ${totalProcessed} transactions and updated budget with ${budgetResult.categoriesCreated} categories`
          );

          // Notify other components that data was uploaded and budget updated
          localStorage.setItem('csv-upload-complete', Date.now().toString());
          
          // Dispatch storage event for other components
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'csv-upload-complete',
            newValue: Date.now().toString()
          }));

          // Also dispatch a custom event for more reliable detection
          window.dispatchEvent(new CustomEvent('csv-upload-complete', {
            detail: { 
              processed: totalProcessed, 
              transactions: allTransactions,
              budgetUpdated: true,
              budgetResult
            }
          }));
          
        } catch (budgetError) {
          console.error('Error creating/updating budget:', budgetError);
          allWarnings.push('Transactions processed but budget update failed');
        }
        
        setUploadResults({
          success: true,
          processed: totalProcessed,
          transactions: allTransactions,
          accountBalance: 0,
          bankFormat: processedCSV?.bankFormat,
          duplicates: allDuplicates,
          errors: allErrors,
          warnings: allWarnings
        });
        
        // Auto-analyze the transactions
        if (allTransactions.length > 0) {
          analyzeTransactions(allTransactions);
        }
      } else {
        setUploadStatus('error');
        setUploadMessage(`Processing failed. Errors: ${allErrors.join('; ')}`);
      }

      event.target.value = ''; // reset input
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setUploadMessage(error.message || 'Failed to process CSV files');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500/20 text-green-300';
    if (confidence >= 0.7) return 'bg-yellow-500/20 text-yellow-300';
    return 'bg-red-500/20 text-red-300';
  };

  return (
    <div id="upload" className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Smart CSV Import</h3>
          <p className="text-white/60 text-sm">Advanced bank format detection with 50+ supported formats</p>
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
                {processing ? (
                  <Loader2 className="w-8 h-8 text-white/60 mx-auto mb-2 animate-spin" />
                ) : (
                  <FileText className="w-8 h-8 text-white/60 mx-auto mb-2" />
                )}
                <p className="text-white/80 font-medium">
                  {processing ? 'Processing with AI...' : !user ? 'Please log in to upload' : 'Click to upload CSV files'}
                </p>
                <p className="text-white/50 text-sm mt-1">
                  {!user ? 'Authentication required' : 'Auto-detects bank formats from 50+ supported banks'}
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
              : uploadStatus === 'processing'
              ? 'bg-blue-500/20 border border-blue-500/30'
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            {uploadStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : uploadStatus === 'processing' ? (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className={`text-sm ${
              uploadStatus === 'success' ? 'text-green-300' : 
              uploadStatus === 'processing' ? 'text-blue-300' : 'text-red-300'
            }`}>
              {uploadMessage}
            </span>
          </div>
        )}

        {/* Bank Format Detection Results */}
        {processedCSV?.bankFormat && (
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Info className="w-5 h-5 text-blue-400" />
              <h4 className="text-white font-medium">Bank Format Detected</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/70">Bank:</span>
                <p className="text-white font-medium">{processedCSV.bankFormat.name}</p>
              </div>
              <div>
                <span className="text-white/70">Country:</span>
                <p className="text-white font-medium">{processedCSV.bankFormat.country}</p>
              </div>
              <div>
                <span className="text-white/70">Confidence:</span>
                <p className={`font-medium ${getConfidenceColor(processedCSV.bankFormat.confidence)}`}>
                  {Math.round(processedCSV.bankFormat.confidence * 100)}%
                </p>
              </div>
              <div>
                <span className="text-white/70">Date Format:</span>
                <p className="text-white font-medium">{processedCSV.bankFormat.dateFormats[0]}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Upload Summary */}
        {uploadResults && (
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium">Enhanced Processing Results</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowTransactions(!showTransactions)}
                  className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{showTransactions ? 'Hide' : 'View'} Transactions</span>
                </button>
                {uploadResults.duplicates && uploadResults.duplicates.length > 0 && (
                  <button
                    onClick={() => setShowDuplicates(!showDuplicates)}
                    className="flex items-center space-x-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">{showDuplicates ? 'Hide' : 'View'} Duplicates ({uploadResults.duplicates.length})</span>
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/70">Transactions Processed:</span>
                <p className="text-white font-medium">{uploadResults.processed}</p>
              </div>
              <div>
                <span className="text-white/70">Duplicates Found:</span>
                <p className="text-yellow-400 font-medium">{uploadResults.duplicates?.length || 0}</p>
              </div>
              {uploadResults.errors && uploadResults.errors.length > 0 && (
                <div className="col-span-2">
                  <span className="text-white/70">Errors:</span>
                  <ul className="text-red-300 text-xs mt-1">
                    {uploadResults.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {uploadResults.warnings && uploadResults.warnings.length > 0 && (
                <div className="col-span-2">
                  <span className="text-white/70">Warnings:</span>
                  <ul className="text-yellow-300 text-xs mt-1">
                    {uploadResults.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced AI Analysis */}
        {analyzing && (
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              <span className="text-purple-300 text-sm">Analyzing transactions with AI...</span>
            </div>
          </div>
        )}

        {uploadResults?.analysis && (
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h4 className="text-white font-medium">AI Analysis</h4>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">{uploadResults.analysis}</p>
          </div>
        )}

        {/* Enhanced Transactions Table */}
        {showTransactions && processedCSV?.transactions && processedCSV.transactions.length > 0 && (
          <div className="bg-white/10 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Processed Transactions with AI Categorization</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white/70">Date</TableHead>
                    <TableHead className="text-white/70">Description</TableHead>
                    <TableHead className="text-white/70">Merchant</TableHead>
                    <TableHead className="text-white/70">Amount</TableHead>
                    <TableHead className="text-white/70">Category</TableHead>
                    <TableHead className="text-white/70">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedCSV.transactions.slice(0, 10).map((transaction, index) => (
                    <TableRow key={index} className="border-white/10">
                      <TableCell className="text-white/80 text-sm">
                        {new Date(transaction.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-white/80 text-sm">{transaction.description}</TableCell>
                      <TableCell className="text-white/60 text-sm">{transaction.merchant || '-'}</TableCell>
                      <TableCell className={`text-sm font-medium ${transaction.isIncome ? 'text-green-400' : 'text-white'}`}>
                        {transaction.isIncome ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          transaction.isIncome ? 'bg-green-500/20 text-green-300' : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {transaction.category || 'Other'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${getConfidenceBadge(transaction.confidence)}`}>
                          {Math.round(transaction.confidence * 100)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {processedCSV.transactions.length > 10 && (
                <p className="text-white/60 text-xs mt-2 text-center">
                  Showing 10 of {processedCSV.transactions.length} transactions
                </p>
              )}
            </div>
          </div>
        )}

        {/* Duplicate Detection Results */}
        {showDuplicates && uploadResults?.duplicates && uploadResults.duplicates.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="text-yellow-300 font-medium mb-3">Potential Duplicates Found</h4>
            <div className="space-y-3">
              {uploadResults.duplicates.slice(0, 5).map((duplicate, index) => (
                <div key={index} className="bg-white/10 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-white font-medium">Match #{index + 1}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getConfidenceBadge(duplicate.confidence)}`}>
                      {Math.round(duplicate.confidence * 100)}% match
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-white/70">New Transaction:</p>
                      <p className="text-white">{duplicate.new.description}</p>
                      <p className="text-white/60">{duplicate.new.date} - ${duplicate.new.amount}</p>
                    </div>
                    <div>
                      <p className="text-white/70">Existing Transaction:</p>
                      <p className="text-white">{duplicate.existing.description}</p>
                      <p className="text-white/60">{duplicate.existing.transaction_date || duplicate.existing.date} - ${duplicate.existing.amount}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-white/70 text-xs">Reasons:</p>
                    <ul className="text-yellow-300 text-xs">
                      {duplicate.reasons.map((reason, i) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Format Requirements */}
        <div className="bg-white/10 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Enhanced CSV Processing Features:</h4>
          <ul className="text-white/70 text-sm space-y-1">
            <li>• <strong>50+ Bank Formats:</strong> ANZ, ASB, BNZ, Westpac, Chase, HSBC, and more</li>
            <li>• <strong>Smart Duplicate Detection:</strong> Fuzzy matching with confidence scoring</li>
            <li>• <strong>AI Categorization:</strong> Intelligent transaction categorization</li>
            <li>• <strong>Merchant Standardization:</strong> Clean and consistent merchant names</li>
            <li>• <strong>Multi-Currency Support:</strong> Handles NZD, USD, GBP, AUD, EUR</li>
            <li>• <strong>Error Recovery:</strong> Detailed error reporting and partial imports</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
