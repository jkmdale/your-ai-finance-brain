import { useEffect } from 'react';
import { useAppSecurity } from './useAppSecurity';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const useSimpleInactivityTimer = () => {
  const { lockApp } = useAppSecurity();
  
  useEffect(() => {
    let lastActivity = Date.now();
    
    const updateActivity = () => {
      lastActivity = Date.now();
    };
    
    const checkInactivity = () => {
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        lockApp();
      }
    };
    
    // Add event listeners
    const events = ['mousedown', 'keypress', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity);
    });
    
    // Check every minute
    const interval = setInterval(checkInactivity, 60000);
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [lockApp]);
};