
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
const APP_SWITCH_LOCK_DELAY = 30 * 1000; // 30 seconds after app switch

export const AppSecurityProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [preferredUnlockMethod, setPreferredUnlockMethodState] = useState<'pin' | 'biometric' | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [isPinSetup, setIsPinSetup] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [visibilityTimer, setVisibilityTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Use refs for immediate synchronous access
  const securityDisabledRef = useRef(false);
  const pauseCountRef = useRef(0);
  const eventListenersActiveRef = useRef(false);

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

  // Clear all timers helper
  const clearAllTimers = useCallback(() => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }
    if (visibilityTimer) {
      clearTimeout(visibilityTimer);
      setVisibilityTimer(null);
    }
  }, [inactivityTimer, visibilityTimer]);

  // Check if security is effectively disabled - SYNCHRONOUS check
  const isSecurityDisabled = useCallback(() => {
    return securityDisabledRef.current || pauseCountRef.current > 0;
  }, []);

  // IMMEDIATE synchronous pause and resume functions
  const pauseLocking = useCallback(() => {
    pauseCountRef.current++;
    console.log('🔓 IMMEDIATELY pausing app locking (count:', pauseCountRef.current, ')');
    
    if (pauseCountRef.current === 1) {
      // First pause call - IMMEDIATELY disable all security
      securityDisabledRef.current = true;
      clearAllTimers();
      console.log('🔓 Security IMMEDIATELY DISABLED');
    }
  }, [clearAllTimers]);

  const resumeLocking = useCallback(() => {
    pauseCountRef.current = Math.max(0, pauseCountRef.current - 1);
    console.log('🔒 Resuming app locking (count:', pauseCountRef.current, ')');
    
    if (pauseCountRef.current === 0) {
      // Last resume call - re-enable security with delay
      setTimeout(() => {
        securityDisabledRef.current = false;
        console.log('🔒 Security monitoring RE-ENABLED');
        
        // Restart inactivity timer if conditions are right
        if (!isAppLocked && setupComplete) {
          resetInactivityTimer();
        }
      }, 1000); // Give time for any pending operations
    }
  }, [isAppLocked, setupComplete]);

  // Reset inactivity timer with immediate security check
  const resetInactivityTimer = useCallback(() => {
    if (!setupComplete || isAppLocked || isSecurityDisabled()) {
      return;
    }
    
    clearAllTimers();
    
    const timer = setTimeout(() => {
      if (!isSecurityDisabled()) {
        console.log('App locked due to inactivity');
        setIsAppLocked(true);
      }
    }, INACTIVITY_TIMEOUT);
    
    setInactivityTimer(timer);
  }, [setupComplete, isAppLocked, isSecurityDisabled, clearAllTimers]);

  // Activity listener setup with immediate security checks
  useEffect(() => {
    if (!user || !setupComplete || isAppLocked) {
      clearAllTimers();
      eventListenersActiveRef.current = false;
      return;
    }

    const activities = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'touchmove', 'click', 'wheel'
    ];
    
    // Activity handler with immediate security check
    const handleActivity = () => {
      if (!isSecurityDisabled()) {
        resetInactivityTimer();
      }
    };

    // Only set up listeners if security is not disabled
    if (!isSecurityDisabled()) {
      resetInactivityTimer();
      eventListenersActiveRef.current = true;

      activities.forEach(activity => {
        document.addEventListener(activity, handleActivity, { passive: true });
      });

      return () => {
        activities.forEach(activity => {
          document.removeEventListener(activity, handleActivity);
        });
        clearAllTimers();
        eventListenersActiveRef.current = false;
      };
    } else {
      eventListenersActiveRef.current = false;
    }
  }, [user, setupComplete, isAppLocked, resetInactivityTimer, clearAllTimers]);

  // Visibility change handler with immediate security checks
  useEffect(() => {
    if (!user || !setupComplete) {
      return;
    }

    const handleVisibilityChange = () => {
      // IMMEDIATE synchronous check
      if (isSecurityDisabled()) {
        console.log('👀 Visibility change ignored - security is disabled');
        return;
      }

      if (document.hidden) {
        console.log('🌙 App hidden, starting background timer');
        clearAllTimers();
        
        const timer = setTimeout(() => {
          if (!isSecurityDisabled()) {
            console.log('🔒 App locked due to background time');
            setIsAppLocked(true);
          }
        }, APP_SWITCH_LOCK_DELAY);
        
        setVisibilityTimer(timer);
      } else {
        console.log('☀️ App visible again');
        if (visibilityTimer) {
          clearTimeout(visibilityTimer);
          setVisibilityTimer(null);
        }
        
        if (!isAppLocked && !isSecurityDisabled()) {
          resetInactivityTimer();
        }
      }
    };

    const handleFocus = () => {
      if (!document.hidden && !isAppLocked && !isSecurityDisabled()) {
        resetInactivityTimer();
      }
    };
    
    const handleBlur = () => {
      if (!document.hidden && !isSecurityDisabled()) {
        clearAllTimers();
        const timer = setTimeout(() => {
          if (!isSecurityDisabled()) {
            setIsAppLocked(true);
          }
        }, APP_SWITCH_LOCK_DELAY);
        setVisibilityTimer(timer);
      }
    };

    // Only add listeners if security should be active
    if (!isSecurityDisabled()) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('blur', handleBlur);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('blur', handleBlur);
        clearAllTimers();
      };
    }
  }, [user, setupComplete, isAppLocked, resetInactivityTimer, visibilityTimer, clearAllTimers]);

  // Handle page unload/beforeunload
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
    console.log('App unlocked');
    setIsAppLocked(false);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const lockApp = useCallback(() => {
    console.log('App locked manually');
    setIsAppLocked(true);
    clearAllTimers();
  }, [clearAllTimers]);

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
