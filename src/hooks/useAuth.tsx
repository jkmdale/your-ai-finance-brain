
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, additionalData?: { firstName?: string; lastName?: string; country?: string }) => Promise<{ error: any; needsConfirmation?: boolean; message?: string }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error: any }>;
  setupPin: (pin: string) => Promise<{ error: any }>;
  signInWithPin: (pin: string, email: string) => Promise<{ error: any }>;
  setupBiometric: () => Promise<{ error: any }>;
  signInWithBiometric: (email: string) => Promise<{ error: any }>;
  isBiometricAvailable: () => Promise<boolean>;
  getUserCapabilities: (email: string) => Promise<{ hasPin: boolean; hasBiometric: boolean }>;
  getUserPreference: (email: string) => Promise<string | null>;
  hasPin: boolean;
  hasBiometric: boolean;
}

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

  const getUserCapabilities = async (email: string): Promise<{ hasPin: boolean; hasBiometric: boolean }> => {
    try {
      // Check for PIN by email
      const { data: pinData } = await supabase
        .from('user_pins')
        .select('id')
        .eq('user_email', email)
        .single();

      // Check for biometric by email
      const { data: biometricData } = await supabase
        .from('biometric_credentials')
        .select('id')
        .eq('user_email', email)
        .single();

      return {
        hasPin: !!pinData,
        hasBiometric: !!biometricData
      };
    } catch (error) {
      console.log('Error checking user capabilities:', error);
      return { hasPin: false, hasBiometric: false };
    }
  };

  const getUserPreference = async (email: string): Promise<string | null> => {
    try {
      // First try to get from auth metadata
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      
      const targetUser = data.users?.find((u: any) => u.email === email);
      if (targetUser?.user_metadata?.login_preference) {
        return targetUser.user_metadata.login_preference as string;
      }
      
      // Fallback to localStorage if available
      return localStorage.getItem('preferredAuthMethod');
    } catch (error) {
      console.log('Error getting user preference:', error);
      return localStorage.getItem('preferredAuthMethod');
    }
  };

  const isBiometricAvailable = async (): Promise<boolean> => {
    // Check if we're in an iframe (like Lovable preview)
    if (window.self !== window.top) {
      console.log('Biometric authentication not available in iframe environment');
      return false;
    }

    // Check for HTTPS requirement
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.log('Biometric authentication requires HTTPS');
      return false;
    }

    if (!window.PublicKeyCredential) {
      console.log('WebAuthn not supported in this browser');
      return false;
    }
    
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log('Biometric authenticator available:', available);
      return available;
    } catch (error) {
      console.log('Biometric check failed:', error);
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.log('Sign in error:', error);
      
      // Check if it's an email confirmation issue
      if (error.message.includes('Email not confirmed') || 
          error.message.includes('Invalid login credentials')) {
        
        return { 
          error: { 
            ...error, 
            message: 'Invalid email or password. If you just signed up, please check your email for a confirmation link first.',
            needsConfirmation: true
          } 
        };
      }
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, additionalData?: { firstName?: string; lastName?: string; country?: string }) => {
    console.log('Attempting sign up for:', email, additionalData);
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: additionalData ? {
          first_name: additionalData.firstName,
          last_name: additionalData.lastName,
          country: additionalData.country
        } : undefined
      }
    });
    
    if (error) {
      console.log('Sign up error:', error);
      return { error };
    }
    
    // Check if user was created but needs confirmation
    if (data.user && !data.session) {
      return { 
        error: null, 
        needsConfirmation: true,
        message: 'Please check your email and click the confirmation link to complete your registration.'
      };
    }
    
    return { error: null };
  };

  const resendConfirmation = async (email: string) => {
    console.log('Resending confirmation for:', email);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    
    if (error) {
      console.log('Resend confirmation error:', error);
    }
    
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
      .upsert({ 
        user_id: user.id, 
        pin_hash: pinHash,
        user_email: user.email 
      });
    
    if (!error) {
      setHasPin(true);
    }
    
    return { error };
  };

  const signInWithPin = async (pin: string, email: string) => {
    console.log('Attempting PIN authentication for:', email);
    
    // Get the stored PIN hash for this user
    const { data: userData, error: userError } = await supabase
      .from('user_pins')
      .select('pin_hash, user_id')
      .eq('user_email', email)
      .single();

    if (userError || !userData) {
      console.log('No PIN found for user:', userError);
      return { error: 'No PIN set up for this account' };
    }

    // Hash the provided PIN and compare
    const providedPinHash = await hashPin(pin);
    
    if (providedPinHash !== userData.pin_hash) {
      console.log('PIN verification failed');
      return { error: 'Invalid PIN' };
    }

    console.log('PIN verification successful');
    return { error: null };
  };

  const setupBiometric = async () => {
    if (!user) return { error: 'No user logged in' };
    
    // Check if we're in an iframe first
    if (window.self !== window.top) {
      return { error: 'Biometric authentication is not available in preview mode. It will work when deployed or accessed directly.' };
    }

    // Check for HTTPS requirement
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      return { error: 'Biometric authentication requires HTTPS connection' };
    }

    const isAvailable = await isBiometricAvailable();
    if (!isAvailable) {
      return { error: 'Biometric authentication not available on this device' };
    }

    try {
      console.log('Starting biometric credential creation...');
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = new TextEncoder().encode(user.id);
      
      const publicKeyCredentialCreationOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: { 
            name: "SmartFinanceAI",
            id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname
          },
          user: {
            id: userId,
            name: user.email || '',
            displayName: user.email || ''
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" as const },
            { alg: -257, type: "public-key" as const }
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform" as const,
            userVerification: "required" as const,
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: "none" as const
        }
      };

      console.log('Creating credential with options:', publicKeyCredentialCreationOptions);
      
      const credential = await navigator.credentials.create(publicKeyCredentialCreationOptions) as PublicKeyCredential;

      console.log('Credential created:', credential);

      if (!credential || !credential.response) {
        console.log('No credential returned');
        return { error: 'Failed to create biometric credential' };
      }

      console.log('Storing credential in database...');
      const response = credential.response as AuthenticatorAttestationResponse;
      
      const credentialData = {
        user_id: user.id,
        user_email: user.email,
        credential_id: credential.id,
        public_key: JSON.stringify({
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          type: credential.type,
          response: {
            clientDataJSON: Array.from(new Uint8Array(response.clientDataJSON)),
            attestationObject: Array.from(new Uint8Array(response.attestationObject))
          }
        }),
        device_info: {
          userAgent: navigator.userAgent.substring(0, 100),
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from('biometric_credentials')
        .insert(credentialData);

      console.log('Database insert result:', { error });

      if (!error) {
        console.log('Biometric setup successful!');
        setHasBiometric(true);
        return { error: null };
      } else {
        console.log('Database error:', error);
        return { error: error.message || 'Failed to save biometric credential' };
      }
    } catch (error: any) {
      console.error('Biometric setup error:', error);
      
      // Provide user-friendly error messages
      if (error.name === 'NotAllowedError') {
        return { error: 'Biometric setup was cancelled or not allowed by your browser. Please try again and allow the permission when prompted.' };
      } else if (error.name === 'InvalidStateError') {
        return { error: 'A biometric credential already exists for this account.' };
      } else if (error.name === 'NotSupportedError') {
        return { error: 'Biometric authentication is not supported on this device.' };
      } else if (error.name === 'AbortError') {
        return { error: 'Biometric setup was cancelled or timed out.' };
      } else if (error.name === 'SecurityError') {
        return { error: 'Security error: Please ensure you are using HTTPS or localhost.' };
      }
      
      return { error: error.message || 'Biometric setup failed' };
    }
  };

  const signInWithBiometric = async (email: string) => {
    console.log('Attempting biometric authentication for:', email);

    // Check if we're in an iframe first
    if (window.self !== window.top) {
      return { error: 'Biometric authentication is not available in preview mode. It will work when deployed or accessed directly.' };
    }

    // Check for HTTPS requirement
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      return { error: 'Biometric authentication requires HTTPS connection' };
    }

    const isAvailable = await isBiometricAvailable();
    if (!isAvailable) {
      return { error: 'Biometric authentication not available' };
    }

    try {
      // First, get the stored credential for this user
      const { data: storedCredentials, error: fetchError } = await supabase
        .from('biometric_credentials')
        .select('credential_id, user_id, user_email')
        .eq('user_email', email);

      if (fetchError || !storedCredentials || storedCredentials.length === 0) {
        console.log('No biometric credentials found for user:', email, fetchError);
        return { error: 'No passkeys available for this account. Please set up biometric authentication first.' };
      }

      console.log('Found stored credentials:', storedCredentials.length);

      // Create the authentication request with allowCredentials
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      const publicKeyCredentialRequestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          userVerification: "required" as const,
          timeout: 60000,
          rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
          // Include the stored credential IDs to help the browser find the right passkey
          allowCredentials: storedCredentials.map(cred => ({
            id: new TextEncoder().encode(cred.credential_id),
            type: "public-key" as const
          }))
        }
      };
      
      console.log('Requesting biometric authentication...');
      const assertion = await navigator.credentials.get(publicKeyCredentialRequestOptions) as PublicKeyCredential;

      if (!assertion) {
        return { error: 'Biometric authentication cancelled' };
      }

      console.log('Biometric authentication successful, credential ID:', assertion.id);

      // Verify the credential ID matches one of our stored credentials
      const matchingCredential = storedCredentials.find(cred => cred.credential_id === assertion.id);
      
      if (!matchingCredential) {
        console.log('Credential not found in database');
        return { error: 'Biometric authentication failed - credential not recognized' };
      }

      console.log('Credential verified, user ID:', matchingCredential.user_id);

      // Create session token for the authenticated user
      try {
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        const { error: sessionError } = await supabase
          .from('user_sessions')
          .insert({
            user_id: matchingCredential.user_id,
            session_token: sessionToken,
            auth_method: 'biometric',
            expires_at: expiresAt.toISOString()
          });

        if (sessionError) {
          console.log('Session creation error:', sessionError);
        }

        console.log('Biometric authentication successful for user:', matchingCredential.user_id);
        return { error: null };
      } catch (sessionError) {
        console.log('Session creation error:', sessionError);
        return { error: 'Authentication failed' };
      }
    } catch (error: any) {
      console.error('Biometric sign-in error:', error);
      
      if (error.name === 'NotAllowedError') {
        return { error: 'Biometric authentication was cancelled or not allowed' };
      } else if (error.name === 'SecurityError') {
        return { error: 'Security error: Please ensure you are using HTTPS or localhost' };
      } else if (error.name === 'InvalidStateError') {
        return { error: 'No passkeys available for this account. Please set up biometric authentication first.' };
      }
      
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
      getUserCapabilities,
      getUserPreference,
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
