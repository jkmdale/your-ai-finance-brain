
import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
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
  pauseLocking: () => void;
  resumeLocking: () => void;
}

const AppSecurityContext = createContext<AppSecurityContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const AppSecurityProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [preferredUnlockMethod, setPreferredUnlockMethodState] = useState<'pin' | 'biometric' | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [isPinSetup, setIsPinSetup] = useState(false);
  
  // Single timer reference
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if security should be completely disabled (for file operations)
  const securityDisabledRef = useRef(false);
  const disableCountRef = useRef(0);

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

  // Clear any existing timer
  const clearTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  // Pause function - completely disables security
  const pauseLocking = useCallback(() => {
    disableCountRef.current++;
    securityDisabledRef.current = true;
    
    console.log('🔓 SECURITY COMPLETELY DISABLED - count:', disableCountRef.current);
    
    // Immediately clear any existing timer
    clearTimer();
  }, [clearTimer]);

  // Resume function - only re-enables when all pauses are cleared
  const resumeLocking = useCallback(() => {
    disableCountRef.current = Math.max(0, disableCountRef.current - 1);
    
    if (disableCountRef.current === 0) {
      securityDisabledRef.current = false;
      console.log('🔒 SECURITY RE-ENABLED - will start timer if conditions are right');
      
      // Only restart timer if we're not locked and setup is complete
      if (!isAppLocked && setupComplete) {
        startInactivityTimer();
      }
    } else {
      console.log('🔓 Security still disabled - count:', disableCountRef.current);
    }
  }, [isAppLocked, setupComplete]);

  // Start the inactivity timer - only if security is not disabled
  const startInactivityTimer = useCallback(() => {
    // Never start timer if security is disabled
    if (securityDisabledRef.current) {
      console.log('⏸️ Timer blocked - security is disabled');
      return;
    }
    
    // Don't start if not setup or already locked
    if (!setupComplete || isAppLocked) {
      console.log('⏸️ Timer blocked - setup:', setupComplete, 'locked:', isAppLocked);
      return;
    }
    
    // Clear any existing timer first
    clearTimer();
    
    console.log('⏰ Starting 5-minute inactivity timer');
    
    inactivityTimerRef.current = setTimeout(() => {
      // Final check - don't lock if security got disabled during the timeout
      if (!securityDisabledRef.current) {
        console.log('🔒 App locked due to 5 minutes of inactivity');
        setIsAppLocked(true);
      } else {
        console.log('🔓 Lock prevented - security was disabled during timeout');
      }
    }, INACTIVITY_TIMEOUT);
  }, [setupComplete, isAppLocked, clearTimer]);

  // Reset timer function - public interface
  const resetInactivityTimer = useCallback(() => {
    // Only reset if security is not disabled
    if (!securityDisabledRef.current) {
      startInactivityTimer();
    }
  }, [startInactivityTimer]);

  // Activity monitoring - only when security is enabled
  useEffect(() => {
    if (!user || !setupComplete || isAppLocked) {
      clearTimer();
      return;
    }

    const activities = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'touchmove', 'click', 'wheel'
    ];
    
    // Activity handler - only reset timer if security is enabled
    const handleActivity = () => {
      if (!securityDisabledRef.current) {
        startInactivityTimer();
      }
    };

    // Start initial timer
    startInactivityTimer();

    // Add activity listeners
    activities.forEach(activity => {
      document.addEventListener(activity, handleActivity, { passive: true });
    });

    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, handleActivity);
      });
      clearTimer();
    };
  }, [user, setupComplete, isAppLocked, startInactivityTimer, clearTimer]);

  // Handle page unload - save lock state
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (setupComplete) {
        localStorage.setItem(`app_locked_${user?.id}`, 'true');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [setupComplete, user]);

  // Check if app should be locked on load
  useEffect(() => {
    if (user && setupComplete) {
      const wasLocked = localStorage.getItem(`app_locked_${user.id}`) === 'true';
      if (wasLocked) {
        setIsAppLocked(true);
        localStorage.removeItem(`app_locked_${user.id}`);
      }
    }
  }, [user, setupComplete]);

  const setPreferredUnlockMethod = useCallback((method: 'pin' | 'biometric') => {
    if (user) {
      setPreferredUnlockMethodState(method);
      localStorage.setItem(`security_method_${user.id}`, method);
    }
  }, [user]);

  const unlockApp = useCallback(() => {
    console.log('🔓 App unlocked');
    setIsAppLocked(false);
    // Start timer only if security is not disabled
    if (!securityDisabledRef.current) {
      startInactivityTimer();
    }
  }, [startInactivityTimer]);

  const lockApp = useCallback(() => {
    console.log('🔒 App locked manually');
    setIsAppLocked(true);
    clearTimer();
  }, [clearTimer]);

  const setSetupCompleteState = useCallback((complete: boolean) => {
    if (user) {
      setSetupComplete(complete);
      localStorage.setItem(`security_setup_${user.id}`, complete.toString());
      
      if (complete) {
        setIsAppLocked(true);
      }
    }
  }, [user]);

  const setIsPinSetupState = useCallback((setup: boolean) => {
    if (user) {
      setIsPinSetup(setup);
      localStorage.setItem(`pin_setup_${user.id}`, setup.toString());
    }
  }, [user]);

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
      setIsPinSetup: setIsPinSetupState,
      pauseLocking,
      resumeLocking
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
