import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Eye, TrendingUp, AlertTriangle, Info, Target, DollarSign, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFilePicker } from '@/hooks/useFilePicker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { CSVProcessor, ProcessedCSV } from '@/utils/csvProcessor';
import { CSVPreview } from '@/components/ui/csv-preview';
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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'processing' | 'validating' | 'preview'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadResults, setUploadResults] = useState<UploadResult | null>(null);
  const [processedCSV, setProcessedCSV] = useState<ProcessedCSV | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
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

    // Start processing the first file for preview
    const file = files[0]; // For now, handle one file at a time
    
    setUploadStatus('validating');
    setUploadMessage('Analyzing CSV structure...');
    setProgress(25);

    try {
      const text = await file.text();
      
      if (!text.trim()) {
        setUploadStatus('error');
        setUploadMessage('CSV file is empty');
        return;
      }

      setUploadMessage('Processing CSV with AI categorization...');
      setProgress(50);

      // Process CSV for preview
      const processed = await csvProcessor.processCSV(text);
      console.log('✅ CSV processed for preview:', processed);

      setProcessedCSV(processed);
      setProgress(75);

      if (processed.errors.length > 0) {
        setUploadStatus('error');
        setUploadMessage(`Processing errors: ${processed.errors.join('; ')}`);
        setProgress(0);
        return;
      }

      if (processed.transactions.length === 0) {
        setUploadStatus('error');
        setUploadMessage(`No valid transactions found. ${processed.skippedRows.length} rows were skipped. Check the preview for details.`);
        setProgress(100);
        setShowPreview(true);
        return;
      }

      // Show preview
      setUploadStatus('preview');
      setUploadMessage(`Ready to process ${processed.transactions.length} transactions (${processed.skippedRows.length} rows will be skipped)`);
      setShowPreview(true);
      setProgress(100);

    } catch (error: any) {
      console.error('❌ Processing error:', error);
      setUploadStatus('error');
      setUploadMessage(`Processing failed: ${error.message}`);
      setProgress(0);
    }
  }

  const handleConfirmUpload = async () => {
    if (!processedCSV || !user) return;

    setShowPreview(false);
    setUploading(true);
    setProcessing(true);
    setUploadStatus('processing');
    setUploadMessage('Storing transactions and creating budget...');
    setProgress(10);

    try {
      // Get existing transactions for duplicate detection
      console.log('🔍 Fetching existing transactions...');
      const { data: existingTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .limit(1000);

      const duplicateDetector = new DuplicateDetector(existingTransactions || []);
      const duplicates = duplicateDetector.findDuplicates(processedCSV.transactions);
      
      setProgress(30);

      // Send to backend for storage (convert our Transaction format to backend format)
      const csvData = generateCSVFromTransactions(processedCSV.transactions);
      const { data, error } = await supabase.functions.invoke('process-csv', {
        body: { 
          csvData,
          fileName: 'processed_transactions.csv',
          userId: user.id
        }
      });

      if (error) {
        throw new Error(`Backend storage failed: ${error.message}`);
      }

      setProgress(60);

      const totalProcessed = data.processed || 0;
      const allTransactions = data.transactions || [];

      if (totalProcessed > 0) {
        setUploadStatus('success');
        setUploadMessage('Running AI analysis and creating smart budget...');
        
        // Run AI analysis, budget creation, and goal recommendations
        const [analysisResult, budgetResult] = await Promise.all([
          analyzeTransactions(allTransactions),
          createSmartBudget(allTransactions)
        ]);

        setProgress(90);

        const goalResult = await recommendSmartGoals(allTransactions, budgetResult);
        setProgress(100);

        // Update final results
        setUploadResults({
          success: true,
          processed: totalProcessed,
          skipped: processedCSV.skippedRows.length,
          transactions: allTransactions,
          accountBalance: data.accountBalance || 0,
          bankFormat: processedCSV.bankFormat,
          duplicates,
          errors: processedCSV.errors,
          warnings: processedCSV.warnings,
          analysis: analysisResult,
          budgetCreated: !!budgetResult,
          goalsRecommended: goalResult
        });

        // Update success message
        const features = [];
        if (analysisResult) features.push('AI insights');
        if (budgetResult) features.push('smart budget');
        if (goalResult?.createdGoals && goalResult.createdGoals.length > 0) {
          features.push(`${goalResult.createdGoals.length} SMART goals`);
        }
        
        setUploadMessage(
          `✅ Successfully processed ${totalProcessed} transactions and created ${features.join(', ')}`
        );

        // Notify other components
        window.dispatchEvent(new CustomEvent('csv-upload-complete', {
          detail: { 
            processed: totalProcessed,
            skipped: processedCSV.skippedRows.length,
            transactions: allTransactions,
            budgetCreated: !!budgetResult,
            goalsCreated: goalResult?.createdGoals?.length || 0
          }
        }));
        
      } else {
        setUploadStatus('error');
        setUploadMessage('No transactions were stored successfully');
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      setUploadStatus('error');
      setUploadMessage(`Upload failed: ${error.message}`);
      setProgress(0);
    } finally {
      setUploading(false);
      setProcessing(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setProcessedCSV(null);
    setUploadStatus('idle');
    setUploadMessage('');
    setProgress(0);
  };

  // Helper function to convert our Transaction format back to CSV for backend
  const generateCSVFromTransactions = (transactions: any[]): string => {
    const headers = ['Date', 'Description', 'Amount'];
    const rows = transactions.map(t => [
      t.date,
      t.description,
      t.isIncome ? t.amount.toString() : (-t.amount).toString()
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
  };

  return (
    <div id="upload" className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Smart CSV Import</h3>
          <p className="text-white/60 text-sm">Enhanced parser with preview & detailed feedback</p>
        </div>
      </div>

      {!user && (
        <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 text-sm">Please log in to upload CSV files</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Show CSV Preview */}
        {showPreview && processedCSV && (
          <CSVPreview
            processedData={processedCSV}
            onConfirm={handleConfirmUpload}
            onCancel={handleCancelPreview}
          />
        )}

        {/* Enhanced Drop Zone - Hide when showing preview */}
        {!showPreview && (
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
                  {processing ? 'Processing with enhanced parser...' : 
                   isPickerOpen ? 'Opening file picker...' :
                   dragActive ? 'Drop CSV files here!' :
                   !user ? 'Please log in to upload' : 'Click to upload or drag & drop CSV files'}
                </p>
                <p className="text-white/50 text-sm mt-1">
                  {!user ? 'Authentication required' : 'Enhanced validation + Preview + Smart categorization'}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {progress > 0 && !showPreview && (
              <div className="mt-3">
                <Progress value={progress} className="h-2" />
                <p className="text-white/60 text-xs mt-1 text-center">{progress}% complete</p>
              </div>
            )}
          </div>
        )}

        {/* Status Messages */}
        {uploadStatus !== 'idle' && uploadStatus !== 'preview' && (
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
            ) : uploadStatus === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            ) : (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <span className={`text-sm ${
                uploadStatus === 'success' ? 'text-green-300' : 
                uploadStatus === 'validating' ? 'text-purple-300' :
                uploadStatus === 'error' ? 'text-red-300' :
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

        {/* Enhanced Features List */}
        {!showPreview && (
          <div className="bg-white/10 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">🚀 Enhanced CSV Processing Features:</h4>
            <ul className="text-white/70 text-sm space-y-1">
              <li>• <strong>Tolerant Parser:</strong> Handles various CSV formats, separators, and edge cases</li>
              <li>• <strong>Detailed Preview:</strong> See exactly what will be processed before uploading</li>
              <li>• <strong>Smart Error Recovery:</strong> Identifies and explains skipped rows with suggestions</li>
              <li>• <strong>Flexible Date Parsing:</strong> Supports multiple date formats with auto-detection</li>
              <li>• <strong>Advanced Amount Parsing:</strong> Handles different currency symbols and separators</li>
              <li>• <strong>Comprehensive Logging:</strong> Detailed processing information for debugging</li>
              <li>• <strong>AI Categorization:</strong> Intelligent transaction categorization with confidence scoring</li>
              <li>• <strong>Bank Format Detection:</strong> Automatically detects and adapts to bank-specific formats</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
