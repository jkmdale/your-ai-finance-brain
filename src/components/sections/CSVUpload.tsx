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

        const authenticatedUser = user;
        
        if (isMounted) {
          setUser(authenticatedUser);
          setAuthLoading(false);
          setAuthError(null);
        }

        // Enhanced debugging for initial auth state
        console.log('[CSVUpload] 🔍 Initial auth state:', {
          hasSession: !!session,
          hasUser: !!authenticatedUser,
          userId: authenticatedUser?.id,
          email: authenticatedUser?.email,
          isAuthenticated: !!authenticatedUser,
          sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          authMethod: authenticatedUser?.app_metadata?.provider || 'unknown',
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('[CSVUpload] ❌ Auth initialization error:', error);
        setAuthError(`Initialization error: ${error.message}`);
        if (isMounted) {
          setUser(null);
          setAuthLoading(false);
        }
      }
    }

    // Initialize auth state
    initializeAuth();

    // ✅ FIXED: Improved auth state change subscription with better error handling
    authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('[CSVUpload] 🔄 Auth state change:', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        email: session?.user?.email,
        timestamp: new Date().toISOString()
      });

      const newUser = session?.user ?? null;
      
      // Clear any previous auth errors when state changes
      setAuthError(null);
      
      // Update user state immediately
      setUser(newUser);
      
      // Set loading to false after any auth state change
      setAuthLoading(false);

      // Detailed event handling with user feedback
      switch (event) {
        case 'SIGNED_IN':
          console.log('[CSVUpload] ✅ User signed in successfully');
          toast({
            title: "🔓 Authentication Successful",
            description: "You can now upload CSV files",
          });
          break;
          
        case 'SIGNED_OUT':
          console.log('[CSVUpload] 🚪 User signed out');
          toast({
            title: "🔒 Signed Out",
            description: "Please sign in to upload CSV files",
          });
          break;
          
        case 'TOKEN_REFRESHED':
          console.log('[CSVUpload] 🔄 Auth token refreshed');
          break;
          
        case 'USER_UPDATED':
          console.log('[CSVUpload] 👤 User profile updated');
          break;
          
        case 'INITIAL_SESSION':
          console.log('[CSVUpload] 🎯 Initial session loaded');
          break;
          
        default:
          console.log(`[CSVUpload] 📝 Auth event: ${event}`);
      }
    });

    // ✅ FIXED: Enhanced cleanup function
    return () => {
      console.log('[CSVUpload] 🧹 Cleaning up auth subscription...');
      isMounted = false;
      
      if (authSubscription && typeof authSubscription.unsubscribe === 'function') {
        authSubscription.unsubscribe();
      } else if (authSubscription && authSubscription.data && typeof authSubscription.data.subscription?.unsubscribe === 'function') {
        authSubscription.data.subscription.unsubscribe();
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // ✅ FIXED: Better loading state with detailed feedback
  if (authLoading) {
    return (
      <div className="w-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 text-center">
        <div className="text-blue-400 font-semibold text-lg mb-2">
          🔄 Loading Authentication...
        </div>
        <p className="text-white/80 mb-2">Checking your login status</p>
        <div className="animate-spin h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full mx-auto"></div>
        <small className="text-white/60 text-sm block mt-2">
          If this takes more than a few seconds, please refresh the page
        </small>
      </div>
    );
  }

  // ✅ FIXED: Enhanced authentication required state with better error info
  if (!user) {
    return (
      <div className="w-full bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <div className="text-red-400 font-semibold text-lg mb-2">
          🔒 Authentication Required
        </div>
        <p className="text-white/80 mb-2">Please log in to upload your CSV files</p>
        
        {authError && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-3">
            <p className="text-red-300 text-sm font-medium">⚠️ Auth Error:</p>
            <p className="text-red-200 text-sm">{authError}</p>
          </div>
        )}
        
        <div className="bg-gray-500/20 border border-gray-500/30 rounded-lg p-3 text-left">
          <p className="text-white/70 text-sm mb-1">📋 Debug Info:</p>
          <ul className="text-white/60 text-xs space-y-1">
            <li>• Component mounted and auth subscription active</li>
            <li>• Supabase URL: {import.meta.env.VITE_SUPABASE_URL || 'Using fallback'}</li>
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

  // ✅ FIXED: Enhanced file handling with better error management
  async function handleFiles(files: FileList) {
    if (!files || files.length === 0) return;
    
    if (!user) {
      toast({ 
        title: "❌ Authentication Error", 
        description: "Please log in before uploading files",
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
        
        // Create detailed success message
        let successMessage = `${result.transactionsProcessed} transactions processed successfully`;
        if (result.skippedRows && result.skippedRows > 0) {
          successMessage += ` (${result.skippedRows} rows skipped)`;
        }
        
        toast({ 
          title: "✅ Upload Complete", 
          description: successMessage 
        });
      } else {
        console.error('[CSVUpload] ❌ Upload failed:', result.errors);
        toast({ 
          title: "❌ Upload Failed", 
          description: result.errors.join('; '),
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('[CSVUpload] ❌ Upload exception:', error);
      toast({ 
        title: "❌ Upload Error", 
        description: `Unexpected error: ${error.message}`,
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
          📊 CSV Upload
        </h3>
        
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mb-3">
          <p className="text-green-200 text-sm font-medium">
            ✅ Ready to Upload
          </p>
          <p className="text-green-100 text-xs">
            Authenticated as: {user.email} • User ID: {user.id.slice(0, 8)}...
          </p>
        </div>
        
        <p className="text-white/70 text-sm">
          Drag and drop your CSV files or click to browse
        </p>
      </div>
      
      <FileUploadZone 
        user={user}
        uploading={uploading}
        processing={processing}
        isPickerOpen={isPickerOpen}
        onFilesSelected={handleFiles} 
        onOpenFilePicker={handleOpenFilePicker}
      />
      
      {/* ✅ FIXED: Enhanced progress indicator */}
      {progress && (
        <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            <p className="text-blue-200 text-sm font-medium">{progress}</p>
          </div>
        </div>
      )}
      
      {/* ✅ FIXED: Enhanced results display */}
      {result && (
        <div className="mt-4 space-y-3">
          {/* Success Summary */}
          {result.success && (
            <div className="text-sm text-left bg-green-500/20 border border-green-500/30 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-green-400 text-lg">✅</span>
                <strong className="text-green-200">Upload Complete!</strong>
              </div>
              
              <div className="space-y-1 text-white/80">
                <p>📊 {result.transactionsProcessed} transactions imported successfully</p>
                {result.totalRowsProcessed && (
                  <p className="text-sm text-white/60">
                    Total rows processed: {result.totalRowsProcessed}
                  </p>
                )}
                {result.duplicatesSkipped > 0 && (
                  <p>🔁 {result.duplicatesSkipped} duplicate transactions removed</p>
                )}
                {result.budgetGenerated && <p>💰 Budget generated successfully</p>}
                {result.smartGoals?.length > 0 && <p>🎯 {result.smartGoals.length} SMART goals created</p>}
              </div>
            </div>
          )}

          {/* Skipped Rows Warning */}
          {result.skippedRows > 0 && (
            <div className="text-sm text-left bg-yellow-500/20 border border-yellow-500/30 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-yellow-400">⚠️</span>
                <strong className="text-yellow-200">
                  {result.skippedRows} rows skipped due to errors
                </strong>
              </div>
              
              {result.skippedRowDetails && result.skippedRowDetails.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-yellow-100 text-xs font-medium">Sample errors:</p>
                  {result.skippedRowDetails.map((row, index) => (
                    <div key={index} className="bg-black/20 p-2 rounded text-xs space-y-1">
                      <p className="text-yellow-200">
                        Row {row.rowNumber}: {row.error}
                      </p>
                      <p className="text-white/50">
                        Date: "{row.dateValue || '[empty]'}" | 
                        Amount: "{row.amountValue || '[empty]'}"
                      </p>
                    </div>
                  ))}
                  {result.skippedRows > result.skippedRowDetails.length && (
                    <p className="text-yellow-100/70 text-xs italic">
                      ... and {result.skippedRows - result.skippedRowDetails.length} more rows
                    </p>
                  )}
                </div>
              )}
              
              <div className="mt-3 text-xs text-white/60">
                <p>💡 Common issues:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Date formats: Use DD/MM/YYYY, DD/MM/YY, or YYYY-MM-DD</li>
                  <li>Amount formats: Use numeric values like 123.45 or -123.45</li>
                  <li>Required fields: Date, Description, and Amount</li>
                </ul>
              </div>
            </div>
          )}

          {/* Error Summary */}
          {!result.success && result.errors.length > 0 && (
            <div className="text-sm text-left bg-red-500/20 border border-red-500/30 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-red-400">❌</span>
                <strong className="text-red-200">Upload Failed</strong>
              </div>
              <div className="text-red-200 text-xs space-y-1">
                {result.errors.map((error, index) => (
                  <p key={index}>• {error}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* ✅ FIXED: Enhanced idle state with helpful tips */}
      {!uploading && !processing && !result && (
        <div className="mt-4 text-center space-y-2">
          <div className="text-white/60 text-sm">
            <p>💡 Ready to process your financial data</p>
            <p className="text-xs mt-1">
              Supports: Bank statements, credit card exports, transaction CSVs
            </p>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-200 text-xs">
              🔐 Secure upload • 📊 Smart analysis • 🎯 Goal generation
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
