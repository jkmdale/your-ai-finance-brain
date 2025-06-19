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
  setupPin: (pin: string) => Promise<{ error: any }>;
  signInWithPin: (pin: string) => Promise<{ error: any }>;
  setupBiometric: () => Promise<{ error: any }>;
  signInWithBiometric: () => Promise<{ error: any }>;
  isBiometricAvailable: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    
    return { error };
  };

  const signInWithPin = async (pin: string) => {
    const pinHash = await hashPin(pin);
    const { data, error } = await supabase
      .from('user_pins')
      .select('user_id')
      .eq('pin_hash', pinHash)
      .single();

    if (error || !data) {
      return { error: 'Invalid PIN' };
    }

    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: data.user_id,
        session_token: sessionToken,
        auth_method: 'pin',
        expires_at: expiresAt.toISOString()
      });

    return { error: sessionError };
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
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" } // RS256
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

      return { error };
    } catch (error: any) {
      console.error('Biometric setup error:', error);
      return { error: error.message || 'Biometric setup failed' };
    }
  };

  const signInWithBiometric = async () => {
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
        .single();

      if (error || !data) {
        return { error: 'Biometric authentication failed' };
      }

      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const { error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: data.user_id,
          session_token: sessionToken,
          auth_method: 'biometric',
          expires_at: expiresAt.toISOString()
        });

      if (sessionError) {
        return { error: sessionError };
      }

      // Get the user data and create a session
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(data.user_id);
      
      if (userError || !userData.user) {
        return { error: 'Failed to authenticate user' };
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
      setupPin,
      signInWithPin,
      setupBiometric,
      signInWithBiometric,
      isBiometricAvailable
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
