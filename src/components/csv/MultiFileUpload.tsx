import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { handleMultipleFiles, type UploadResult } from '@/modules/import/handleCsvUpload';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export const MultiFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setResults([]);
    
    try {
      const uploadResults = await handleMultipleFiles(files);
      setResults(uploadResults);
      
      const successful = uploadResults.filter(r => r.success);
      const failed = uploadResults.filter(r => !r.success);
      
      if (successful.length > 0) {
        toast.success(`✅ Successfully processed ${successful.length} file(s)`);
      }
      
      if (failed.length > 0) {
        toast.error(`❌ Failed to process ${failed.length} file(s)`);
      }
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Multi-File CSV Upload</h3>
          <p className="text-white/60 text-sm">Upload multiple bank CSV files at once</p>
        </div>
      </div>

      <div className="relative">
        <input
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileSelect}
          className="sr-only"
          id="multi-csv-upload"
          disabled={uploading}
        />
        <label
          htmlFor="multi-csv-upload"
          className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all duration-200 ${
            uploading
              ? 'border-white/20 bg-white/5 cursor-not-allowed'
              : 'border-white/40 bg-white/10 hover:bg-white/20 hover:border-white/60 cursor-pointer'
          }`}
        >
          <div className="text-center">
            <FileText className="w-8 h-8 text-white/60 mx-auto mb-2" />
            <p className="text-white/80 font-medium">
              {uploading ? 'Processing files...' : 'Click to select CSV files'}
            </p>
            <p className="text-white/50 text-sm mt-1">
              Supports ANZ, ASB, Westpac, Kiwibank, BNZ formats
            </p>
          </div>
        </label>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>Upload Results:</span>
            <span>
              {successCount} success, {failureCount} failed, {totalProcessed} transactions
            </span>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {results.map((result, index) => (
              <Alert
                key={index}
                className={`${
                  result.success 
                    ? 'border-green-500/50 bg-green-500/10' 
                    : 'border-red-500/50 bg-red-500/10'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
                <AlertDescription className="text-white/90">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{result.fileName}</span>
                    <span className="text-xs">
                      {result.success ? `${result.processed} transactions` : 'Failed'}
                    </span>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-1 text-xs text-red-300">
                      {result.errors.join(', ')}
                    </div>
                  )}
                  {result.warnings.length > 0 && (
                    <div className="mt-1 text-xs text-yellow-300">
                      Warnings: {result.warnings.join(', ')}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};