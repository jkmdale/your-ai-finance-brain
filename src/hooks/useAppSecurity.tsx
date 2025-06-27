
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

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes - ONLY trigger for locking

export const AppSecurityProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [preferredUnlockMethod, setPreferredUnlockMethodState] = useState<'pin' | 'biometric' | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [isPinSetup, setIsPinSetup] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Simple pause mechanism - just a counter
  const pauseCountRef = useRef(0);

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

  // Simple check if locking is paused
  const isLockingPaused = useCallback(() => {
    return pauseCountRef.current > 0;
  }, []);

  // Simple pause function
  const pauseLocking = useCallback(() => {
    pauseCountRef.current++;
    console.log('🔓 Pausing app locking (count:', pauseCountRef.current, ')');
    
    // Clear any existing timer when pausing
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }
  }, [inactivityTimer]);

  // Simple resume function
  const resumeLocking = useCallback(() => {
    pauseCountRef.current = Math.max(0, pauseCountRef.current - 1);
    console.log('🔒 Resuming app locking (count:', pauseCountRef.current, ')');
    
    // If fully resumed and conditions are right, restart timer
    if (pauseCountRef.current === 0 && !isAppLocked && setupComplete) {
      resetInactivityTimer();
    }
  }, [isAppLocked, setupComplete]);

  // Reset inactivity timer - ONLY trigger for locking
  const resetInactivityTimer = useCallback(() => {
    // Don't set timer if not needed
    if (!setupComplete || isAppLocked || isLockingPaused()) {
      return;
    }
    
    // Clear existing timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    
    // Set new timer - ONLY lock after 5 minutes of inactivity
    const timer = setTimeout(() => {
      if (!isLockingPaused()) {
        console.log('🔒 App locked due to 5 minutes of inactivity');
        setIsAppLocked(true);
      }
    }, INACTIVITY_TIMEOUT);
    
    setInactivityTimer(timer);
  }, [setupComplete, isAppLocked, isLockingPaused, inactivityTimer]);

  // SIMPLIFIED activity monitoring - ONLY for inactivity timer
  useEffect(() => {
    if (!user || !setupComplete || isAppLocked || isLockingPaused()) {
      // Clear timer if conditions aren't right
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        setInactivityTimer(null);
      }
      return;
    }

    const activities = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'touchmove', 'click', 'wheel'
    ];
    
    // Activity handler - just reset the inactivity timer
    const handleActivity = () => {
      if (!isLockingPaused()) {
        resetInactivityTimer();
      }
    };

    // Start the timer and add listeners
    resetInactivityTimer();

    activities.forEach(activity => {
      document.addEventListener(activity, handleActivity, { passive: true });
    });

    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, handleActivity);
      });
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    };
  }, [user, setupComplete, isAppLocked, resetInactivityTimer, inactivityTimer, isLockingPaused]);

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
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const lockApp = useCallback(() => {
    console.log('🔒 App locked manually');
    setIsAppLocked(true);
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }
  }, [inactivityTimer]);

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
