
import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Eye, TrendingUp, AlertTriangle, Info, Target, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFilePicker } from '@/hooks/useFilePicker';
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
  budgetCreated?: boolean;
  goalsRecommended?: any[];
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
  const [creatingBudget, setCreatingBudget] = useState(false);
  const [recommendingGoals, setRecommendingGoals] = useState(false);
  const { user } = useAuth();

  const csvProcessor = new CSVProcessor();

  // Use dedicated file picker hook
  const { openFilePicker, isPickerOpen } = useFilePicker({
    accept: '.csv,text/csv,application/vnd.ms-excel',
    multiple: true,
    onFilesSelected: handleFilesSelected
  });

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

  const recommendSmartGoals = async (transactions: any[], budgetResult: any) => {
    if (!transactions.length || !user) return [];

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
        return [];
      }

      return {
        aiRecommendations: data.response,
        createdGoals: createdGoals || []
      };
    } catch (error: any) {
      console.error('Goal recommendation error:', error);
      return [];
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

    setUploading(true);
    setProcessing(true);
    setUploadStatus('processing');
    setUploadResults(null);
    setProcessedCSV(null);
    setUploadMessage('Processing CSV files with AI...');

    try {
      let totalProcessed = 0;
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

      // Process each file
      for (const file of Array.from(files)) {
        console.log(`📄 Processing: ${file.name}`);
        
        try {
          const text = await file.text();
          
          if (!text.trim()) {
            allErrors.push(`File ${file.name} is empty`);
            continue;
          }

          setUploadMessage(`Processing ${file.name} with AI categorization...`);

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
            } else {
              totalProcessed += data.processed || 0;
              allTransactions.push(...(data.transactions || []));
            }
          }
        } catch (fileError: any) {
          console.error(`❌ File error:`, fileError);
          allErrors.push(`Error processing ${file.name}: ${fileError.message}`);
        }
      }

      if (totalProcessed > 0) {
        setUploadStatus('success');
        setUploadMessage(`Successfully processed ${totalProcessed} transactions`);
        
        // Run AI analysis, budget creation, and goal recommendations in parallel
        setUploadMessage('Running AI analysis and creating smart budget...');
        
        const [analysisResult, budgetResult, goalResult] = await Promise.all([
          analyzeTransactions(allTransactions),
          createSmartBudget(allTransactions),
          recommendSmartGoals(allTransactions, null).then(result => 
            createSmartBudget(allTransactions).then(budget => 
              recommendSmartGoals(allTransactions, budget)
            )
          )
        ]);

        // Update final results
        setUploadResults({
          success: true,
          processed: totalProcessed,
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

        // Update success message
        const features = [];
        if (analysisResult) features.push('AI insights');
        if (budgetResult) features.push('smart budget');
        if (goalResult && goalResult.createdGoals?.length > 0) features.push(`${goalResult.createdGoals.length} SMART goals`);
        
        setUploadMessage(
          `✅ Successfully processed ${totalProcessed} transactions and created ${features.join(', ')}`
        );

        // Notify other components
        window.dispatchEvent(new CustomEvent('csv-upload-complete', {
          detail: { 
            processed: totalProcessed, 
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
            : `No transactions found. ${allWarnings.join('; ')}`
        );
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      setUploadStatus('error');
      setUploadMessage(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setProcessing(false);
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
        <div className="relative">
          <button
            onClick={openFilePicker}
            disabled={uploading || !user || isPickerOpen}
            className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all duration-200 ${
              uploading || !user || isPickerOpen
                ? 'border-white/20 bg-white/5 cursor-not-allowed'
                : 'border-white/40 bg-white/10 hover:bg-white/20 hover:border-white/60 cursor-pointer'
            }`}
          >
            <div className="text-center">
              {processing || isPickerOpen ? (
                <Loader2 className="w-8 h-8 text-white/60 mx-auto mb-2 animate-spin" />
              ) : (
                <FileText className="w-8 h-8 text-white/60 mx-auto mb-2" />
              )}
              <p className="text-white/80 font-medium">
                {processing ? 'Processing with AI...' : 
                 isPickerOpen ? 'Opening file picker...' :
                 !user ? 'Please log in to upload' : 'Click to upload CSV files'}
              </p>
              <p className="text-white/50 text-sm mt-1">
                {!user ? 'Authentication required' : 'Auto-categorization + Budget + SMART Goals'}
              </p>
            </div>
          </button>
        </div>

        {uploadStatus !== 'idle' && (
          <div className={`flex items-start space-x-2 p-4 rounded-lg ${
            uploadStatus === 'success' 
              ? 'bg-green-500/20 border border-green-500/30' 
              : uploadStatus === 'processing'
              ? 'bg-blue-500/20 border border-blue-500/30'
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            {uploadStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            ) : uploadStatus === 'processing' ? (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <span className={`text-sm ${
                uploadStatus === 'success' ? 'text-green-300' : 
                uploadStatus === 'processing' ? 'text-blue-300' : 'text-red-300'
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
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-white mb-1">{uploadResults.processed}</div>
                <div className="text-white/60 text-xs">Transactions</div>
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
                <div className="text-xl font-bold text-yellow-400 mb-1">
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
            {uploadResults.goalsRecommended.createdGoals?.length > 0 && (
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
