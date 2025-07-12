
import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface FileUploadZoneProps {
  user: any;
  uploading: boolean;
  processing: boolean;
  isPickerOpen: boolean;
  onFilesSelected: (files: FileList) => void;
  onOpenFilePicker: () => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  user,
  uploading,
  processing,
  isPickerOpen,
  onFilesSelected,
  onOpenFilePicker
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleClick = useCallback(() => {
    if (!user || uploading || processing || isPickerOpen) return;
    onOpenFilePicker();
    fileInputRef.current?.click();
  }, [user, uploading, processing, isPickerOpen, onOpenFilePicker]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  }, [onFilesSelected]);

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`flex items-center justify-center w-full min-h-32 py-8 border-2 border-dashed rounded-xl transition-all duration-200 ${
          dragActive
            ? 'border-blue-400 bg-blue-500/30 scale-105 shadow-lg shadow-blue-500/25'
            : uploading || !user || isPickerOpen
            ? 'border-white/30 bg-white/10 cursor-not-allowed opacity-75'
            : 'border-white/50 bg-white/20 hover:bg-white/30 hover:border-white/70 hover:scale-105 cursor-pointer shadow-lg hover:shadow-xl'
        }`}
      >
        <div className="text-center px-4">
          {processing || isPickerOpen ? (
            <Loader2 className="w-12 h-12 text-blue-300 mx-auto mb-3 animate-spin" />
          ) : (
            <div className="relative">
              <div className="p-3 bg-white/20 rounded-full mx-auto mb-3 w-fit">
                <Upload className="w-8 h-8 text-white" />
              </div>
              {dragActive && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full animate-pulse" />
              )}
            </div>
          )}
          <p className="text-white font-semibold text-lg mb-1">
            {processing ? 'Processing files via Supabase...' : 
             isPickerOpen ? 'Opening file picker...' :
             dragActive ? 'Drop CSV files here!' :
             !user ? 'Please log in to upload' : 'Upload CSV Here'}
          </p>
          <p className="text-white/70 text-sm">
            {!user ? 'Authentication required' : 
             dragActive ? 'Release to upload your financial data' :
             'Click to browse or drag & drop CSV files'}
          </p>
          <p className="text-white/50 text-xs mt-2">
            Supports bank statements, transaction exports, and financial data
          </p>
        </div>
      </div>
    </div>
  );
};
