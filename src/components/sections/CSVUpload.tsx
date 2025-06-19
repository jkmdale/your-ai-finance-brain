
import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const CSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const { user } = useAuth();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.name.endsWith('.csv')) {
      setUploadStatus('error');
      setUploadMessage('Please upload a CSV file');
      return;
    }

    setUploading(true);
    setUploadStatus('idle');

    try {
      const text = await file.text();
      
      const { data, error } = await supabase.functions.invoke('process-csv', {
        body: { csvData: text }
      });

      if (error) throw error;

      setUploadStatus('success');
      setUploadMessage(`Successfully processed ${data.processed} transactions`);
      
      // Reset file input
      event.target.value = '';
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setUploadMessage(error.message || 'Failed to process CSV file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Import Transactions</h3>
          <p className="text-white/60 text-sm">Upload your bank CSV to automatically categorize transactions</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading || !user}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all duration-200 ${
              uploading || !user
                ? 'border-white/20 bg-white/5 cursor-not-allowed'
                : 'border-white/40 bg-white/10 hover:bg-white/20 hover:border-white/60 cursor-pointer'
            }`}
          >
            <div className="text-center">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-white/60 mx-auto mb-2 animate-spin" />
              ) : (
                <FileText className="w-8 h-8 text-white/60 mx-auto mb-2" />
              )}
              <p className="text-white/80 font-medium">
                {uploading ? 'Processing...' : 'Click to upload CSV file'}
              </p>
              <p className="text-white/50 text-sm mt-1">
                Supports standard bank CSV formats
              </p>
            </div>
          </label>
        </div>

        {uploadStatus !== 'idle' && (
          <div className={`flex items-center space-x-2 p-3 rounded-lg ${
            uploadStatus === 'success' 
              ? 'bg-green-500/20 border border-green-500/30' 
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            {uploadStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className={`text-sm ${
              uploadStatus === 'success' ? 'text-green-300' : 'text-red-300'
            }`}>
              {uploadMessage}
            </span>
          </div>
        )}

        <div className="bg-white/10 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">CSV Format Requirements:</h4>
          <ul className="text-white/70 text-sm space-y-1">
            <li>• Headers: Date, Description, Amount (Merchant optional)</li>
            <li>• Date format: YYYY-MM-DD or DD/MM/YYYY</li>
            <li>• Positive amounts for income, negative for expenses</li>
            <li>• Transactions will be automatically categorized</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
