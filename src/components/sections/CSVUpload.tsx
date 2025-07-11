import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { FileUploadZone } from '@/components/csv/FileUploadZone';
import { SmartFinanceCore } from '@/services/smartFinanceCore';

export function CSVUpload() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
    };
    fetchUser();
  }, []);

  if (!user) {
    return <div className="text-center py-6">🔒 Please log in to upload your CSV</div>;
  }

  async function handleFiles(files: File[]) {
    if (!files || files.length === 0) return;

    toast({ title: "📊 Upload started", description: "Processing CSV file..." });

    const core = new SmartFinanceCore();

    const result = await core.processCompleteWorkflow(
      files as unknown as FileList,
      user.id,
      (stage, pct) => {
        setProgress(`${stage} (${pct}%)`);
      }
    );

    setResult(result);

    if (result.success) {
      toast({ title: "✅ Upload complete", description: `${result.transactionsProcessed} transactions processed.` });
    } else {
      toast({ title: "❌ Upload failed", description: result.errors.join('; ') });
    }
  }

  return (
    <div className="w-full">
      <FileUploadZone onFilesSelected={handleFiles} />
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
