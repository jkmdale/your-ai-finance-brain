
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
        console.log('🔵 Auth state changed:', event, session?.user?.email);
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
      console.log('🔵 Initial session:', session?.user?.email);
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
      console.log('🔵 Checking additional auth methods for user:', userId);
      
      // Check for PIN
      const { data: pinData, error: pinError } = await supabase
        .from('user_pins')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (pinError) {
        console.error('❌ Error checking PIN:', pinError);
      } else {
        const hasPinAuth = !!pinData;
        console.log('🔵 User has PIN auth:', hasPinAuth);
        setHasPin(hasPinAuth);
      }

      // Check for biometric
      const { data: biometricData, error: biometricError } = await supabase
        .from('biometric_credentials')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (biometricError) {
        console.error('❌ Error checking biometric:', biometricError);
      } else {
        const hasBiometricAuth = !!biometricData;
        console.log('🔵 User has biometric auth:', hasBiometricAuth);
        setHasBiometric(hasBiometricAuth);
      }
    } catch (error) {
      console.error('❌ Error checking additional auth methods:', error);
    }
  };

  const setupPin = async (pin: string) => {
    console.log('🔵 Setting up PIN for user:', user?.email);
    
    if (!user) {
      console.error('❌ No authenticated user for PIN setup');
      return { error: 'No authenticated user' };
    }

    const result = await pinAuthService.setupPin(pin, user);
    
    if (result.error === null) {
      console.log('✅ PIN setup successful, updating hasPin state');
      setHasPin(true);
      // Refresh auth methods to ensure consistency
      await checkAdditionalAuthMethods(user.id);
    } else {
      console.error('❌ PIN setup failed:', result.error);
    }
    
    return result;
  };

  const setupBiometric = async () => {
    console.log('🔵 Setting up biometric for user:', user?.email);
    
    if (!user) {
      console.error('❌ No authenticated user for biometric setup');
      return { error: 'No authenticated user' };
    }

    const result = await biometricAuthService.setupBiometric(user);
    
    if (!result.error) {
      console.log('✅ Biometric setup successful, updating hasBiometric state');
      setHasBiometric(true);
      // Refresh auth methods to ensure consistency
      await checkAdditionalAuthMethods(user.id);
    } else {
      console.error('❌ Biometric setup failed:', result.error);
    }
    
    return result;
  };

  // New unlock-specific biometric function
  const unlockWithBiometric = async () => {
    if (!user) {
      return { error: 'No authenticated user' };
    }
    
    return await biometricAuthService.unlockWithBiometric(user.email || '', user.id);
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
      signInWithBiometric: unlockWithBiometric, // Use unlock method for existing interface
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
