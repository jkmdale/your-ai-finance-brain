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
      <div className="text-center py-6">
        🔒 Please log in to upload your CSV<br />
        <small className="text-xs text-gray-400">Authentication required</small>
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
    <div className="w-full">
      <FileUploadZone 
        user={user}
        uploading={uploading}
        processing={processing}
        isPickerOpen={isPickerOpen}
        onFilesSelected={handleFiles} 
        onOpenFilePicker={handleOpenFilePicker}
      />
      {progress && <p className="text-xs mt-2 text-gray-500">🔄 {progress}</p>}
      {result && (
        <div className="mt-4 text-sm text-left whitespace-pre-wrap bg-gray-50 p-3 rounded">
          <strong>✅ {result.transactionsProcessed} processed</strong><br />
          {result.budgetGenerated && <>📊 Budget generated<br /></>}
          {result.smartGoals?.length > 0 && <>🎯 {result.smartGoals.length} SMART goals created</>}
          {result.errors.length > 0 && (
            <><br /><span className="text-red-600">⚠️ Errors:</span><br />{result.errors.join('\n')}</>
          )}
        </div>
      )}
    </div>
  );
}
