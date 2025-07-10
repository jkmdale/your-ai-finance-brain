
import React, { useCallback, useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface User {
  id: string;
  email?: string;
}

interface FileUploadZoneProps {
  user: User | null;
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

  return (
    <div className="relative">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={onOpenFilePicker}
        className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all duration-200 ${
          dragActive
            ? 'border-blue-400 bg-blue-500/20 scale-105'
            : uploading || !user || isPickerOpen
            ? 'border-white/20 bg-white/5 cursor-not-allowed'
            : 'border-white/40 bg-white/10 hover:bg-white/20 hover:border-white/60 cursor-pointer'
        }`}
      >
        <div className="text-center">
          {processing || isPickerOpen ? (
            <Loader2 className="w-8 h-8 text-white/60 mx-auto mb-2 animate-spin" />
          ) : (
            <div className="relative">
              <FileText className="w-8 h-8 text-white/60 mx-auto mb-2" />
              {dragActive && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full animate-pulse" />
              )}
            </div>
          )}
          <p className="text-white/80 font-medium">
            {processing ? 'Processing files via Supabase...' : 
             isPickerOpen ? 'Opening file picker...' :
             dragActive ? 'Drop CSV files here!' :
             !user ? 'Please log in to upload' : 'Click to upload or drag & drop CSV files'}
          </p>
          <p className="text-white/50 text-sm mt-1">
            {!user ? 'Authentication required' : 'Enhanced processing with detailed error reporting'}
          </p>
        </div>
      </div>
    </div>
  );
};
