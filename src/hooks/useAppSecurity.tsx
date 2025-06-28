
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
const VISIBILITY_GRACE_PERIOD = 2000; // 2 seconds grace period for quick app switches

export const AppSecurityProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [preferredUnlockMethod, setPreferredUnlockMethodState] = useState<'pin' | 'biometric' | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [isPinSetup, setIsPinSetup] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lockingPaused, setLockingPaused] = useState(false);
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityTimeRef = useRef<number>(Date.now());
  const isActivelyUsingAppRef = useRef<boolean>(true);

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
      
      // Only auto-lock if setup is complete and sufficient time has passed since last session
      const lastSessionTime = localStorage.getItem(`last_session_${user.id}`);
      const now = Date.now();
      
      if (storedSetupComplete && lastSessionTime) {
        const timeSinceLastSession = now - parseInt(lastSessionTime);
        if (timeSinceLastSession > INACTIVITY_TIMEOUT) {
          console.log('🔒 Sufficient time passed since last session, locking app');
          setIsAppLocked(true);
        } else {
          console.log('🔓 Recent session detected, keeping app unlocked');
        }
      }
      
      // Update last session time
      localStorage.setItem(`last_session_${user.id}`, now.toString());
      
      setIsInitialized(true);
    } else if (!user) {
      // Reset state when user logs out
      console.log('🔐 User logged out, resetting security state');
      setIsInitialized(false);
      setIsAppLocked(false);
      setPreferredUnlockMethodState(null);
      setSetupComplete(false);
      setIsPinSetup(false);
      clearTimers();
    }
  }, [user, isInitialized]);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      console.log('⏰ Clearing inactivity timer');
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (visibilityTimerRef.current) {
      console.log('⏰ Clearing visibility timer');
      clearTimeout(visibilityTimerRef.current);
      visibilityTimerRef.current = null;
    }
  }, []);

  // Start inactivity timer
  const startInactivityTimer = useCallback(() => {
    // Only start timer if setup is complete, app is not locked, and locking is not paused
    if (!setupComplete || isAppLocked || lockingPaused) {
      return;
    }

    clearTimers();
    
    console.log('⏰ Starting inactivity timer for 5 minutes');
    inactivityTimerRef.current = setTimeout(() => {
      // Double-check conditions before locking
      if (setupComplete && !isAppLocked && !lockingPaused && !document.hidden) {
        console.log('🔒 Locking app due to 5 minutes of inactivity');
        setIsAppLocked(true);
      }
    }, INACTIVITY_TIMEOUT);
  }, [setupComplete, isAppLocked, lockingPaused, clearTimers]);

  // Update last activity time and restart timer
  const updateActivity = useCallback(() => {
    if (!setupComplete || isAppLocked || lockingPaused) return;

    lastActivityTimeRef.current = Date.now();
    isActivelyUsingAppRef.current = true;
    
    // Only log activity if app is visible to avoid spam
    if (!document.hidden) {
      console.log('👆 User activity detected - restarting inactivity timer');
      startInactivityTimer();
    }
  }, [setupComplete, isAppLocked, lockingPaused, startInactivityTimer]);

  // Handle visibility change with improved logic
  const handleVisibilityChange = useCallback(() => {
    if (!setupComplete || lockingPaused) return;

    if (document.hidden) {
      // App became hidden - clear existing timers and record time
      console.log('📱 App hidden - pausing timers');
      clearTimers();
      lastActivityTimeRef.current = Date.now();
      isActivelyUsingAppRef.current = false;
    } else {
      // App became visible - check if we should lock or resume normal operation
      console.log('📱 App visible - checking inactivity');
      
      const timeSinceLastActivity = Date.now() - lastActivityTimeRef.current;
      
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        console.log('🔒 App was hidden for more than 5 minutes, locking now');
        setIsAppLocked(true);
      } else {
        console.log('📱 App was not hidden long enough, resuming normal operation');
        isActivelyUsingAppRef.current = true;
        
        // Give a small grace period before starting the timer to handle quick app switches
        visibilityTimerRef.current = setTimeout(() => {
          if (!document.hidden && !isAppLocked) {
            startInactivityTimer();
          }
        }, VISIBILITY_GRACE_PERIOD);
      }
    }
  }, [setupComplete, lockingPaused, startInactivityTimer, clearTimers, isAppLocked]);

  // Setup event listeners for user activity and visibility
  useEffect(() => {
    if (!user || !setupComplete || lockingPaused) {
      clearTimers();
      return;
    }

    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll',
      'touchstart', 'touchmove', 'click', 'wheel'
    ];

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Add activity listeners with throttling to prevent excessive timer resets
    let activityThrottle: NodeJS.Timeout | null = null;
    const throttledUpdateActivity = () => {
      if (activityThrottle) return;
      activityThrottle = setTimeout(() => {
        updateActivity();
        activityThrottle = null;
      }, 1000); // Throttle to once per second
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, { passive: true });
    });

    // Start initial timer when app is visible and active
    if (!document.hidden && isActivelyUsingAppRef.current) {
      startInactivityTimer();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity);
      });
      if (activityThrottle) {
        clearTimeout(activityThrottle);
      }
      clearTimers();
    };
  }, [user, setupComplete, lockingPaused, handleVisibilityChange, updateActivity, startInactivityTimer, clearTimers]);

  // Handle page unload - save session state
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && setupComplete) {
        localStorage.setItem(`last_session_${user.id}`, Date.now().toString());
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
    isActivelyUsingAppRef.current = true;
    
    // Start monitoring for inactivity again if app is visible
    if (!document.hidden) {
      startInactivityTimer();
    }
  }, [startInactivityTimer]);

  const lockApp = useCallback(() => {
    console.log('🔒 App locked manually');
    setIsAppLocked(true);
    isActivelyUsingAppRef.current = false;
    clearTimers();
  }, [clearTimers]);

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
    clearTimers();
  }, [clearTimers]);

  const resumeLocking = useCallback(() => {
    console.log('▶️ Resuming app locking');
    setLockingPaused(false);
    // Restart timer if app is visible, unlocked, and actively being used
    if (!document.hidden && !isAppLocked && setupComplete && isActivelyUsingAppRef.current) {
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
