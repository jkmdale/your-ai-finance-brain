
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

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (!setupComplete || isAppLocked) return;
    
    clearAllTimers();
    
    const timer = setTimeout(() => {
      console.log('App locked due to inactivity');
      setIsAppLocked(true);
    }, INACTIVITY_TIMEOUT);
    
    setInactivityTimer(timer);
  }, [setupComplete, isAppLocked, clearAllTimers]);

  // Set up activity listeners for inactivity detection
  useEffect(() => {
    if (!user || !setupComplete || isAppLocked) {
      clearAllTimers();
      return;
    }

    const activities = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'touchmove', 'click', 'wheel'
    ];
    
    // Reset timer on any activity
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Set initial timer
    resetInactivityTimer();

    // Add event listeners
    activities.forEach(activity => {
      document.addEventListener(activity, handleActivity, { passive: true });
    });

    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, handleActivity);
      });
      clearAllTimers();
    };
  }, [user, setupComplete, isAppLocked, resetInactivityTimer, clearAllTimers]);

  // Handle page visibility change (tab switching, app backgrounding)
  useEffect(() => {
    if (!user || !setupComplete) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App is hidden/backgrounded
        console.log('App hidden, starting background timer');
        clearAllTimers();
        
        const timer = setTimeout(() => {
          console.log('App locked due to background time');
          setIsAppLocked(true);
        }, APP_SWITCH_LOCK_DELAY);
        
        setVisibilityTimer(timer);
      } else {
        // App is visible again
        console.log('App visible again');
        if (visibilityTimer) {
          clearTimeout(visibilityTimer);
          setVisibilityTimer(null);
        }
        
        // Resume inactivity timer if app is not locked
        if (!isAppLocked) {
          resetInactivityTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle window focus/blur for desktop PWAs
    const handleFocus = () => {
      if (!document.hidden && !isAppLocked) {
        resetInactivityTimer();
      }
    };
    
    const handleBlur = () => {
      if (!document.hidden) {
        clearAllTimers();
        const timer = setTimeout(() => {
          setIsAppLocked(true);
        }, APP_SWITCH_LOCK_DELAY);
        setVisibilityTimer(timer);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearAllTimers();
    };
  }, [user, setupComplete, isAppLocked, resetInactivityTimer, visibilityTimer, clearAllTimers]);

  // Handle page unload/beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (setupComplete) {
        // Set app as locked in localStorage for next session
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
