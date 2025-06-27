
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
  const [lockingPaused, setLockingPaused] = useState(false);
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityTimeRef = useRef<number>(Date.now());

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

  // Start inactivity timer
  const startInactivityTimer = useCallback(() => {
    // Only start timer if setup is complete, app is not locked, and locking is not paused
    if (!setupComplete || isAppLocked || lockingPaused) {
      return;
    }

    clearInactivityTimer();
    
    console.log('⏰ Starting inactivity timer for 5 minutes');
    inactivityTimerRef.current = setTimeout(() => {
      // Double-check conditions before locking
      if (setupComplete && !isAppLocked && !lockingPaused) {
        console.log('🔒 Locking app due to 5 minutes of inactivity');
        setIsAppLocked(true);
      }
    }, INACTIVITY_TIMEOUT);
  }, [setupComplete, isAppLocked, lockingPaused, clearInactivityTimer]);

  // Update last activity time and restart timer
  const updateActivity = useCallback(() => {
    if (!setupComplete || isAppLocked || lockingPaused) return;

    lastActivityTimeRef.current = Date.now();
    console.log('👆 User activity detected - restarting inactivity timer');
    startInactivityTimer();
  }, [setupComplete, isAppLocked, lockingPaused, startInactivityTimer]);

  // Handle visibility change - only check for inactivity when returning to visible
  const handleVisibilityChange = useCallback(() => {
    if (!setupComplete || lockingPaused) return;

    if (document.hidden) {
      // App became hidden - record the time but don't start timer yet
      console.log('📱 App hidden - recording time');
      lastActivityTimeRef.current = Date.now();
    } else {
      // App became visible - check if enough time has passed for inactivity
      console.log('📱 App visible - checking for inactivity');
      const timeSinceLastActivity = Date.now() - lastActivityTimeRef.current;
      
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        console.log('🔒 App was hidden for more than 5 minutes, locking now');
        setIsAppLocked(true);
      } else {
        console.log('📱 App was not hidden long enough, continuing normal operation');
        // Resume normal inactivity monitoring
        startInactivityTimer();
      }
    }
  }, [setupComplete, lockingPaused, startInactivityTimer]);

  // Setup event listeners for user activity and visibility
  useEffect(() => {
    if (!user || !setupComplete || lockingPaused) {
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
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Start initial timer when app is visible
    if (!document.hidden) {
      startInactivityTimer();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      clearInactivityTimer();
    };
  }, [user, setupComplete, lockingPaused, handleVisibilityChange, updateActivity, startInactivityTimer, clearInactivityTimer]);

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
    lastActivityTimeRef.current = Date.now();
    // Start monitoring for inactivity again
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
    updateActivity();
  }, [updateActivity]);

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

  const pauseLocking = useCallback(() => {
    console.log('⏸️ Pausing app locking');
    setLockingPaused(true);
    clearInactivityTimer();
  }, [clearInactivityTimer]);

  const resumeLocking = useCallback(() => {
    console.log('▶️ Resuming app locking');
    setLockingPaused(false);
    // Restart timer if app is visible and unlocked
    if (!document.hidden && !isAppLocked && setupComplete) {
      startInactivityTimer();
    }
  }, [isAppLocked, setupComplete, startInactivityTimer]);

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
