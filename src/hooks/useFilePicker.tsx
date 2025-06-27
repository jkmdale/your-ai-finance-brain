
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
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openFilePicker = useCallback(() => {
    console.log('🔓 IMMEDIATELY disabling app security before file picker');
    
    // STEP 1: Pause locking IMMEDIATELY and SYNCHRONOUSLY
    pauseLocking();
    lockingPausedRef.current = true;
    setIsPickerOpen(true);

    // STEP 2: Create or reuse file input
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
    
    // STEP 3: Set up handlers
    const handleFileSelect = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      
      console.log('📁 Files selected:', files?.length || 0);
      setIsPickerOpen(false);
      
      if (files && files.length > 0 && options.onFilesSelected) {
        options.onFilesSelected(files);
      }
      
      // Resume locking after successful selection with extended delay
      cleanupTimeoutRef.current = setTimeout(() => {
        if (lockingPausedRef.current) {
          console.log('🔒 Resuming app security after file selection');
          resumeLocking();
          lockingPausedRef.current = false;
        }
      }, 5000); // Longer delay for file processing
      
      cleanup();
    };

    const handleCancel = () => {
      console.log('❌ File picker cancelled');
      setIsPickerOpen(false);
      
      // Resume locking after cancellation with shorter delay
      cleanupTimeoutRef.current = setTimeout(() => {
        if (lockingPausedRef.current) {
          console.log('🔒 Resuming app security after cancellation');
          resumeLocking();
          lockingPausedRef.current = false;
        }
      }, 2000);
      
      cleanup();
    };

    const cleanup = () => {
      input.removeEventListener('change', handleFileSelect);
      input.removeEventListener('cancel', handleCancel);
      window.removeEventListener('focus', handleWindowFocus);
      input.value = ''; // Clear for reuse
    };

    // Enhanced cancellation detection
    const handleWindowFocus = () => {
      // Wait longer to ensure we don't interfere with file selection
      setTimeout(() => {
        // Only treat as cancellation if picker is still marked as open AND no files were selected
        if (isPickerOpen && (!input.files || input.files.length === 0)) {
          console.log('🔍 File picker likely cancelled (focus without files)');
          handleCancel();
        }
      }, 1000); // Increased delay
    };

    // STEP 4: Add event listeners
    input.addEventListener('change', handleFileSelect);
    input.addEventListener('cancel', handleCancel);
    
    // Delay the focus listener to avoid immediate triggering
    setTimeout(() => {
      window.addEventListener('focus', handleWindowFocus, { once: true });
    }, 500);

    // STEP 5: Trigger file picker LAST
    setTimeout(() => {
      input.click();
    }, 100); // Small delay to ensure all setup is complete

  }, [options, pauseLocking, resumeLocking, isPickerOpen]);

  // Enhanced cleanup on unmount
  const cleanup = useCallback(() => {
    // Clear any pending timeouts
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    // Remove file input if it exists
    if (fileInputRef.current) {
      if (document.body.contains(fileInputRef.current)) {
        document.body.removeChild(fileInputRef.current);
      }
      fileInputRef.current = null;
    }
    
    // Ensure locking is resumed if it was paused
    if (lockingPausedRef.current) {
      console.log('🔒 Cleanup: Resuming app security');
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
