
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

    // Create session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

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
    
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: "SmartFinanceAI" },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email || '',
            displayName: user.email || ''
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          }
        }
      }) as PublicKeyCredential;

      const { error } = await supabase
        .from('biometric_credentials')
        .insert({
          user_id: user.id,
          credential_id: credential.id,
          public_key: JSON.stringify(credential.response),
          device_name: navigator.userAgent
        });

      return { error };
    } catch (error) {
      return { error: 'Biometric setup failed' };
    }
  };

  const signInWithBiometric = async () => {
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          userVerification: "required"
        }
      }) as PublicKeyCredential;

      const { data, error } = await supabase
        .from('biometric_credentials')
        .select('user_id')
        .eq('credential_id', assertion.id)
        .single();

      if (error || !data) {
        return { error: 'Biometric authentication failed' };
      }

      // Create session token
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

      return { error: sessionError };
    } catch (error) {
      return { error: 'Biometric authentication failed' };
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
      signInWithBiometric
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
