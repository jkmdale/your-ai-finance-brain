import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileUploadZone } from '@/components/csv/FileUploadZone';
import { SmartFinanceCore } from '@/services/smartFinanceCore';

export function CSVUpload() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Auth patch: always get latest user from Supabase
  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      // Debug log for mobile/PWA
      console.log('[CSVUpload] user:', data?.user);
    }
    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      console.log('[CSVUpload] Auth change event:', _event, session);
    });
    return () => { listener?.subscription?.unsubscribe(); };
  }, []);

  if (!user) {
    return (
      <div className="w-full bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <div className="text-red-400 font-semibold text-lg mb-2">
          🔒 DEBUG: CSV Upload - Authentication Required
        </div>
        <p className="text-white/80 mb-2">Please log in to upload your CSV files</p>
        <small className="text-white/60 text-sm block">
          Component is rendering but user authentication is missing
        </small>
      </div>
    );
  }

  async function handleFiles(files: FileList) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setProcessing(true);
    
    toast({ title: "📊 Upload started", description: "Processing CSV file..." });

    const core = new SmartFinanceCore();

    const result = await core.processCompleteWorkflow(
      files,
      user.id,
      (stage, pct) => {
        setProgress(`${stage} (${pct}%)`);
      }
    );

    setResult(result);
    setUploading(false);
    setProcessing(false);

    if (result.success) {
      toast({ title: "✅ Upload complete", description: `${result.transactionsProcessed} transactions processed.` });
    } else {
      toast({ title: "❌ Upload failed", description: result.errors.join('; ') });
    }
  }

  const handleOpenFilePicker = () => {
    setIsPickerOpen(true);
  };

  return (
    <div className="w-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
      {/* DEBUG: Clear visual indicator */}
      <div className="mb-4 text-center">
        <h3 className="text-xl font-bold text-white mb-2">
          📊 DEBUG: CSV Upload Here
        </h3>
        <p className="text-white/70 text-sm">
          Component is loaded and ready • User authenticated ✓
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
      
      {/* Progress indicator */}
      {progress && (
        <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <p className="text-blue-200 text-sm font-medium">🔄 {progress}</p>
        </div>
      )}
      
      {/* Results display */}
      {result && (
        <div className="mt-4 text-sm text-left whitespace-pre-wrap bg-green-500/20 border border-green-500/30 p-4 rounded-lg">
          <strong className="text-green-200">✅ {result.transactionsProcessed} transactions processed</strong><br />
          {result.budgetGenerated && <span className="text-white/80">📊 Budget generated<br /></span>}
          {result.smartGoals?.length > 0 && <span className="text-white/80">🎯 {result.smartGoals.length} SMART goals created</span>}
          {result.errors.length > 0 && (
            <div className="mt-2 pt-2 border-t border-red-500/30">
              <span className="text-red-300 font-medium">⚠️ Errors:</span><br />
              <span className="text-red-200">{result.errors.join('\n')}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Always visible placeholder when idle */}
      {!uploading && !processing && !result && (
        <div className="mt-4 text-center text-white/60 text-sm">
          <p>💡 Drag and drop CSV files above or click to browse</p>
          <p className="text-xs mt-1">Supports bank statements, transaction exports, and financial data</p>
        </div>
      )}
    </div>
  );
}
