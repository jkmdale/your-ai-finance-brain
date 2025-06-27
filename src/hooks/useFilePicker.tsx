
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
  const securityPausedRef = useRef(false);

  const openFilePicker = useCallback(() => {
    console.log('📁 Opening file picker - PAUSING SECURITY COMPLETELY');
    
    // Pause security immediately and track it
    pauseLocking();
    securityPausedRef.current = true;
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
      
      // Resume security after a longer delay to ensure file processing completes
      setTimeout(() => {
        if (securityPausedRef.current) {
          console.log('🔒 Resuming security after file processing (10 second delay)');
          resumeLocking();
          securityPausedRef.current = false;
        }
      }, 10000); // 10 second delay for file processing
      
      cleanup();
    };

    // Handle cancellation
    const handleCancel = () => {
      console.log('❌ File picker cancelled');
      setIsPickerOpen(false);
      
      // Resume security after cancellation
      setTimeout(() => {
        if (securityPausedRef.current) {
          console.log('🔒 Resuming security after cancellation');
          resumeLocking();
          securityPausedRef.current = false;
        }
      }, 2000); // 2 second delay after cancellation
      
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
      }, 1000); // Increased delay to avoid false positives
    };

    // Add event listeners
    input.addEventListener('change', handleFileSelect);
    input.addEventListener('cancel', handleCancel);
    
    // Delay focus listener to avoid immediate triggering
    setTimeout(() => {
      window.addEventListener('focus', handleWindowFocus, { once: true });
    }, 500);

    // Open the file picker
    setTimeout(() => {
      input.click();
    }, 100);

  }, [options, pauseLocking, resumeLocking, isPickerOpen]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (fileInputRef.current) {
      if (document.body.contains(fileInputRef.current)) {
        document.body.removeChild(fileInputRef.current);
      }
      fileInputRef.current = null;
    }
    
    if (securityPausedRef.current) {
      console.log('🔒 Cleanup: Resuming security');
      resumeLocking();
      securityPausedRef.current = false;
    }

    setIsPickerOpen(false);
  }, [resumeLocking]);

  return {
    openFilePicker,
    isPickerOpen,
    cleanup
  };
};
