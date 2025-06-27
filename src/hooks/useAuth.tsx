
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType } from './auth/types';
import { authService } from './auth/authService';
import { pinAuthService } from './auth/pinAuthService';
import { biometricAuthService } from './auth/biometricAuthService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    // First check if there's likely a session to avoid unnecessary loading
    const hasStoredSession = localStorage.getItem('sb-gzznuwtxyyaqlbbrxsuz-auth-token');
    
    if (hasStoredSession) {
      setLoading(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Check for additional auth methods when user is authenticated
        if (session?.user) {
          setTimeout(() => {
            checkAdditionalAuthMethods(session.user.id);
          }, 0);
        } else {
          setHasPin(false);
          setHasBiometric(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        checkAdditionalAuthMethods(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdditionalAuthMethods = async (userId: string) => {
    try {
      // Check for PIN
      const { data: pinData } = await supabase
        .from('user_pins')
        .select('id')
        .eq('user_id', userId)
        .single();
      setHasPin(!!pinData);

      // Check for biometric
      const { data: biometricData } = await supabase
        .from('biometric_credentials')
        .select('id')
        .eq('user_id', userId)
        .single();
      setHasBiometric(!!biometricData);
    } catch (error) {
      console.log('Error checking additional auth methods:', error);
    }
  };

  const setupPin = async (pin: string) => {
    const result = await pinAuthService.setupPin(pin, user);
    if (result.error === null) {
      setHasPin(true);
    }
    return result;
  };

  const setupBiometric = async () => {
    const result = await biometricAuthService.setupBiometric(user);
    if (!result.error) {
      setHasBiometric(true);
    }
    return result;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn: authService.signIn,
      signUp: authService.signUp,
      signOut: authService.signOut,
      resendConfirmation: authService.resendConfirmation,
      setupPin,
      signInWithPin: pinAuthService.signInWithPin,
      setupBiometric,
      signInWithBiometric: biometricAuthService.signInWithBiometric,
      isBiometricAvailable: biometricAuthService.isBiometricAvailable,
      getUserCapabilities: authService.getUserCapabilities,
      getUserPreference: authService.getUserPreference,
      hasPin,
      hasBiometric
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
