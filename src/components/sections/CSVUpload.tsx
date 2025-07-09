// src/components/sections/CSVUpload.tsx

import React, { useState } from 'react'; import { Upload, FileText, CheckCircle, AlertCircle, Brain, Loader2, TrendingUp, Target } from 'lucide-react'; import { useAuth } from '@/hooks/useAuth'; import { useToast } from '@/hooks/use-toast'; import { handleCSVUpload } from '../../../../scripts/core/csvProcessor.js'; // ✅ Make sure this path is correct

export const CSVUpload = () => { const [uploading, setUploading] = useState(false); const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'processing'>('idle'); const [uploadMessage, setUploadMessage] = useState(''); const [progress, setProgress] = useState(0); const { user } = useAuth(); const { toast } = useToast();

const handleFileUpload = async (files: FileList) => { if (!user) { setUploadStatus('error'); setUploadMessage('Please log in to upload CSV files'); return; }

try {
  setUploading(true);
  setUploadStatus('processing');
  setUploadMessage('Uploading and processing CSV...');

  await handleCSVUpload(files); // ✅ Call new working function

  setUploading(false);
  setUploadStatus('success');
  setUploadMessage('Upload and processing complete');
  toast({ title: '✅ CSV Processed', description: 'Budget and goals generated.' });
} catch (error) {
  console.error(error);
  setUploadStatus('error');
  setUploadMessage('Upload failed');
  toast({ title: '❌ Upload Failed', description: error.message });
}

};

return ( <div className="p-4"> <h2 className="text-xl font-semibold mb-2">📂 Upload Your CSV File</h2> <input type="file" accept=".csv" multiple onChange={(e) => handleFileUpload(e.target.files)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" /> {uploadStatus !== 'idle' && ( <p className="mt-2 text-sm"> {uploadStatus === 'processing' && 'Processing...'} {uploadStatus === 'success' && '✅ Success!'} {uploadStatus === 'error' && '❌ ' + uploadMessage} </p> )} </div> ); };
