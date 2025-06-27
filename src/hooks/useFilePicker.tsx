
import { useState, useCallback, useRef } from 'react';
import { useAppSecurity } from './useAppSecurity';

interface UseFilePickerOptions {
  accept?: string;
  multiple?: boolean;
  onFilesSelected?: (files: FileList) => void;
}

export const useFilePicker = (options: UseFilePickerOptions = {}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { pauseLocking, resumeLocking } = useAppSecurity();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lockingPausedRef = useRef(false);

  const openFilePicker = useCallback(() => {
    console.log('🔓 Opening file picker, disabling app security IMMEDIATELY');
    
    // Pause locking IMMEDIATELY before any other operations
    pauseLocking();
    lockingPausedRef.current = true;
    setIsPickerOpen(true);

    // Create or reuse file input SYNCHRONOUSLY
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.accept || '';
      input.multiple = options.multiple || false;
      input.style.display = 'none';
      document.body.appendChild(input);
      fileInputRef.current = input;
    }

    const input = fileInputRef.current;
    
    // Set up file picker event handlers
    const handleFileSelect = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      
      console.log('📁 Files selected:', files?.length || 0);
      setIsPickerOpen(false);
      
      if (files && files.length > 0 && options.onFilesSelected) {
        options.onFilesSelected(files);
      }
      
      // Resume locking after file selection with delay
      setTimeout(() => {
        if (lockingPausedRef.current) {
          console.log('🔒 Resuming app security after file selection');
          resumeLocking();
          lockingPausedRef.current = false;
        }
      }, 3000); // Longer delay to ensure file processing completes
      
      cleanup();
    };

    const handleCancel = () => {
      console.log('❌ File picker cancelled');
      setIsPickerOpen(false);
      
      // Resume locking after cancellation with delay
      setTimeout(() => {
        if (lockingPausedRef.current) {
          console.log('🔒 Resuming app security after cancellation');
          resumeLocking();
          lockingPausedRef.current = false;
        }
      }, 1000);
      
      cleanup();
    };

    const cleanup = () => {
      input.removeEventListener('change', handleFileSelect);
      input.removeEventListener('cancel', handleCancel);
      window.removeEventListener('focus', handleWindowFocus);
      // Don't remove the input element, reuse it
      input.value = ''; // Clear the value for next use
    };

    // Handle focus events to detect picker close without selection
    const handleWindowFocus = () => {
      // Only check for cancellation if picker was open and no files selected
      setTimeout(() => {
        if (isPickerOpen && !input.files?.length) {
          console.log('🔍 Window focused but no files selected, assuming cancelled');
          handleCancel();
        }
      }, 500);
    };

    // Add event listeners
    input.addEventListener('change', handleFileSelect);
    input.addEventListener('cancel', handleCancel);
    window.addEventListener('focus', handleWindowFocus, { once: true });

    // Trigger file picker IMMEDIATELY after setting up handlers
    input.click();
  }, [options, pauseLocking, resumeLocking, isPickerOpen]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (fileInputRef.current) {
      document.body.removeChild(fileInputRef.current);
      fileInputRef.current = null;
    }
    
    if (lockingPausedRef.current) {
      resumeLocking();
      lockingPausedRef.current = false;
    }
  }, [resumeLocking]);

  return {
    openFilePicker,
    isPickerOpen,
    cleanup
  };
};
