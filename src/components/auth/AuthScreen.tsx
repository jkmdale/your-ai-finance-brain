
import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AuthMode, AuthScreenProps } from './types';
import { WelcomeScreen } from './WelcomeScreen';
import { EmailEntryForm } from './EmailEntryForm';
import { EmailPasswordForm } from './EmailPasswordForm';
import { EmailConfirmationScreen } from './EmailConfirmationScreen';
import { PinLoginForm } from './PinLoginForm';
import { BiometricLoginForm } from './BiometricLoginForm';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('email-entry');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [userCapabilities, setUserCapabilities] = useState({ hasPin: false, hasBiometric: false });
  const [userPreference, setUserPreference] = useState<string | null>(null);
  
  const { 
    signIn, 
    signUp, 
    signInWithPin, 
    signInWithBiometric, 
    isBiometricAvailable, 
    resendConfirmation, 
    getUserCapabilities,
    getUserPreference,
    user, 
    session 
  } = useAuth();

  console.log('AuthScreen render:', { mode, email, loading, user: !!user, session: !!session });

  // Check biometric availability
  useEffect(() => {
    const checkCapabilities = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      console.log('Biometric available:', available);
    };
    checkCapabilities();
  }, [isBiometricAvailable]);

  // Handle successful authentication
  useEffect(() => {
    if (user && session) {
      console.log('Authentication successful in AuthScreen');
      onAuthSuccess?.();
    }
  }, [user, session, onAuthSuccess]);

  const handleEmailAuth = async (isSignUp: boolean = false) => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    console.log('Attempting email auth:', { email, isSignUp });
    setLoading(true);
    
    if (isSignUp) {
      const result = await signUp(email, password);
      
      if (result.error) {
        console.log('Sign up error:', result.error);
        toast.error(result.error.message);
      } else if (result.needsConfirmation) {
        setPendingEmail(email);
        setMode('email-confirmation');
        toast.success(result.message || 'Account created! Please check your email to confirm.');
      } else {
        console.log('Sign up successful');
        toast.success('Account created and signed in successfully!');
        localStorage.setItem('preferredAuthMethod', 'email');
      }
    } else {
      const { error } = await signIn(email, password);
      
      if (error) {
        console.log('Sign in error:', error);
        if (error.needsConfirmation) {
          setPendingEmail(email);
          setMode('email-confirmation');
          toast.error(error.message);
        } else {
          toast.error(error.message);
        }
      } else {
        console.log('Sign in successful');
        toast.success('Welcome back!');
        localStorage.setItem('preferredAuthMethod', 'email');
      }
    }
    
    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!pendingEmail) return;
    
    setLoading(true);
    const { error } = await resendConfirmation(pendingEmail);
    
    if (error) {
      toast.error('Failed to resend confirmation email');
    } else {
      toast.success('Confirmation email sent! Please check your inbox.');
    }
    
    setLoading(false);
  };

  const handlePinComplete = async (pin: string) => {
    if (!email) {
      toast.error('Please enter your email first');
      return;
    }

    console.log('Attempting PIN authentication');
    setLoading(true);
    const { error } = await signInWithPin(pin, email);
    
    if (error) {
      console.log('PIN auth error:', error);
      toast.error('Invalid PIN');
      setTimeout(() => setLoading(false), 1000);
    } else {
      console.log('PIN auth successful');
      toast.success('Welcome back!');
      localStorage.setItem('preferredAuthMethod', 'pin');
    }
  };

  const handleBiometricAuth = async () => {
    if (!email) {
      toast.error('Please enter your email first');
      return;
    }

    if (!biometricAvailable) {
      toast.error('Biometric authentication is not available on this device');
      return;
    }

    console.log('Attempting biometric authentication');
    setLoading(true);
    const { error } = await signInWithBiometric(email);
    
    if (error) {
      console.log('Biometric auth error:', error);
      toast.error(error.message || 'Biometric authentication failed');
      setLoading(false);
    } else {
      console.log('Biometric auth successful');
      toast.success('Welcome back!');
      localStorage.setItem('preferredAuthMethod', 'biometric');
    }
  };

  const handleModeChange = (newMode: AuthMode) => {
    console.log('Mode change:', newMode);
    setMode(newMode);
    setLoading(false);
  };

  const handleEmailEntry = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    console.log('Checking user capabilities for email:', email);
    setLoading(true);
    
    try {
      const capabilities = await getUserCapabilities(email);
      const preference = await getUserPreference(email);
      
      console.log('User capabilities:', capabilities);
      console.log('User preference:', preference);
      
      setUserCapabilities(capabilities);
      setUserPreference(preference);
      
      if (capabilities.hasPin || capabilities.hasBiometric) {
        // User has alternative auth methods, show options
        setMode('welcome');
      } else {
        // User only has email/password, go directly to email auth
        setMode('email');
      }
    } catch (error) {
      console.error('Error checking user capabilities:', error);
      // If we can't check capabilities, default to email auth
      setMode('email');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <AnimatePresence mode="wait">
          {mode === 'email-entry' && (
            <EmailEntryForm
              email={email}
              setEmail={setEmail}
              onContinue={handleEmailEntry}
              onModeChange={handleModeChange}
              loading={loading}
            />
          )}

          {mode === 'welcome' && (
            <WelcomeScreen
              email={email}
              hasPin={userCapabilities.hasPin}
              hasBiometric={userCapabilities.hasBiometric}
              biometricAvailable={biometricAvailable}
              onModeChange={handleModeChange}
              onPinAuth={() => setMode('pin')}
              onBiometricAuth={handleBiometricAuth}
              loading={loading}
              userPreference={userPreference}
            />
          )}

          {mode === 'email' && (
            <EmailPasswordForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              onSubmit={handleEmailAuth}
              onModeChange={handleModeChange}
              loading={loading}
              isSignUp={false}
            />
          )}

          {mode === 'signup' && (
            <EmailPasswordForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              onSubmit={handleEmailAuth}
              onModeChange={handleModeChange}
              loading={loading}
              isSignUp={true}
            />
          )}

          {mode === 'email-confirmation' && (
            <EmailConfirmationScreen
              pendingEmail={pendingEmail}
              onResendConfirmation={handleResendConfirmation}
              onModeChange={handleModeChange}
              loading={loading}
            />
          )}

          {mode === 'pin' && (
            <PinLoginForm
              email={email}
              onPinComplete={handlePinComplete}
              onModeChange={handleModeChange}
              loading={loading}
            />
          )}

          {mode === 'biometric' && (
            <BiometricLoginForm
              email={email}
              biometricAvailable={biometricAvailable}
              onBiometricAuth={handleBiometricAuth}
              onModeChange={handleModeChange}
              loading={loading}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
