
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, validateAuthState } from '@/integrations/supabase/client';
import { AuthContextType } from './auth/types';
import { authService } from './auth/authService';
import { pinAuthService } from './auth/pinAuthService';
import { biometricAuthService } from './auth/biometricAuthService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Start as loading
  const [hasPin, setHasPin] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // ✅ FIXED: Single source of truth for auth state with proper initialization
    const initializeAuth = async () => {
      try {
        console.log('🔵 Initializing auth state...');
        
        // Validate current auth state first
        const authResult = await validateAuthState();
        
        if (isMounted) {
          if (authResult.valid) {
            console.log('✅ Valid auth state found:', authResult.user?.email);
            setSession(authResult.session);
            setUser(authResult.user);
            
            // Check additional auth methods
            if (authResult.user?.id) {
              await checkAdditionalAuthMethods(authResult.user.id);
            }
          } else {
            console.log('❌ No valid auth state found');
            setSession(null);
            setUser(null);
            setHasPin(false);
            setHasBiometric(false);
          }
          
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setHasPin(false);
          setHasBiometric(false);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // ✅ FIXED: Enhanced auth state change listener for PWA/mobile scenarios
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (import.meta.env.DEV) {
          console.log('🔵 Auth state changed:', event, session?.user?.email);
        }
        
        if (!isMounted) return;

        // Handle specific auth events for PWA/mobile scenarios
        if (event === 'TOKEN_REFRESHED' && session) {
          if (import.meta.env.DEV) {
            console.log('🔄 Token refreshed successfully');
          }
        }
        
        if (event === 'SIGNED_OUT') {
          if (import.meta.env.DEV) {
            console.log('🚪 User signed out');
          }
          // Clear all local state
          setSession(null);
          setUser(null);
          setHasPin(false);
          setHasBiometric(false);
          setLoading(false);
          return;
        }

        // Update state based on auth change
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only set loading to false if we were loading
        if (loading) {
          setLoading(false);
        }

        // Check for additional auth methods when user is authenticated
        if (session?.user) {
          try {
            await checkAdditionalAuthMethods(session.user.id);
          } catch (error) {
            console.error('❌ Error checking additional auth methods:', error);
          }
        } else {
          setHasPin(false);
          setHasBiometric(false);
        }
      }
    );

    // Initialize auth state
    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array to run once

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
