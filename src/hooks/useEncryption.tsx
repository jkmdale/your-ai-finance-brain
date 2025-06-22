
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { keyManagerService } from '@/services/keyManagerService';

interface UseEncryptionReturn {
  isEncryptionReady: boolean;
  hasEncryptionKeys: boolean;
  isLoading: boolean;
  error: string | null;
  initializeEncryption: (password: string) => Promise<void>;
  unlockEncryption: (password: string) => Promise<void>;
  clearEncryption: () => void;
}

export const useEncryption = (): UseEncryptionReturn => {
  const { user } = useAuth();
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);
  const [hasEncryptionKeys, setHasEncryptionKeys] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has encryption keys when component mounts
  useEffect(() => {
    const checkEncryptionStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const hasKeys = await keyManagerService.hasEncryptionKeys(user.id);
        setHasEncryptionKeys(hasKeys);
        
        // If keys exist but encryption isn't ready, user needs to unlock
        if (hasKeys && !isEncryptionReady) {
          setError('Please unlock your encryption to access your data');
        }
      } catch (err) {
        console.error('Error checking encryption status:', err);
        setError('Failed to check encryption status');
      } finally {
        setIsLoading(false);
      }
    };

    checkEncryptionStatus();
  }, [user, isEncryptionReady]);

  // Initialize encryption for new users
  const initializeEncryption = useCallback(async (password: string) => {
    if (!user) throw new Error('User must be authenticated');

    setIsLoading(true);
    setError(null);

    try {
      await keyManagerService.initializeUserEncryption(user.id, password);
      setHasEncryptionKeys(true);
      setIsEncryptionReady(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize encryption';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Unlock encryption for existing users
  const unlockEncryption = useCallback(async (password: string) => {
    if (!user) throw new Error('User must be authenticated');

    setIsLoading(true);
    setError(null);

    try {
      await keyManagerService.loadUserKeys(user.id, password);
      setIsEncryptionReady(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unlock encryption';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Clear encryption (for logout)
  const clearEncryption = useCallback(() => {
    keyManagerService.clearKeys();
    setIsEncryptionReady(false);
    setHasEncryptionKeys(false);
    setError(null);
  }, []);

  // Clear encryption when user logs out
  useEffect(() => {
    if (!user) {
      clearEncryption();
    }
  }, [user, clearEncryption]);

  return {
    isEncryptionReady,
    hasEncryptionKeys,
    isLoading,
    error,
    initializeEncryption,
    unlockEncryption,
    clearEncryption
  };
};
