import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileUploadZone } from '@/components/csv/FileUploadZone';
import { SmartFinanceCore } from '@/services/smartFinanceCore';
import { User } from '@supabase/supabase-js';

export function CSVUpload() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // ✅ FIXED: Enhanced authentication state management with proper error handling
  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;

    console.log('[CSVUpload] 🚀 Component mounted - initializing authentication...');

    // Enhanced initial auth state check
    async function initializeAuth() {
      try {
        setAuthLoading(true);
        setAuthError(null);
        
        // First, get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[CSVUpload] ❌ Session error:', sessionError);
          setAuthError(`Session error: ${sessionError.message}`);
          if (isMounted) {
            setUser(null);
            setAuthLoading(false);
          }
          return;
        }

        // Then get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('[CSVUpload] ❌ User error:', userError);
          setAuthError(`User error: ${userError.message}`);
          if (isMounted) {
            setUser(null);
            setAuthLoading(false);
          }
          return;
        }

        if (isMounted) {
          setUser(user);
          setAuthError(null);
          setAuthLoading(false);
        }
        
        console.log('[CSVUpload] 🔍 Initial auth state:', {
          hasSession: !!session,
          hasUser: !!user,
          userId: user?.id,
          email: user?.email
        });
        
        // Subscribe to auth changes
        authSubscription = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return;
            
            console.log('[CSVUpload] 🔄 Auth state change:', {
              event,
              hasSession: !!session,
              hasUser: !!session?.user,
              userId: session?.user?.id
            });

            switch (event) {
              case 'SIGNED_IN':
                setUser(session?.user || null);
                setAuthError(null);
                setAuthLoading(false);
                console.log('[CSVUpload] ✅ User signed in successfully');
                toast({
                  title: "🔐 Authentication Success",
                  description: "You can now upload CSV files",
                  variant: "default"
                });
                break;
              case 'SIGNED_OUT':
                setUser(null);
                setAuthError(null);
                setAuthLoading(false);
                console.log('[CSVUpload] 🚪 User signed out');
                toast({
                  title: "👋 Signed Out",
                  description: "Please sign in to upload CSV files",
                  variant: "default"
                });
                break;
              case 'TOKEN_REFRESHED':
                console.log('[CSVUpload] 🔄 Auth token refreshed');
                break;
              default:
                setAuthLoading(false);
                break;
            }
          }
        );
        
      } catch (error) {
        console.error('[CSVUpload] ❌ Auth initialization error:', error);
        if (isMounted) {
          setAuthError(`Authentication failed: ${error.message}`);
          setAuthLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [toast]);

  // Show loading state during auth initialization
  if (authLoading) {
    return (
      <div className="w-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-bold text-white mb-2">Initializing Authentication...</h3>
        <p className="text-white/60">Setting up secure connection...</p>
      </div>
    );
  }

  // Show auth error with detailed troubleshooting
  if (authError) {
    return (
      <div className="w-full bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <div className="text-red-400 text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-bold text-white mb-2">Authentication Issue</h3>
        <p className="text-white/80 mb-4">{authError}</p>
        
        <div className="bg-red-500/10 rounded-lg p-4 mb-4">
          <h4 className="text-white font-medium mb-2">Authentication Details:</h4>
          <ul className="text-white/70 text-sm text-left space-y-1">
            <li>• Error: {authError}</li>
            <li>• Auth method: Waiting for login...</li>
            <li>• Timestamp: {new Date().toISOString()}</li>
          </ul>
        </div>
        
        <p className="text-white/60 text-xs mt-3">
          Try signing in with biometrics, magic link, or your preferred method
        </p>
      </div>
    );
  }

  // Show sign-in prompt when not authenticated
  if (!user) {
    return (
      <div className="w-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6 text-center">
        <div className="text-purple-400 text-4xl mb-4">🔐</div>
        <h3 className="text-lg font-bold text-white mb-2">Sign In Required</h3>
        <p className="text-white/80 mb-4">Please sign in to upload and analyze your financial data.</p>
        
        <div className="bg-purple-500/10 rounded-lg p-4 mb-4">
          <h4 className="text-white font-medium mb-2">Authentication Status:</h4>
          <ul className="text-white/70 text-sm text-left space-y-1">
            <li>• Status: Not authenticated</li>
            <li>• Auth method: Waiting for login...</li>
            <li>• Timestamp: {new Date().toISOString()}</li>
          </ul>
        </div>
        
        <p className="text-white/60 text-xs mt-3">
          Try signing in with biometrics, magic link, or your preferred method
        </p>
      </div>
    );
  }

  /**
   * Enhanced file upload handler with user-friendly error messages
   * Handles the complete workflow: CSV parsing -> AI categorization -> Budget generation
   * Shows clear summaries and handles skipped rows gracefully
   */
  async function handleFiles(files: FileList) {
    if (!files || files.length === 0) return;
    
    if (!user) {
      toast({ 
        title: "🔐 Authentication Required", 
        description: "Please sign in before uploading files",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setProcessing(true);
    setResult(null);
    
    console.log('[CSVUpload] 📁 Starting file upload:', {
      fileCount: files.length,
      fileName: files[0]?.name,
      fileSize: files[0]?.size,
      userId: user.id
    });

    toast({ 
      title: "📊 Upload Started", 
      description: "Processing your CSV file..." 
    });

    try {
      const core = new SmartFinanceCore();
      
      // Process the complete workflow with progress tracking
      const result = await core.processCompleteWorkflow(
        files,
        user.id,
        (stage, pct) => {
          const progressMsg = `${stage} (${pct}%)`;
          setProgress(progressMsg);
          console.log(`[CSVUpload] 📈 Progress: ${progressMsg}`);
        }
      );

      setResult(result);
      
      if (result.success) {
        console.log('[CSVUpload] ✅ Upload successful:', result);
        
        // Create user-friendly success message with clear summary
        const successParts = [];
        
        // Main success message
        if (result.transactionsProcessed > 0) {
          successParts.push(`${result.transactionsProcessed} transactions imported successfully`);
        }
        
        // Handle skipped rows in a friendly way
        if (result.skippedRows && result.skippedRows > 0) {
          successParts.push(`${result.skippedRows} rows skipped (missing data)`);
        }
        
        // Handle duplicates
        if (result.duplicatesSkipped && result.duplicatesSkipped > 0) {
          successParts.push(`${result.duplicatesSkipped} duplicates avoided`);
        }
        
        // Additional features completed
        const features = [];
        if (result.budgetGenerated) features.push('budgets generated');
        if (result.smartGoals && result.smartGoals.length > 0) {
          features.push(`${result.smartGoals.length} SMART goals created`);
        }
        
        if (features.length > 0) {
          successParts.push(features.join(' and '));
        }
        
        const successMessage = successParts.join(', ');
        
        toast({ 
          title: "✅ Upload Complete", 
          description: successMessage,
          duration: 8000 // Show longer for detailed message
        });
        
        // Show additional details if there were skipped rows (but not as an error)
        if (result.skippedRows && result.skippedRows > 0 && result.skippedRowDetails && result.skippedRowDetails.length > 0) {
          console.log('ℹ️ Skipped rows details:', result.skippedRowDetails);
          
          // Create a user-friendly explanation of skipped rows
          const commonReasons = result.skippedRowDetails.map(detail => {
            if (detail.error.includes('missing') || detail.error.includes('empty')) {
              return 'missing data';
            } else if (detail.error.includes('date')) {
              return 'invalid date format';
            } else if (detail.error.includes('amount')) {
              return 'invalid amount';
            } else {
              return 'formatting issue';
            }
          });
          
          const uniqueReasons = [...new Set(commonReasons)];
          
          // Show a helpful info toast (not an error)
          toast({
            title: "ℹ️ Some Rows Skipped",
            description: `${result.skippedRows} rows skipped due to: ${uniqueReasons.join(', ')}. This is normal for CSV files.`,
            variant: "default",
            duration: 6000
          });
        }
        
      } else {
        console.error('[CSVUpload] ❌ Upload failed:', result.errors);
        
        // Handle critical errors vs. normal skipped rows
        const criticalErrors = result.errors.filter(error => 
          !error.includes('skipped') && 
          !error.includes('missing data') &&
          !error.includes('empty')
        );
        
        if (criticalErrors.length > 0) {
          // Show critical errors to user
          toast({ 
            title: "❌ Upload Failed", 
            description: criticalErrors.join('; '),
            variant: "destructive"
          });
        } else if (result.transactionsProcessed === 0 && result.skippedRows && result.skippedRows > 0) {
          // All rows were skipped - this is a user issue, not a system error
          toast({
            title: "⚠️ No Valid Transactions Found",
            description: `All ${result.skippedRows} rows were skipped due to missing or invalid data. Please check your CSV format.`,
            variant: "destructive",
            duration: 8000
          });
        } else {
          // Generic failure message
          toast({ 
            title: "❌ Upload Failed", 
            description: "Unable to process the CSV file. Please try again.",
            variant: "destructive"
          });
        }
      }
      
    } catch (error) {
      console.error('[CSVUpload] ❌ Upload exception:', error);
      
      // Handle different types of errors gracefully
      let errorMessage = "An unexpected error occurred while processing your file.";
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = "Network error - please check your connection and try again.";
      } else if (error.message.includes('auth') || error.message.includes('permission')) {
        errorMessage = "Authentication error - please sign in again.";
      } else if (error.message.includes('parse') || error.message.includes('CSV')) {
        errorMessage = "CSV format error - please check your file format.";
      }
      
      toast({ 
        title: "❌ Upload Error", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setProcessing(false);
      setProgress('');
    }
  }

  const handleOpenFilePicker = () => {
    setIsPickerOpen(true);
  };

  return (
    <div className="w-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 md:p-6">
      {/* ✅ FIXED: Enhanced header with user info */}
      <div className="mb-4 text-center">
        <h3 className="text-lg md:text-xl font-bold text-white mb-2">
          Upload Bank Transactions
        </h3>
        <p className="text-white/70 text-sm">
          Upload your CSV bank statement for AI-powered analysis and budgeting
        </p>
        
        {/* User info display */}
        {user && (
          <div className="mt-2 text-xs text-white/50">
            Signed in as: {user.email}
          </div>
        )}
      </div>

      {/* Progress indicator */}
      {processing && progress && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            <span className="text-blue-300 text-sm font-medium">{progress}</span>
          </div>
        </div>
      )}

      {/* File upload zone */}
      <FileUploadZone
        user={user}
        uploading={uploading}
        processing={processing}
        isPickerOpen={isPickerOpen}
        onFilesSelected={handleFiles}
        onOpenFilePicker={handleOpenFilePicker}
      />

      {/* Enhanced result display */}
      {result && (
        <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <h4 className="text-green-300 font-medium mb-2">✅ Processing Complete</h4>
          <div className="text-white/80 text-sm space-y-1">
            <div>• {result.transactionsProcessed} transactions processed</div>
            {result.skippedRows > 0 && (
              <div>• {result.skippedRows} rows skipped (missing data)</div>
            )}
            {result.duplicatesSkipped > 0 && (
              <div>• {result.duplicatesSkipped} duplicates avoided</div>
            )}
            {result.budgetGenerated && (
              <div>• Budget generated for {result.monthlyBudgets?.length || 0} months</div>
            )}
            {result.smartGoals && result.smartGoals.length > 0 && (
              <div>• {result.smartGoals.length} SMART goals created</div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced help text */}
      <div className="mt-4 text-xs text-white/50 space-y-1">
        <div>💡 Supported formats: CSV files from major NZ banks (ANZ, ASB, Westpac, BNZ, Kiwibank)</div>
        <div>📊 Features: Auto-categorization, budget generation, SMART goals, duplicate detection</div>
        <div>⚠️ Note: Some rows may be skipped due to missing data - this is normal</div>
      </div>
    </div>
  );
}
