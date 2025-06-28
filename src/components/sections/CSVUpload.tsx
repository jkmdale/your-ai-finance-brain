
import React, { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFilePicker } from '@/hooks/useFilePicker';
import { budgetCreator } from '@/services/budgetCreator';
import { FileUploadZone } from '@/components/csv/FileUploadZone';
import { ProgressTracker } from '@/components/csv/ProgressTracker';
import { StatusMessage } from '@/components/csv/StatusMessage';
import { DetailedResults } from '@/components/csv/DetailedResults';
import { FeaturesList } from '@/components/csv/FeaturesList';

interface GoalRecommendationResult {
  aiRecommendations?: string;
  createdGoals?: any[];
}

interface DetailedResults {
  totalParsed: number;
  totalUploaded: number;
  batchResults: Array<{ 
    batchNumber: number; 
    attempted: number; 
    succeeded: number; 
    failed: number; 
    errors: string[] 
  }>;
}

interface UploadResult {
  success: boolean;
  processed: number;
  skipped: number;
  transactions: any[];
  accountBalance: number;
  analysis?: string;
  bankFormat?: any;
  duplicates?: any[];
  errors?: string[];
  warnings?: string[];
  budgetCreated?: boolean;
  goalsRecommended?: GoalRecommendationResult;
  detailedResults?: DetailedResults;
  fileValidation?: {
    isValid: boolean;
    reason?: string;
    rowDetails?: Array<{ row: number; reason: string; data?: string[]; suggestion?: string }>;
  };
}

export const CSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'processing' | 'validating' | 'preview'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadResults, setUploadResults] = useState<UploadResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [creatingBudget, setCreatingBudget] = useState(false);
  const [recommendingGoals, setRecommendingGoals] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

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

    setUploading(true);
    setProcessing(true);
    setUploadStatus('processing');
    setUploadMessage(`Processing ${files.length} CSV file(s) directly via Supabase...`);
    setProgress(10);

    let totalProcessed = 0;
    let totalSkipped = 0;
    let allErrors: string[] = [];
    let allWarnings: string[] = [];
    let allTransactions: any[] = [];
    let detailedResults: DetailedResults | undefined;

    try {
      // Process files directly via Supabase edge function
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileProgress = ((i + 1) / files.length) * 80; // Up to 80% for file processing
        
        setUploadMessage(`Processing file ${i + 1}/${files.length}: ${file.name}`);
        setProgress(fileProgress);

        try {
          const text = await file.text();
          
          if (!text.trim()) {
            allErrors.push(`File ${file.name} is empty`);
            continue;
          }

          console.log(`🚀 Sending ${file.name} to Supabase for processing...`);

          // Send to Supabase edge function for processing
          const { data, error } = await supabase.functions.invoke('process-csv', {
            body: {
              csvData: text,
              fileName: file.name
            }
          });

          if (error) {
            console.error(`❌ Error processing ${file.name}:`, error);
            allErrors.push(`${file.name}: ${error.message}`);
            continue;
          }

          if (data) {
            console.log(`✅ ${file.name} processed:`, data);
            
            totalProcessed += data.processed || 0;
            totalSkipped += data.skipped || 0;
            allTransactions.push(...(data.transactions || []));
            
            if (data.errors) {
              allErrors.push(...data.errors.map((e: string) => `${file.name}: ${e}`));
            }
            if (data.warnings) {
              allWarnings.push(...data.warnings.map((w: string) => `${file.name}: ${w}`));
            }
            
            // Capture detailed results from the last file (or combine them)
            if (data.detailedResults) {
              detailedResults = data.detailedResults;
            }
          }

        } catch (fileError: any) {
          console.error(`❌ Error processing ${file.name}:`, fileError);
          allErrors.push(`${file.name}: ${fileError.message}`);
        }
      }

      setProgress(90);

      if (totalProcessed > 0) {
        setUploadStatus('success');
        setUploadMessage('Running AI analysis and creating smart budget...');
        
        // Run AI analysis, budget creation, and goal recommendations
        const [analysisResult, budgetResult] = await Promise.all([
          analyzeTransactions(allTransactions),
          createSmartBudget(allTransactions)
        ]);

        const goalResult = await recommendSmartGoals(allTransactions, budgetResult);
        setProgress(100);

        // Update final results
        setUploadResults({
          success: true,
          processed: totalProcessed,
          skipped: totalSkipped,
          transactions: allTransactions,
          accountBalance: 0, // This will be updated by the edge function
          errors: allErrors,
          warnings: allWarnings,
          analysis: analysisResult,
          budgetCreated: !!budgetResult,
          goalsRecommended: goalResult,
          detailedResults
        });

        // Update success message
        const features = [];
        if (analysisResult) features.push('AI insights');
        if (budgetResult) features.push('smart budget');
        if (goalResult?.createdGoals && goalResult.createdGoals.length > 0) {
          features.push(`${goalResult.createdGoals.length} SMART goals`);
        }
        
        setUploadMessage(
          `✅ Successfully processed ${totalProcessed} transactions from ${files.length} file(s) and created ${features.join(', ')}`
        );

        console.log(`🎉 Upload complete: ${totalProcessed} transactions processed from ${files.length} files`);

        // Notify other components
        window.dispatchEvent(new CustomEvent('csv-upload-complete', {
          detail: { 
            processed: totalProcessed,
            skipped: totalSkipped,
            transactions: allTransactions,
            budgetCreated: !!budgetResult,
            goalsCreated: goalResult?.createdGoals?.length || 0,
            filesProcessed: files.length
          }
        }));
        
      } else {
        setUploadStatus('error');
        setUploadMessage(`No transactions were uploaded successfully. Total skipped: ${totalSkipped}`);
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
  }

  return (
    <div id="upload" className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Enhanced CSV Upload</h3>
          <p className="text-white/60 text-sm">Comprehensive processing with detailed error handling</p>
        </div>
      </div>

      {!user && (
        <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 text-sm">Please log in to upload CSV files</p>
        </div>
      )}

      <div className="space-y-4">
        <FileUploadZone
          user={user}
          uploading={uploading}
          processing={processing}
          isPickerOpen={isPickerOpen}
          onFilesSelected={handleFilesSelected}
          onOpenFilePicker={openFilePicker}
        />

        <ProgressTracker
          progress={progress}
          analyzing={analyzing}
          creatingBudget={creatingBudget}
          recommendingGoals={recommendingGoals}
        />

        <StatusMessage
          status={uploadStatus}
          message={uploadMessage}
          analyzing={analyzing}
          creatingBudget={creatingBudget}
          recommendingGoals={recommendingGoals}
        />

        {uploadResults?.detailedResults && (
          <DetailedResults
            detailedResults={uploadResults.detailedResults}
            skipped={uploadResults.skipped}
          />
        )}

        <FeaturesList />
      </div>
    </div>
  );
};
