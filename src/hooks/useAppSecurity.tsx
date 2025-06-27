
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
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Track if security is paused - when paused, NO timers should run
  const [isPaused, setIsPaused] = useState(false);
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

  // Pause function - completely stops all security timers
  const pauseLocking = useCallback(() => {
    pauseCountRef.current++;
    setIsPaused(true);
    
    console.log('🔓 PAUSING app security - all timers stopped (count:', pauseCountRef.current, ')');
    
    // Clear any existing timer immediately
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }
  }, [inactivityTimer]);

  // Resume function - only restarts timers when fully resumed
  const resumeLocking = useCallback(() => {
    pauseCountRef.current = Math.max(0, pauseCountRef.current - 1);
    
    if (pauseCountRef.current === 0) {
      setIsPaused(false);
      console.log('🔒 RESUMING app security - timers can restart');
      
      // Only restart timer if conditions are right
      if (!isAppLocked && setupComplete) {
        resetInactivityTimer();
      }
    } else {
      console.log('🔓 Security still paused (count:', pauseCountRef.current, ')');
    }
  }, [isAppLocked, setupComplete]);

  // Reset inactivity timer - only works when not paused
  const resetInactivityTimer = useCallback(() => {
    // Don't set timer if paused or conditions aren't met
    if (isPaused || !setupComplete || isAppLocked) {
      console.log('⏸️ Timer reset blocked - paused:', isPaused, 'setup:', setupComplete, 'locked:', isAppLocked);
      return;
    }
    
    // Clear existing timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    
    console.log('⏰ Starting 5-minute inactivity timer');
    
    // Set new timer
    const timer = setTimeout(() => {
      // Double-check we're not paused before locking
      if (!isPaused) {
        console.log('🔒 App locked due to 5 minutes of inactivity');
        setIsAppLocked(true);
      } else {
        console.log('🔓 Lock prevented - security is paused');
      }
    }, INACTIVITY_TIMEOUT);
    
    setInactivityTimer(timer);
  }, [setupComplete, isAppLocked, isPaused, inactivityTimer]);

  // Activity monitoring - only when not paused
  useEffect(() => {
    if (!user || !setupComplete || isAppLocked || isPaused) {
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
    
    // Activity handler - reset timer on user activity
    const handleActivity = () => {
      if (!isPaused) {
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
  }, [user, setupComplete, isAppLocked, isPaused, resetInactivityTimer, inactivityTimer]);

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
    if (!isPaused) {
      resetInactivityTimer();
    }
  }, [resetInactivityTimer, isPaused]);

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
