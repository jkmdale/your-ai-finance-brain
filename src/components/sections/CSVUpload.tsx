import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Eye, TrendingUp, AlertTriangle, Info, Target, DollarSign, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFilePicker } from '@/hooks/useFilePicker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { CSVProcessor, ProcessedCSV } from '@/utils/csvProcessor';
import { DuplicateDetector, DuplicateMatch } from '@/utils/duplicateDetector';
import { budgetCreator } from '@/services/budgetCreator';

interface GoalRecommendationResult {
  aiRecommendations?: string;
  createdGoals?: any[];
}

interface UploadResult {
  success: boolean;
  processed: number;
  skipped: number;
  transactions: any[];
  accountBalance: number;
  analysis?: string;
  bankFormat?: any;
  duplicates?: DuplicateMatch[];
  errors?: string[];
  warnings?: string[];
  budgetCreated?: boolean;
  goalsRecommended?: GoalRecommendationResult;
}

interface ValidationResult {
  isValid: boolean;
  rowCount: number;
  columnCount: number;
  headers: string[];
  errors: string[];
  warnings: string[];
  preview: string[][];
}

export const CSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'processing' | 'validating'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadResults, setUploadResults] = useState<UploadResult | null>(null);
  const [processedCSV, setProcessedCSV] = useState<ProcessedCSV | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [creatingBudget, setCreatingBudget] = useState(false);
  const [recommendingGoals, setRecommendingGoals] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const { user } = useAuth();

  const csvProcessor = new CSVProcessor();

  // Use dedicated file picker hook
  const { openFilePicker, isPickerOpen } = useFilePicker({
    accept: '.csv,text/csv,application/vnd.ms-excel',
    multiple: true,
    onFilesSelected: handleFilesSelected
  });

  // Client-side CSV validation
  const validateCSV = async (file: File): Promise<ValidationResult> => {
    try {
      const text = await file.text();
      const lines = text.trim().split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return {
          isValid: false,
          rowCount: lines.length,
          columnCount: 0,
          headers: [],
          errors: ['CSV must have at least a header row and one data row'],
          warnings: [],
          preview: []
        };
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Parse first few rows for preview
      const preview = lines.slice(0, 6).map(line => 
        line.split(',').map(cell => cell.trim().replace(/"/g, ''))
      );

      const errors: string[] = [];
      const warnings: string[] = [];

      // Check for required columns
      const normalizedHeaders = headers.map(h => h.toLowerCase());
      const hasDate = normalizedHeaders.some(h => 
        h.includes('date') || h.includes('transaction') || h.includes('posting')
      );
      const hasDescription = normalizedHeaders.some(h => 
        h.includes('description') || h.includes('details') || h.includes('particulars')
      );
      const hasAmount = normalizedHeaders.some(h => 
        h.includes('amount') || h.includes('value') || h.includes('debit') || h.includes('credit')
      );

      if (!hasDate) warnings.push('No date column detected');
      if (!hasDescription) warnings.push('No description column detected');
      if (!hasAmount) errors.push('No amount column detected');

      // Check data consistency
      const expectedColumns = headers.length;
      let inconsistentRows = 0;
      for (let i = 1; i < Math.min(lines.length, 10); i++) {
        const cells = lines[i].split(',');
        if (cells.length !== expectedColumns) {
          inconsistentRows++;
        }
      }

      if (inconsistentRows > 0) {
        warnings.push(`${inconsistentRows} rows have inconsistent column counts`);
      }

      return {
        isValid: errors.length === 0,
        rowCount: lines.length - 1, // Exclude header
        columnCount: headers.length,
        headers,
        errors,
        warnings,
        preview
      };
    } catch (error: any) {
      return {
        isValid: false,
        rowCount: 0,
        columnCount: 0,
        headers: [],
        errors: [`Failed to parse CSV: ${error.message}`],
        warnings: [],
        preview: []
      };
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFilesSelected(files);
    }
  }, []);

  const analyzeTransactions = async (transactions: any[]) => {
    if (!transactions.length) return;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { 
          message: `Analyze these newly uploaded transactions and provide insights on spending patterns, budget impact, and specific recommendations: ${JSON.stringify(transactions.slice(0, 30))}`,
          type: 'analysis'
        }
      });

      if (error) throw error;

      return data.response;
    } catch (error: any) {
      console.error('Analysis error:', error);
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  const createSmartBudget = async (transactions: any[]) => {
    if (!transactions.length || !user) return null;

    setCreatingBudget(true);
    try {
      console.log('Creating smart budget from transactions...');
      
      const budgetResult = await budgetCreator.createBudgetFromTransactions(
        user.id,
        transactions,
        `Smart Budget - ${new Date().toLocaleDateString()}`
      );
      
      console.log('Budget created successfully:', budgetResult);
      return budgetResult;
    } catch (error: any) {
      console.error('Budget creation error:', error);
      return null;
    } finally {
      setCreatingBudget(false);
    }
  };

  const recommendSmartGoals = async (transactions: any[], budgetResult: any): Promise<GoalRecommendationResult> => {
    if (!transactions.length || !user) return {};

    setRecommendingGoals(true);
    try {
      // Analyze spending patterns for goal recommendations
      const totalIncome = transactions.filter(t => t.is_income).reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = transactions.filter(t => !t.is_income).reduce((sum, t) => sum + t.amount, 0);
      const monthlyNet = totalIncome - totalExpenses;

      // Get AI recommendations for SMART goals
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { 
          message: `Based on monthly income of $${totalIncome}, expenses of $${totalExpenses}, and net savings of $${monthlyNet}, recommend 3-5 SMART financial goals. Consider emergency fund, debt reduction, savings targets, and investment goals. Make them specific, measurable, achievable, relevant, and time-bound.`,
          type: 'goals'
        }
      });

      if (error) throw error;

      // Create suggested goals in database
      const suggestedGoals = [
        {
          name: 'Emergency Fund',
          goal_type: 'savings',
          target_amount: Math.round(totalExpenses * 3), // 3 months expenses
          current_amount: 0,
          target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 1,
          description: 'Build emergency fund covering 3 months of expenses'
        },
        {
          name: 'Monthly Savings Target',
          goal_type: 'savings', 
          target_amount: Math.max(monthlyNet * 0.8, 500), // 80% of net income or $500 minimum
          current_amount: 0,
          target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 2,
          description: 'Monthly savings goal based on your cash flow'
        }
      ];

      // Insert goals into database
      const { data: createdGoals, error: goalError } = await supabase
        .from('financial_goals')
        .insert(suggestedGoals.map(goal => ({
          ...goal,
          user_id: user.id,
          is_active: true
        })))
        .select();

      if (goalError) {
        console.error('Error creating goals:', goalError);
        return { aiRecommendations: data?.response };
      }

      return {
        aiRecommendations: data?.response,
        createdGoals: createdGoals || []
      };
    } catch (error: any) {
      console.error('Goal recommendation error:', error);
      return {};
    } finally {
      setRecommendingGoals(false);
    }
  };

  async function handleFilesSelected(files: FileList) {
    console.log('📁 Processing selected files:', files.length);
    
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

    // Client-side validation first
    setUploadStatus('validating');
    setUploadMessage('Validating CSV files...');
    setProgress(10);

    const validationResults: ValidationResult[] = [];
    for (const file of Array.from(files)) {
      const result = await validateCSV(file);
      validationResults.push(result);
    }

    setValidationResults(validationResults);
    setProgress(25);

    // Check if any files failed validation
    const failedFiles = validationResults.filter(r => !r.isValid);
    if (failedFiles.length > 0) {
      setUploadStatus('error');
      setUploadMessage(`Validation failed for ${failedFiles.length} file(s). Please fix the issues and try again.`);
      setProgress(0);
      return;
    }

    // Show validation summary
    const totalRows = validationResults.reduce((sum, r) => sum + r.rowCount, 0);
    const totalWarnings = validationResults.reduce((sum, r) => sum + r.warnings.length, 0);
    
    setUploadMessage(`✅ Validation complete: ${totalRows} transactions ready to process${totalWarnings > 0 ? ` (${totalWarnings} warnings)` : ''}`);
    setProgress(40);

    // Continue with processing
    setUploading(true);
    setProcessing(true);
    setUploadStatus('processing');
    setUploadResults(null);
    setProcessedCSV(null);
    setUploadMessage('Processing CSV files with AI...');
    setProgress(50);

    try {
      let totalProcessed = 0;
      let totalSkipped = 0;
      const allTransactions: any[] = [];
      const allErrors: string[] = [];
      const allWarnings: string[] = [];
      const allDuplicates: DuplicateMatch[] = [];

      // Get existing transactions for duplicate detection
      console.log('🔍 Fetching existing transactions...');
      const { data: existingTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .limit(1000);

      const duplicateDetector = new DuplicateDetector(existingTransactions || []);
      setProgress(60);

      // Process each file
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        console.log(`📄 Processing: ${file.name}`);
        
        try {
          const text = await file.text();
          
          if (!text.trim()) {
            allErrors.push(`File ${file.name} is empty`);
            continue;
          }

          setUploadMessage(`Processing ${file.name} with AI categorization...`);
          setProgress(60 + (fileIndex / files.length) * 20);

          // Enhanced CSV processing
          const processed = await csvProcessor.processCSV(text);
          console.log('✅ CSV processed:', processed.transactions.length, 'transactions');
          
          if (processed.errors.length > 0) {
            allErrors.push(...processed.errors);
          }
          
          if (processed.warnings.length > 0) {
            allWarnings.push(...processed.warnings);
          }

          if (processed.transactions.length > 0) {
            // Check for duplicates
            const duplicates = duplicateDetector.findDuplicates(processed.transactions);
            allDuplicates.push(...duplicates);
            
            setProcessedCSV(processed);
            
            // Send to backend for storage
            setUploadMessage('Storing transactions and creating budget...');
            const { data, error } = await supabase.functions.invoke('process-csv', {
              body: { 
                csvData: text,
                fileName: file.name,
                userId: user.id
              }
            });

            if (error) {
              console.error('❌ Backend error:', error);
              allErrors.push(`Error storing ${file.name}: ${error.message}`);
              totalSkipped += processed.transactions.length;
            } else {
              totalProcessed += data.processed || 0;
              totalSkipped += (processed.transactions.length - (data.processed || 0));
              allTransactions.push(...(data.transactions || []));
            }
          }
        } catch (fileError: any) {
          console.error(`❌ File error:`, fileError);
          allErrors.push(`Error processing ${file.name}: ${fileError.message}`);
        }
      }

      setProgress(80);

      if (totalProcessed > 0) {
        setUploadStatus('success');
        setUploadMessage(`Processing AI analysis and creating smart budget...`);
        
        // Run AI analysis, budget creation, and goal recommendations in parallel
        const [analysisResult, budgetResult] = await Promise.all([
          analyzeTransactions(allTransactions),
          createSmartBudget(allTransactions)
        ]);

        setProgress(90);

        // Then create goals based on budget result
        const goalResult = await recommendSmartGoals(allTransactions, budgetResult);

        setProgress(100);

        // Update final results
        setUploadResults({
          success: true,
          processed: totalProcessed,
          skipped: totalSkipped,
          transactions: allTransactions,
          accountBalance: 0,
          bankFormat: processedCSV?.bankFormat,
          duplicates: allDuplicates,
          errors: allErrors,
          warnings: allWarnings,
          analysis: analysisResult,
          budgetCreated: !!budgetResult,
          goalsRecommended: goalResult
        });

        // Update success message with detailed feedback
        const features = [];
        if (analysisResult) features.push('AI insights');
        if (budgetResult) features.push('smart budget');
        if (goalResult?.createdGoals && goalResult.createdGoals.length > 0) {
          features.push(`${goalResult.createdGoals.length} SMART goals`);
        }
        
        setUploadMessage(
          `✅ Successfully processed ${totalProcessed} transactions${totalSkipped > 0 ? `, ${totalSkipped} skipped` : ''} and created ${features.join(', ')}`
        );

        // Notify other components
        window.dispatchEvent(new CustomEvent('csv-upload-complete', {
          detail: { 
            processed: totalProcessed,
            skipped: totalSkipped,
            transactions: allTransactions,
            budgetCreated: !!budgetResult,
            goalsCreated: goalResult?.createdGoals?.length || 0
          }
        }));
        
      } else {
        setUploadStatus('error');
        setUploadMessage(
          allErrors.length > 0 
            ? `Processing failed: ${allErrors.join('; ')}`
            : `No transactions processed. ${allWarnings.join('; ')}`
        );
        setProgress(0);
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      setUploadStatus('error');
      setUploadMessage(`Upload failed: ${error.message}`);
      setProgress(0);
    } finally {
      setUploading(false);
      setProcessing(false);
      setTimeout(() => setProgress(0), 2000); // Reset progress after delay
    }
  }

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
          <p className="text-white/60 text-sm">AI-powered categorization, budget creation & SMART goals</p>
        </div>
      </div>

      {!user && (
        <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 text-sm">Please log in to upload CSV files</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Enhanced Drop Zone */}
        <div className="relative">
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={openFilePicker}
            className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all duration-200 ${
              dragActive
                ? 'border-blue-400 bg-blue-500/20 scale-105'
                : uploading || !user || isPickerOpen
                ? 'border-white/20 bg-white/5 cursor-not-allowed'
                : 'border-white/40 bg-white/10 hover:bg-white/20 hover:border-white/60 cursor-pointer'
            }`}
          >
            <div className="text-center">
              {processing || isPickerOpen ? (
                <Loader2 className="w-8 h-8 text-white/60 mx-auto mb-2 animate-spin" />
              ) : (
                <div className="relative">
                  <FileText className="w-8 h-8 text-white/60 mx-auto mb-2" />
                  {dragActive && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full animate-pulse" />
                  )}
                </div>
              )}
              <p className="text-white/80 font-medium">
                {processing ? 'Processing with AI...' : 
                 isPickerOpen ? 'Opening file picker...' :
                 dragActive ? 'Drop CSV files here!' :
                 !user ? 'Please log in to upload' : 'Click to upload or drag & drop CSV files'}
              </p>
              <p className="text-white/50 text-sm mt-1">
                {!user ? 'Authentication required' : 'Auto-categorization + Budget + SMART Goals'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {progress > 0 && (
            <div className="mt-3">
              <Progress value={progress} className="h-2" />
              <p className="text-white/60 text-xs mt-1 text-center">{progress}% complete</p>
            </div>
          )}
        </div>

        {/* Validation Results */}
        {validationResults.length > 0 && uploadStatus === 'error' && (
          <div className="space-y-3">
            {validationResults.map((result, index) => (
              <div key={index} className={`p-4 rounded-lg border ${
                result.isValid 
                  ? 'bg-green-500/20 border-green-500/30' 
                  : 'bg-red-500/20 border-red-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">File {index + 1} Validation</h4>
                  {result.isValid ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-white/70">Rows:</span>
                    <p className="text-white">{result.rowCount}</p>
                  </div>
                  <div>
                    <span className="text-white/70">Columns:</span>
                    <p className="text-white">{result.columnCount}</p>
                  </div>
                  <div>
                    <span className="text-white/70">Status:</span>
                    <p className={result.isValid ? 'text-green-400' : 'text-red-400'}>
                      {result.isValid ? 'Valid' : 'Invalid'}
                    </p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="mb-2">
                    <p className="text-red-300 text-sm font-medium mb-1">Errors:</p>
                    <ul className="text-red-300 text-xs space-y-1">
                      {result.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.warnings.length > 0 && (
                  <div className="mb-2">
                    <p className="text-yellow-300 text-sm font-medium mb-1">Warnings:</p>
                    <ul className="text-yellow-300 text-xs space-y-1">
                      {result.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.preview.length > 0 && (
                  <div>
                    <p className="text-white/70 text-sm mb-2">Preview:</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/20">
                            {result.headers.map((header, i) => (
                              <th key={i} className="text-left text-white/70 p-1">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.preview.slice(1, 4).map((row, i) => (
                            <tr key={i} className="border-b border-white/10">
                              {row.map((cell, j) => (
                                <td key={j} className="text-white/80 p-1">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Status Messages */}
        {uploadStatus !== 'idle' && uploadStatus !== 'error' && (
          <div className={`flex items-start space-x-2 p-4 rounded-lg ${
            uploadStatus === 'success' 
              ? 'bg-green-500/20 border border-green-500/30' 
              : uploadStatus === 'processing'
              ? 'bg-blue-500/20 border border-blue-500/30'
              : uploadStatus === 'validating'
              ? 'bg-purple-500/20 border border-purple-500/30'
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            {uploadStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            ) : uploadStatus === 'validating' ? (
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin mt-0.5 flex-shrink-0" />
            ) : (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <span className={`text-sm ${
                uploadStatus === 'success' ? 'text-green-300' : 
                uploadStatus === 'validating' ? 'text-purple-300' :
                'text-blue-300'
              }`}>
                {uploadMessage}
              </span>
              {/* Show processing status */}
              {(analyzing || creatingBudget || recommendingGoals) && (
                <div className="mt-2 space-y-1">
                  {analyzing && (
                    <div className="flex items-center space-x-2 text-xs text-blue-300">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Analyzing spending patterns...</span>
                    </div>
                  )}
                  {creatingBudget && (
                    <div className="flex items-center space-x-2 text-xs text-purple-300">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Creating smart budget...</span>
                    </div>
                  )}
                  {recommendingGoals && (
                    <div className="flex items-center space-x-2 text-xs text-green-300">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Generating SMART goals...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bank Format Detection */}
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
                <span className="text-white/70">Confidence:</span>
                <p className={`font-medium ${getConfidenceColor(processedCSV.bankFormat.confidence)}`}>
                  {Math.round(processedCSV.bankFormat.confidence * 100)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Results Summary */}
        {uploadResults && (
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium">Smart Processing Results</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowTransactions(!showTransactions)}
                  className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{showTransactions ? 'Hide' : 'View'} Transactions</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-green-400 mb-1">{uploadResults.processed}</div>
                <div className="text-white/60 text-xs">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-400 mb-1">{uploadResults.skipped}</div>
                <div className="text-white/60 text-xs">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400 mb-1">
                  {uploadResults.budgetCreated ? '✓' : '✗'}
                </div>
                <div className="text-white/60 text-xs">Smart Budget</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400 mb-1">
                  {uploadResults.goalsRecommended?.createdGoals?.length || 0}
                </div>
                <div className="text-white/60 text-xs">SMART Goals</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-400 mb-1">
                  {uploadResults.duplicates?.length || 0}
                </div>
                <div className="text-white/60 text-xs">Duplicates</div>
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis Results */}
        {uploadResults?.analysis && (
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h4 className="text-white font-medium">AI Financial Analysis</h4>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">{uploadResults.analysis}</p>
          </div>
        )}

        {/* SMART Goals Recommendations */}
        {uploadResults?.goalsRecommended?.aiRecommendations && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Target className="w-5 h-5 text-green-400" />
              <h4 className="text-white font-medium">SMART Goals Recommendations</h4>
            </div>
            <p className="text-white/80 text-sm leading-relaxed mb-3">
              {uploadResults.goalsRecommended.aiRecommendations}
            </p>
            {uploadResults.goalsRecommended.createdGoals && uploadResults.goalsRecommended.createdGoals.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-green-300 text-xs font-medium mb-2">
                  ✓ Created {uploadResults.goalsRecommended.createdGoals.length} goals automatically
                </p>
                <div className="space-y-2">
                  {uploadResults.goalsRecommended.createdGoals.map((goal: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-white/70">{goal.name}</span>
                      <span className="text-green-300">${goal.target_amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transaction Table */}
        {showTransactions && processedCSV?.transactions && processedCSV.transactions.length > 0 && (
          <div className="bg-white/10 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">AI Categorized Transactions</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white/70">Date</TableHead>
                    <TableHead className="text-white/70">Description</TableHead>
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
            </div>
          </div>
        )}

        {/* Enhanced Features List */}
        <div className="bg-white/10 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">🚀 Smart Finance Features:</h4>
          <ul className="text-white/70 text-sm space-y-1">
            <li>• <strong>Client-side Validation:</strong> Instant CSV format validation before upload</li>
            <li>• <strong>Drag & Drop:</strong> Easy file upload with progress tracking</li>
            <li>• <strong>Detailed Feedback:</strong> Complete processing summary with skipped transactions</li>
            <li>• <strong>AI Categorization:</strong> Intelligent transaction categorization with confidence scoring</li>
            <li>• <strong>Smart Budget Creation:</strong> Automatic budget generation based on spending patterns</li>
            <li>• <strong>SMART Goals:</strong> Personalized financial goals (Specific, Measurable, Achievable, Relevant, Time-bound)</li>
            <li>• <strong>Bank Format Detection:</strong> Supports 50+ bank formats with auto-detection</li>
            <li>• <strong>Duplicate Detection:</strong> Advanced duplicate detection with fuzzy matching</li>
            <li>• <strong>Financial Analysis:</strong> AI-powered insights and recommendations</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
