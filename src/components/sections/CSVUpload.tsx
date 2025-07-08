import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Brain, Loader2, TrendingUp, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { smartFinanceCore, type ProcessingResult } from '@/services/smartFinanceCore';

export const CSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'processing'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

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
    setProgress(0);

    try {
      console.log(`🚀 Starting SmartFinance processing for ${files.length} files...`);
      
      const result = await smartFinanceCore.processCompleteWorkflow(
        files,
        user.id,
        (stage: string, progress: number) => {
          setUploadMessage(stage);
          setProgress(progress);
        }
      );

      setProcessingResult(result);

      if (result.success) {
        setUploadStatus('success');
        setUploadMessage(
          `✅ Complete! Processed ${result.transactionsProcessed} transactions, ` +
          `generated ${result.monthlyBudgets.length} budgets, and ${result.smartGoals?.length || 0} SMART goals`
        );
        
        toast({
          title: "SmartFinance Processing Complete! 🎉",
          description: `${result.transactionsProcessed} transactions processed with AI categorization and budget generation`,
          duration: 8000,
        });

        // Trigger dashboard refresh
        window.dispatchEvent(new CustomEvent('smartfinance-complete', { 
          detail: result
        }));
        
      } else {
        setUploadStatus('error');
        setUploadMessage(`Processing failed: ${result.errors.join(', ')}`);
        
        toast({
          title: "Processing Failed",
          description: result.errors.join(', '),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('SmartFinance processing error:', error);
      setUploadStatus('error');
      setUploadMessage(`Processing failed: ${error.message}`);
      
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setTimeout(() => {
        setProgress(0);
      }, 3000);
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
          <p className="text-white/70 text-sm">Complete workflow: Upload → AI Categorization → Budget → Goals</p>
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
              {uploading ? 'Processing...' : 'Select Bank CSV Files'}
            </p>
            <p className="text-white/60 text-sm">
              Choose CSV files from NZ banks (ANZ, ASB, Westpac, Kiwibank, BNZ)
            </p>
          </label>
        </div>

        {/* Enhanced Progress Bar */}
        {progress > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-white/70">
              <span className="font-medium">{uploadMessage || 'Processing Pipeline...'}</span>
              <span className="font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-4 shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 h-4 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div className="text-xs text-white/60 text-center">
              Mobile-optimized processing with enhanced retry logic
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
            {uploadStatus === 'processing' && <Brain className="w-5 h-5 flex-shrink-0 animate-pulse" />}
            <p className="text-sm font-medium">{uploadMessage}</p>
          </div>
        )}

        {/* Processing Results */}
        {processingResult && processingResult.success && (
          <div className="bg-white/10 rounded-lg p-6 space-y-4">
            <h4 className="text-white font-medium flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>SmartFinance Processing Complete!</span>
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-white/70">
                <span className="block text-white font-medium text-lg">{processingResult.transactionsProcessed}</span>
                <span>Transactions Processed</span>
              </div>
              <div className="text-white/70">
                <span className="block text-white font-medium text-lg">{processingResult.duplicatesSkipped}</span>
                <span>Duplicates Skipped</span>
              </div>
              <div className="text-white/70">
                <span className="block text-white font-medium text-lg">{processingResult.monthlyBudgets.length}</span>
                <span>Budgets Generated</span>
              </div>
              <div className="text-white/70">
                <span className="block text-white font-medium text-lg">{processingResult.smartGoals?.length || 0}</span>
                <span>SMART Goals</span>
              </div>
            </div>

            {processingResult.monthlyBudgets.length > 0 && (
              <div className="bg-white/5 rounded-lg p-4">
                <h5 className="text-white font-medium mb-2 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Budget Months Generated</span>
                </h5>
                <div className="flex flex-wrap gap-2">
                  {processingResult.monthlyBudgets.map(month => (
                    <span key={month} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                      {month}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {processingResult.smartGoals && processingResult.smartGoals.length > 0 && (
              <div className="bg-white/5 rounded-lg p-4">
                <h5 className="text-white font-medium mb-3 flex items-center space-x-2">
                  <Target className="w-4 h-4" />
                  <span>AI-Generated SMART Goals</span>
                </h5>
                <div className="space-y-2">
                  {processingResult.smartGoals.map((goal, index) => (
                    <div key={index} className="bg-white/5 rounded p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-white font-medium text-sm">{goal.name}</span>
                        <span className="text-green-400 font-medium text-sm">${goal.target_amount.toLocaleString()}</span>
                      </div>
                      <p className="text-white/70 text-xs">{goal.rationale}</p>
                      <p className="text-white/50 text-xs mt-1">Target: {goal.deadline}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {processingResult.errors.length > 0 && (
              <div className="bg-red-500/10 rounded-lg p-4">
                <p className="text-red-300 text-sm font-medium mb-2">Issues Encountered:</p>
                <ul className="text-red-300/70 text-xs space-y-1">
                  {processingResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Feature Info */}
        <div className="bg-white/5 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Complete AI-Powered Workflow</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/70">
            <div>🏦 NZ bank format detection (ANZ, ASB, Westpac, Kiwibank, BNZ)</div>
            <div>🧠 Claude AI transaction categorization</div>
            <div>🔄 Automatic duplicate detection</div>
            <div>💰 Zero-based budget generation</div>
            <div>🎯 SMART financial goals creation</div>
            <div>📊 Real-time dashboard updates</div>
          </div>
        </div>
      </div>
    </div>
  );
};