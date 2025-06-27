
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
    console.log('📁 Opening file picker, pausing security');
    
    // Pause locking immediately
    pauseLocking();
    lockingPausedRef.current = true;
    setIsPickerOpen(true);

    // Create or reuse file input
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
    
    // Handle file selection
    const handleFileSelect = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      
      console.log('📁 Files selected:', files?.length || 0);
      setIsPickerOpen(false);
      
      if (files && files.length > 0 && options.onFilesSelected) {
        options.onFilesSelected(files);
      }
      
      // Resume locking after file selection with delay for processing
      setTimeout(() => {
        if (lockingPausedRef.current) {
          console.log('🔒 Resuming security after file selection');
          resumeLocking();
          lockingPausedRef.current = false;
        }
      }, 3000); // 3 second delay for file processing
      
      cleanup();
    };

    // Handle cancellation
    const handleCancel = () => {
      console.log('❌ File picker cancelled');
      setIsPickerOpen(false);
      
      // Resume locking after cancellation
      setTimeout(() => {
        if (lockingPausedRef.current) {
          console.log('🔒 Resuming security after cancellation');
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
      input.value = ''; // Clear for reuse
    };

    // Detect cancellation via window focus
    const handleWindowFocus = () => {
      setTimeout(() => {
        if (isPickerOpen && (!input.files || input.files.length === 0)) {
          console.log('🔍 File picker cancelled (focus without files)');
          handleCancel();
        }
      }, 500);
    };

    // Add event listeners
    input.addEventListener('change', handleFileSelect);
    input.addEventListener('cancel', handleCancel);
    
    // Delay focus listener to avoid immediate triggering
    setTimeout(() => {
      window.addEventListener('focus', handleWindowFocus, { once: true });
    }, 200);

    // Open the file picker
    setTimeout(() => {
      input.click();
    }, 50);

  }, [options, pauseLocking, resumeLocking, isPickerOpen]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (fileInputRef.current) {
      if (document.body.contains(fileInputRef.current)) {
        document.body.removeChild(fileInputRef.current);
      }
      fileInputRef.current = null;
    }
    
    if (lockingPausedRef.current) {
      console.log('🔒 Cleanup: Resuming security');
      resumeLocking();
      lockingPausedRef.current = false;
    }

    setIsPickerOpen(false);
  }, [resumeLocking]);

  return {
    openFilePicker,
    isPickerOpen,
    cleanup
  };
};
