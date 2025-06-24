
import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AppSecurityContextType {
  isAppLocked: boolean;
  preferredUnlockMethod: 'pin' | 'biometric' | null;
  setPreferredUnlockMethod: (method: 'pin' | 'biometric') => void;
  unlockApp: () => void;
  lockApp: () => void;
  setupComplete: boolean;
  setSetupComplete: (complete: boolean) => void;
  resetInactivityTimer: () => void;
  isPinSetup: boolean;
  setIsPinSetup: (setup: boolean) => void;
}

const AppSecurityContext = createContext<AppSecurityContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export const AppSecurityProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [preferredUnlockMethod, setPreferredUnlockMethodState] = useState<'pin' | 'biometric' | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [isPinSetup, setIsPinSetup] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);

  // Initialize security settings from localStorage
  useEffect(() => {
    if (user) {
      const storedMethod = localStorage.getItem(`security_method_${user.id}`) as 'pin' | 'biometric' | null;
      const storedSetupComplete = localStorage.getItem(`security_setup_${user.id}`) === 'true';
      const storedPinSetup = localStorage.getItem(`pin_setup_${user.id}`) === 'true';
      
      setPreferredUnlockMethodState(storedMethod);
      setSetupComplete(storedSetupComplete);
      setIsPinSetup(storedPinSetup);
      
      // Lock app initially if setup is complete
      if (storedSetupComplete) {
        setIsAppLocked(true);
      }
    }
  }, [user]);

  // Set up activity listeners
  useEffect(() => {
    if (!user || !setupComplete) return;

    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      const timer = setTimeout(() => {
        setIsAppLocked(true);
      }, INACTIVITY_TIMEOUT);
      
      setInactivityTimer(timer);
    };

    // Set initial timer
    resetTimer();

    // Add event listeners
    activities.forEach(activity => {
      document.addEventListener(activity, resetTimer, true);
    });

    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      activities.forEach(activity => {
        document.removeEventListener(activity, resetTimer, true);
      });
    };
  }, [user, setupComplete, inactivityTimer]);

  // Handle page visibility change (app switching)
  useEffect(() => {
    if (!user || !setupComplete) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App is hidden, start a shorter timer
        if (inactivityTimer) {
          clearTimeout(inactivityTimer);
        }
        const timer = setTimeout(() => {
          setIsAppLocked(true);
        }, 1000); // Lock after 1 second when app is hidden
        setInactivityTimer(timer);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, setupComplete, inactivityTimer]);

  const setPreferredUnlockMethod = useCallback((method: 'pin' | 'biometric') => {
    if (user) {
      setPreferredUnlockMethodState(method);
      localStorage.setItem(`security_method_${user.id}`, method);
    }
  }, [user]);

  const unlockApp = useCallback(() => {
    setIsAppLocked(false);
  }, []);

  const lockApp = useCallback(() => {
    setIsAppLocked(true);
  }, []);

  const setSetupCompleteState = useCallback((complete: boolean) => {
    if (user) {
      setSetupComplete(complete);
      localStorage.setItem(`security_setup_${user.id}`, complete.toString());
    }
  }, [user]);

  const setIsPinSetupState = useCallback((setup: boolean) => {
    if (user) {
      setIsPinSetup(setup);
      localStorage.setItem(`pin_setup_${user.id}`, setup.toString());
    }
  }, [user]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    
    if (setupComplete && !isAppLocked) {
      const timer = setTimeout(() => {
        setIsAppLocked(true);
      }, INACTIVITY_TIMEOUT);
      setInactivityTimer(timer);
    }
  }, [inactivityTimer, setupComplete, isAppLocked]);

  return (
    <AppSecurityContext.Provider value={{
      isAppLocked,
      preferredUnlockMethod,
      setPreferredUnlockMethod,
      unlockApp,
      lockApp,
      setupComplete,
      setSetupComplete: setSetupCompleteState,
      resetInactivityTimer,
      isPinSetup,
      setIsPinSetup: setIsPinSetupState
    }}>
      {children}
    </AppSecurityContext.Provider>
  );
};

export const useAppSecurity = () => {
  const context = useContext(AppSecurityContext);
  if (context === undefined) {
    throw new Error('useAppSecurity must be used within an AppSecurityProvider');
  }
  return context;
};
