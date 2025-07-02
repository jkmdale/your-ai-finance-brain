import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAppSecurity } from './useAppSecurity';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useInactivityTimer = () => {
  const { lastActivity, setLastActivity } = useAppStore();
  const { lockApp } = useAppSecurity();

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, [setLastActivity]);

  const checkInactivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivity;
    
    if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
      console.log('🔒 Auto-locking app due to inactivity');
      lockApp();
    }
  }, [lastActivity, lockApp]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  // Set up inactivity checker
  useEffect(() => {
    const interval = setInterval(checkInactivity, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [checkInactivity]);

  return { updateActivity };
};