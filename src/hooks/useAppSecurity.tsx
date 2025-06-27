
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
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLockedByInactivityRef = useRef(false);

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

  // Clear timer function
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      console.log('⏰ Clearing inactivity timer');
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  // Start inactivity timer
  const startInactivityTimer = useCallback(() => {
    // Don't start timer if not setup, already locked, or app is hidden
    if (!setupComplete || isAppLocked || document.hidden) {
      return;
    }

    clearInactivityTimer();
    
    console.log('⏰ Starting 5-minute inactivity timer');
    inactivityTimerRef.current = setTimeout(() => {
      console.log('🔒 Locking app due to 5 minutes of inactivity');
      isLockedByInactivityRef.current = true;
      setIsAppLocked(true);
    }, INACTIVITY_TIMEOUT);
  }, [setupComplete, isAppLocked, clearInactivityTimer]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    if (!setupComplete) return;

    if (document.hidden) {
      // App became hidden - start the timer
      console.log('📱 App hidden - starting inactivity timer');
      startInactivityTimer();
    } else {
      // App became visible - cancel timer if running
      console.log('📱 App visible - canceling inactivity timer');
      clearInactivityTimer();
    }
  }, [setupComplete, startInactivityTimer, clearInactivityTimer]);

  // Handle user activity
  const handleUserActivity = useCallback(() => {
    if (!setupComplete || isAppLocked || document.hidden) return;

    // Reset the timer on user activity
    startInactivityTimer();
  }, [setupComplete, isAppLocked, startInactivityTimer]);

  // Setup visibility and activity listeners
  useEffect(() => {
    if (!user || !setupComplete) {
      clearInactivityTimer();
      return;
    }

    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll',
      'touchstart', 'touchmove', 'click', 'wheel'
    ];

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Add activity listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Start initial timer if app is visible
    if (!document.hidden && !isAppLocked) {
      startInactivityTimer();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      clearInactivityTimer();
    };
  }, [user, setupComplete, isAppLocked, handleVisibilityChange, handleUserActivity, startInactivityTimer, clearInactivityTimer]);

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
    isLockedByInactivityRef.current = false;
    setIsAppLocked(false);
    
    // Start timer if app is currently visible
    if (!document.hidden) {
      startInactivityTimer();
    }
  }, [startInactivityTimer]);

  const lockApp = useCallback(() => {
    console.log('🔒 App locked manually');
    setIsAppLocked(true);
    clearInactivityTimer();
  }, [clearInactivityTimer]);

  const resetInactivityTimer = useCallback(() => {
    if (!document.hidden && !isAppLocked) {
      startInactivityTimer();
    }
  }, [startInactivityTimer, isAppLocked]);

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

  // Legacy functions for compatibility (no-op)
  const pauseLocking = useCallback(() => {
    console.log('⏸️ pauseLocking called (no-op in new implementation)');
  }, []);

  const resumeLocking = useCallback(() => {
    console.log('▶️ resumeLocking called (no-op in new implementation)');
  }, []);

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
