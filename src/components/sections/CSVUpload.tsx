import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const CSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'processing'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileUpload = async (files: FileList) => {
    if (!user) {
      setUploadStatus('error');
      setUploadMessage('Please log in to upload CSV files');
      return;
    }

    if (!files.length) return;

    try {
      setUploading(true);
      setUploadStatus('processing');
      setUploadMessage('Processing CSV files...');

      let totalProcessed = 0;
      const allTransactions = [];

      for (const file of Array.from(files)) {
        const fileContent = await file.text();
        
        console.log(`📄 Processing file: ${file.name}`);
        
        const { data, error } = await supabase.functions.invoke('process-csv', {
          body: {
            csvData: fileContent,
            fileName: file.name
          }
        });

        if (error) {
          console.error('❌ Supabase function error:', error);
          throw new Error(`Processing failed: ${error.message}`);
        }

        if (data?.error) {
          console.error('❌ CSV processing error:', data.error);
          throw new Error(`Processing failed: ${data.error}`);
        }

        console.log(`✅ Processed ${data.processed} transactions from ${file.name}`);
        totalProcessed += data.processed || 0;
        
        if (data.transactions) {
          allTransactions.push(...data.transactions);
        }

        if (data.warnings?.length > 0) {
          console.warn('⚠️ Processing warnings:', data.warnings);
        }
      }

      // Dispatch event for dashboard to pick up
      window.dispatchEvent(new CustomEvent('csv-data-ready', {
        detail: {
          transactions: allTransactions,
          processed: totalProcessed
        }
      }));

      setUploading(false);
      setUploadStatus('success');
      setUploadMessage(`Successfully processed ${totalProcessed} transactions`);
      toast({ 
        title: '✅ CSV Processed', 
        description: `${totalProcessed} transactions imported successfully.` 
      });

    } catch (error) {
      console.error('❌ Upload error:', error);
      setUploading(false);
      setUploadStatus('error');
      setUploadMessage(error.message || 'Upload failed');
      toast({ 
        title: '❌ Upload Failed', 
        description: error.message || 'Please check your CSV format and try again.' 
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold mb-2">📂 Upload Your CSV Files</h2>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          type="file"
          accept=".csv"
          multiple
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
          id="csv-upload"
          disabled={uploading}
        />
        
        <label htmlFor="csv-upload" className="cursor-pointer">
          <div className="flex flex-col items-center space-y-2">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}
            
            <p className="text-sm font-medium text-gray-600">
              {uploading ? 'Processing...' : 'Click to upload or drag CSV files here'}
            </p>
            
            <p className="text-xs text-gray-500">
              Supports ANZ, ASB, BNZ, Westpac, Kiwibank formats
            </p>
          </div>
        </label>
      </div>

      {uploadStatus !== 'idle' && (
        <div className={`p-3 rounded-lg flex items-center space-x-2 ${
          uploadStatus === 'success' ? 'bg-green-50 text-green-700' :
          uploadStatus === 'error' ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {uploadStatus === 'success' && <CheckCircle className="w-4 h-4" />}
          {uploadStatus === 'error' && <AlertCircle className="w-4 h-4" />}
          {uploadStatus === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
          
          <span className="text-sm font-medium">{uploadMessage}</span>
        </div>
      )}
    </div>
  );
};