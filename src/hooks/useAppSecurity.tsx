
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
  const [isInitialized, setIsInitialized] = useState(false);
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize security settings from localStorage when user changes
  useEffect(() => {
    if (user && !isInitialized) {
      console.log('🔐 Initializing security settings for user:', user.email);
      
      const storedMethod = localStorage.getItem(`security_method_${user.id}`) as 'pin' | 'biometric' | null;
      const storedSetupComplete = localStorage.getItem(`security_setup_${user.id}`) === 'true';
      const storedPinSetup = localStorage.getItem(`pin_setup_${user.id}`) === 'true';
      
      console.log('🔐 Restored settings:', { storedMethod, storedSetupComplete, storedPinSetup });
      
      setPreferredUnlockMethodState(storedMethod);
      setSetupComplete(storedSetupComplete);
      setIsPinSetup(storedPinSetup);
      
      // Only lock app if setup is complete and we're returning from a previous session
      const wasLocked = localStorage.getItem(`app_locked_${user.id}`) === 'true';
      if (storedSetupComplete && wasLocked) {
        console.log('🔒 App was previously locked, locking now');
        setIsAppLocked(true);
        localStorage.removeItem(`app_locked_${user.id}`);
      } else if (storedSetupComplete) {
        // If setup is complete but app wasn't locked, don't lock immediately
        console.log('🔓 Setup complete but app wasn\'t locked previously');
        setIsAppLocked(false);
      }
      
      setIsInitialized(true);
    } else if (!user) {
      // Reset state when user logs out
      console.log('🔐 User logged out, resetting security state');
      setIsInitialized(false);
      setIsAppLocked(false);
      setPreferredUnlockMethodState(null);
      setSetupComplete(false);
      setIsPinSetup(false);
      clearInactivityTimer();
    }
  }, [user, isInitialized]);

  // Clear inactivity timer
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      console.log('⏰ Clearing inactivity timer');
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  // Start 5-minute inactivity timer
  const startInactivityTimer = useCallback(() => {
    // Only start timer if setup is complete and app is not already locked
    if (!setupComplete || isAppLocked) {
      return;
    }

    clearInactivityTimer();
    
    console.log('⏰ Starting 5-minute inactivity timer');
    inactivityTimerRef.current = setTimeout(() => {
      console.log('🔒 Locking app due to 5 minutes of inactivity');
      setIsAppLocked(true);
    }, INACTIVITY_TIMEOUT);
  }, [setupComplete, isAppLocked, clearInactivityTimer]);

  // Handle visibility change - start timer when hidden, clear when visible
  const handleVisibilityChange = useCallback(() => {
    if (!setupComplete) return;

    if (document.hidden) {
      // App became hidden - start the 5-minute timer
      console.log('📱 App hidden - starting 5-minute inactivity timer');
      startInactivityTimer();
    } else {
      // App became visible - cancel the timer (user is back)
      console.log('📱 App visible - canceling inactivity timer');
      clearInactivityTimer();
    }
  }, [setupComplete, startInactivityTimer, clearInactivityTimer]);

  // Handle user activity - cancel timer on any interaction
  const handleUserActivity = useCallback(() => {
    if (!setupComplete || isAppLocked) return;

    // Cancel timer on user activity (they're actively using the app)
    console.log('👆 User activity detected - canceling inactivity timer');
    clearInactivityTimer();
  }, [setupComplete, isAppLocked, clearInactivityTimer]);

  // Setup event listeners for visibility and user activity
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

    // Add activity listeners to cancel timer on user interaction
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      clearInactivityTimer();
    };
  }, [user, setupComplete, handleVisibilityChange, handleUserActivity, clearInactivityTimer]);

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

  const setPreferredUnlockMethod = useCallback((method: 'pin' | 'biometric') => {
    if (user) {
      console.log('🔐 Setting preferred unlock method:', method);
      setPreferredUnlockMethodState(method);
      localStorage.setItem(`security_method_${user.id}`, method);
    }
  }, [user]);

  const unlockApp = useCallback(() => {
    console.log('🔓 App unlocked');
    setIsAppLocked(false);
    clearInactivityTimer();
  }, [clearInactivityTimer]);

  const lockApp = useCallback(() => {
    console.log('🔒 App locked manually');
    setIsAppLocked(true);
    clearInactivityTimer();
  }, [clearInactivityTimer]);

  const resetInactivityTimer = useCallback(() => {
    // Reset timer only if app is visible and not locked
    if (!document.hidden && !isAppLocked && setupComplete) {
      startInactivityTimer();
    }
  }, [startInactivityTimer, isAppLocked, setupComplete]);

  const setSetupCompleteState = useCallback((complete: boolean) => {
    if (user) {
      console.log('🔐 Setting setup complete:', complete);
      setSetupComplete(complete);
      localStorage.setItem(`security_setup_${user.id}`, complete.toString());
      
      // Only lock immediately if this is the first time setup is being completed
      if (complete && !setupComplete) {
        console.log('🔒 First time setup complete, locking app');
        setIsAppLocked(true);
      }
    }
  }, [user, setupComplete]);

  const setIsPinSetupState = useCallback((setup: boolean) => {
    if (user) {
      console.log('🔐 Setting PIN setup:', setup);
      setIsPinSetup(setup);
      localStorage.setItem(`pin_setup_${user.id}`, setup.toString());
    }
  }, [user]);

  // Legacy compatibility functions (no-op)
  const pauseLocking = useCallback(() => {
    console.log('⏸️ pauseLocking called (legacy compatibility)');
  }, []);

  const resumeLocking = useCallback(() => {
    console.log('▶️ resumeLocking called (legacy compatibility)');
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
