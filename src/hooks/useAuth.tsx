
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error: any }>;
  setupPin: (pin: string) => Promise<{ error: any }>;
  signInWithPin: (pin: string) => Promise<{ error: any }>;
  setupBiometric: () => Promise<{ error: any }>;
  signInWithBiometric: () => Promise<{ error: any }>;
  isBiometricAvailable: () => Promise<boolean>;
  hasPin: boolean;
  hasBiometric: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
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

  const isBiometricAvailable = async (): Promise<boolean> => {
    if (!window.PublicKeyCredential) {
      return false;
    }
    
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.log('Biometric check failed:', error);
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.log('Sign in error:', error);
      // Provide more specific error messages
      if (error.message.includes('Invalid login credentials')) {
        return { error: { ...error, message: 'Invalid email or password. Please check your credentials and try again.' } };
      } else if (error.message.includes('Email not confirmed')) {
        return { error: { ...error, message: 'Please check your email and click the confirmation link before signing in.' } };
      }
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      console.log('Sign up error:', error);
    }
    
    return { error };
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const setupPin = async (pin: string) => {
    if (!user) return { error: 'No user logged in' };
    
    const pinHash = await hashPin(pin);
    const { error } = await supabase
      .from('user_pins')
      .upsert({ user_id: user.id, pin_hash: pinHash });
    
    if (!error) {
      setHasPin(true);
    }
    
    return { error };
  };

  const signInWithPin = async (pin: string) => {
    if (!user) {
      return { error: 'Please sign in with email and password first to use PIN authentication' };
    }

    const pinHash = await hashPin(pin);
    const { data, error } = await supabase
      .from('user_pins')
      .select('user_id')
      .eq('pin_hash', pinHash)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return { error: 'Invalid PIN' };
    }

    return { error: null };
  };

  const setupBiometric = async () => {
    if (!user) return { error: 'No user logged in' };
    
    const isAvailable = await isBiometricAvailable();
    if (!isAvailable) {
      return { error: 'Biometric authentication not available on this device' };
    }

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { 
            name: "SmartFinanceAI",
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email || '',
            displayName: user.email || ''
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" }
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: "direct"
        }
      }) as PublicKeyCredential;

      if (!credential) {
        return { error: 'Failed to create biometric credential' };
      }

      const { error } = await supabase
        .from('biometric_credentials')
        .insert({
          user_id: user.id,
          credential_id: credential.id,
          public_key: JSON.stringify({
            id: credential.id,
            rawId: Array.from(new Uint8Array(credential.rawId)),
            type: credential.type,
            response: {
              clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
              attestationObject: Array.from(new Uint8Array((credential.response as AuthenticatorAttestationResponse).attestationObject))
            }
          }),
          device_name: navigator.userAgent.substring(0, 100)
        });

      if (!error) {
        setHasBiometric(true);
      }

      return { error };
    } catch (error: any) {
      console.error('Biometric setup error:', error);
      return { error: error.message || 'Biometric setup failed' };
    }
  };

  const signInWithBiometric = async () => {
    if (!user) {
      return { error: 'Please sign in with email and password first to use biometric authentication' };
    }

    const isAvailable = await isBiometricAvailable();
    if (!isAvailable) {
      return { error: 'Biometric authentication not available' };
    }

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          userVerification: "required",
          timeout: 60000
        }
      }) as PublicKeyCredential;

      if (!assertion) {
        return { error: 'Biometric authentication cancelled' };
      }

      const { data, error } = await supabase
        .from('biometric_credentials')
        .select('user_id')
        .eq('credential_id', assertion.id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return { error: 'Biometric authentication failed' };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Biometric sign-in error:', error);
      return { error: error.message || 'Biometric authentication failed' };
    }
  };

  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      resendConfirmation,
      setupPin,
      signInWithPin,
      setupBiometric,
      signInWithBiometric,
      isBiometricAvailable,
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
