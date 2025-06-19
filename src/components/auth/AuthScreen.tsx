
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Fingerprint, Shield, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PinPad } from './PinPad';
import { toast } from 'sonner';

type AuthMode = 'welcome' | 'email' | 'pin' | 'biometric' | 'signup' | 'email-confirmation';

export const AuthScreen = () => {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const { signIn, signUp, signInWithPin, signInWithBiometric, isBiometricAvailable, resendConfirmation } = useAuth();

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, [isBiometricAvailable]);

  const handleEmailAuth = async (isSignUp: boolean = false) => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    
    if (isSignUp) {
      const { error, needsConfirmation, message } = await signUp(email, password);
      
      if (error) {
        toast.error(error.message);
      } else if (needsConfirmation) {
        setPendingEmail(email);
        setMode('email-confirmation');
        toast.success(message || 'Account created! Please check your email to confirm.');
      } else {
        toast.success('Account created and signed in successfully!');
      }
    } else {
      const { error } = await signIn(email, password);
      
      if (error) {
        if (error.needsConfirmation) {
          setPendingEmail(email);
          setMode('email-confirmation');
          toast.error(error.message);
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Welcome back!');
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
    setLoading(true);
    const { error } = await signInWithPin(pin);
    
    if (error) {
      toast.error('Invalid PIN');
      setTimeout(() => setLoading(false), 1000);
    } else {
      toast.success('Welcome back!');
    }
  };

  const handleBiometricAuth = async () => {
    if (!biometricAvailable) {
      toast.error('Biometric authentication is not available on this device');
      return;
    }

    setLoading(true);
    const { error } = await signInWithBiometric();
    
    if (error) {
      toast.error(error.message || 'Biometric authentication failed');
    } else {
      toast.success('Welcome back!');
    }
    setLoading(false);
  };

  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
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
          {mode === 'welcome' && (
            <motion.div
              key="welcome"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-800 to-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
                  <Shield className="w-10 h-10 text-white/90" />
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-2xl"></div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                <p className="text-white/70">Choose your preferred login method</p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => setMode('email')}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-14 flex items-center justify-between px-6"
                >
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5" />
                    <span className="font-medium">Email & Password</span>
                  </div>
                  <ArrowRight className="w-5 h-5" />
                </Button>

                <Button
                  onClick={() => setMode('pin')}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl h-14 flex items-center justify-between px-6"
                >
                  <div className="flex items-center space-x-3">
                    <Lock className="w-5 h-5" />
                    <span className="font-medium">PIN Code</span>
                  </div>
                  <ArrowRight className="w-5 h-5" />
                </Button>

                <Button
                  onClick={() => setMode('biometric')}
                  disabled={!biometricAvailable}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl h-14 flex items-center justify-between px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-3">
                    <Fingerprint className="w-5 h-5" />
                    <span className="font-medium">
                      {biometricAvailable ? 'Biometric' : 'Biometric (Unavailable)'}
                    </span>
                  </div>
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setMode('signup')}
                  className="text-white/70 hover:text-white transition-colors duration-200"
                >
                  Don't have an account? <span className="text-purple-400 font-medium">Sign up</span>
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'email' && (
            <motion.div
              key="email"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
                <p className="text-white/70">Enter your credentials to continue</p>
              </div>

              <div className="space-y-6">
                <div>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl h-12"
                  />
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <Button
                  onClick={() => handleEmailAuth(false)}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setMode('welcome')}
                  className="text-white/70 hover:text-white transition-colors duration-200"
                >
                  ← Back to options
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'signup' && (
            <motion.div
              key="signup"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
                <p className="text-white/70">Join SmartFinanceAI today</p>
              </div>

              <div className="space-y-6">
                <div>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl h-12"
                  />
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <Button
                  onClick={() => handleEmailAuth(true)}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl h-12"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setMode('welcome')}
                  className="text-white/70 hover:text-white transition-colors duration-200"
                >
                  ← Back to options
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'email-confirmation' && (
            <motion.div
              key="email-confirmation"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
                <p className="text-white/70 mb-4">
                  We've sent a confirmation link to:
                </p>
                <p className="text-white font-medium">{pendingEmail}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-300">
                      <p className="font-medium mb-1">Next steps:</p>
                      <ul className="space-y-1 text-blue-200">
                        <li>1. Check your email inbox (and spam folder)</li>
                        <li>2. Click the confirmation link</li>
                        <li>3. Return here to sign in</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10 rounded-xl h-12"
                >
                  {loading ? 'Sending...' : 'Resend confirmation email'}
                </Button>

                <Button
                  onClick={() => setMode('email')}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12"
                >
                  Back to Sign In
                </Button>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setMode('welcome')}
                  className="text-white/70 hover:text-white transition-colors duration-200"
                >
                  ← Back to options
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'pin' && (
            <motion.div
              key="pin"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Enter PIN</h2>
                <p className="text-white/70">Enter your 4-digit PIN code</p>
              </div>

              <PinPad 
                onPinComplete={handlePinComplete}
                loading={loading}
              />

              <div className="mt-8 text-center">
                <button
                  onClick={() => setMode('welcome')}
                  className="text-white/70 hover:text-white transition-colors duration-200"
                  disabled={loading}
                >
                  ← Back to options
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'biometric' && (
            <motion.div
              key="biometric"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Fingerprint className="w-10 h-10 text-white animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Biometric Auth</h2>
                <p className="text-white/70">
                  {biometricAvailable 
                    ? 'Use your fingerprint, face ID, or other biometric method' 
                    : 'Biometric authentication is not available on this device'
                  }
                </p>
              </div>

              <div className="space-y-6">
                <Button
                  onClick={handleBiometricAuth}
                  disabled={loading || !biometricAvailable}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl h-12 disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Authenticate'}
                </Button>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setMode('welcome')}
                  className="text-white/70 hover:text-white transition-colors duration-200"
                  disabled={loading}
                >
                  ← Back to options
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
