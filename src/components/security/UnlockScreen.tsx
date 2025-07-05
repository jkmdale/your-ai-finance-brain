import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Hash, Fingerprint, LogOut, Delete, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAppSecurity } from '@/hooks/useAppSecurity';
import { toast } from 'sonner';

export const UnlockScreen: React.FC = () => {
  const [pin, setPin] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const { preferredUnlockMethod, unlockApp } = useAppSecurity();
  const { signInWithPin, signInWithBiometric, signOut, user, isBiometricAvailable } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricAttempted, setBiometricAttempted] = useState(false);
  const [showPinMode, setShowPinMode] = useState(false);

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, [isBiometricAvailable]);

  // Auto-attempt biometric unlock if it's the preferred method
  useEffect(() => {
    if (preferredUnlockMethod === 'biometric' && biometricAvailable && !biometricAttempted && !showPinMode) {
      setBiometricAttempted(true);
      handleBiometricUnlock();
    }
  }, [preferredUnlockMethod, biometricAvailable, biometricAttempted, showPinMode]);

  const handleNumberClick = (number: string) => {
    if (pin.length < 6 && !isUnlocking) {
      const newPin = pin + number;
      setPin(newPin);
      
      // Auto-submit when PIN reaches 4-6 digits
      if (newPin.length >= 4) {
        setTimeout(() => {
          handlePinUnlock(newPin);
        }, 300);
      }
    }
  };

  const handleDelete = () => {
    if (!isUnlocking && pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const handlePinUnlock = async (pinToVerify = pin) => {
    if (pinToVerify.length < 4) {
      toast.error('PIN must be at least 4 digits');
      return;
    }

    if (!user?.email) {
      toast.error('Session expired. Please sign in again.');
      await signOut();
      return;
    }

    setIsUnlocking(true);
    
    try {
      const { error } = await signInWithPin(pinToVerify, user.email);
      
      if (error) {
        toast.error(typeof error === 'string' ? error : 'Invalid PIN');
        setPin('');
        setIsUnlocking(false);
        return;
      }
      
      unlockApp();
      toast.success('App unlocked successfully!');
      setPin('');
      setIsUnlocking(false);
    } catch (error) {
      console.error('PIN unlock error:', error);
      toast.error('PIN verification failed');
      setPin('');
      setIsUnlocking(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (!user?.email) {
      toast.error('Session expired. Please sign in again.');
      await signOut();
      return;
    }

    setIsUnlocking(true);
    
    try {
      console.log('🔐 Attempting biometric unlock for:', user.email);
      const result = await signInWithBiometric(user.email);
      
      if (result.error) {
        console.log('❌ Biometric error:', result.error);
        
        if (result.error.includes('No passkeys available') || result.error.includes('not recognized')) {
          toast.error('No biometric credentials found. Please use PIN instead.');
          setShowPinMode(true);
        } else if (result.error.includes('cancelled') || result.error.includes('denied')) {
          toast.error('Biometric authentication was cancelled');
        } else if (result.error.includes('preview mode')) {
          toast.error('Biometric auth not available in preview mode');
          setShowPinMode(true);
        } else {
          toast.error('Biometric authentication failed');
          setShowPinMode(true);
        }
        
        setIsUnlocking(false);
        return;
      }
      
      console.log('✅ Biometric unlock successful');
      unlockApp();
      toast.success('App unlocked with biometric!');
      setIsUnlocking(false);
    } catch (error: any) {
      console.error('❌ Biometric unlock error:', error);
      toast.error('Biometric authentication failed. Please use PIN.');
      setShowPinMode(true);
      setIsUnlocking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const numbers = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
  ];

  const shouldShowPinInterface = preferredUnlockMethod === 'pin' || showPinMode;

  return (
    <div className="fixed inset-0 app-gradient-bg flex items-center justify-center p-4 z-50 min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 opacity-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 sm:w-80 sm:h-80 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass-card rounded-3xl p-4 sm:p-6 w-full max-w-sm mx-auto overflow-hidden"
      >
        {shouldShowPinInterface ? (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Hash className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Enter your PIN</h2>
              <p className="text-white/70 text-sm">Use your secure PIN to unlock the app</p>
            </div>

            {/* PIN Display */}
            <div className="flex justify-center items-center space-x-3 mb-8">
              <div className="flex space-x-2">
                {[...Array(Math.max(4, pin.length))].map((_, index) => (
                  <motion.div
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index < pin.length 
                        ? 'bg-purple-400' 
                        : 'bg-white/20'
                    }`}
                    animate={{
                      scale: index === pin.length - 1 && pin.length > 0 ? [1, 1.3, 1] : 1
                    }}
                    transition={{ duration: 0.2 }}
                  />
                ))}
              </div>
              
              <button
                onClick={() => setShowPin(!showPin)}
                className="ml-4 p-1 text-white/60 hover:text-white/80 transition-colors"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {showPin && pin && (
              <div className="text-center mb-4">
                <span className="text-white font-mono text-lg tracking-wider">{pin}</span>
              </div>
            )}

            {/* Number Pad - Match PinSetupScreen layout */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* First 3 rows: 1-9 */}
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <motion.button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  disabled={isUnlocking}
                  className="glass-button w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-semibold transition-all duration-200 border-white/20 hover:bg-white/20 disabled:opacity-50 touch-target"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                >
                  {num}
                </motion.button>
              ))}
              
              {/* Bottom row: Delete, 0, Biometric/Empty */}
              <motion.button
                onClick={handleDelete}
                disabled={isUnlocking || pin.length === 0}
                className="glass-button w-16 h-16 rounded-2xl flex items-center justify-center text-white transition-all duration-200 border-white/20 hover:bg-white/20 disabled:opacity-30 touch-target"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                <Delete className="w-5 h-5" />
              </motion.button>

              <motion.button
                onClick={() => handleNumberClick('0')}
                disabled={isUnlocking}
                className="glass-button w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-semibold transition-all duration-200 border-white/20 hover:bg-white/20 disabled:opacity-50 touch-target"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                0
              </motion.button>

              {/* Biometric button or empty space */}
              {biometricAvailable ? (
                <motion.button
                  onClick={handleBiometricUnlock}
                  disabled={isUnlocking}
                  className="glass-button w-16 h-16 rounded-2xl flex items-center justify-center text-white transition-all duration-200 border-white/20 hover:bg-white/20 disabled:opacity-30 touch-target"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Fingerprint className="w-5 h-5" />
                </motion.button>
              ) : (
                <div className="w-16 h-16"></div>
              )}
            </div>

            {isUnlocking && (
              <div className="text-center mb-4">
                <div className="text-white/70 text-sm">Verifying PIN...</div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Fingerprint className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Unlock App</h2>
              <p className="text-white/70">Use biometric authentication to unlock</p>
            </div>

            <Button
              onClick={handleBiometricUnlock}
              disabled={isUnlocking}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12 flex items-center justify-center space-x-2"
            >
              <Fingerprint className="w-5 h-5" />
              <span>{isUnlocking ? 'Authenticating...' : 'Unlock with Biometric'}</span>
            </Button>

            <Button
              onClick={() => setShowPinMode(true)}
              disabled={isUnlocking}
              variant="outline"
              className="w-full border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-xl h-12 flex items-center justify-center space-x-2"
            >
              <Hash className="w-5 h-5" />
              <span>Use PIN Instead</span>
            </Button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/10">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full text-white/70 hover:text-white hover:bg-white/10 rounded-xl h-10 flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <p className="text-white/40 text-xs text-center mt-4">
            Development: Any 4+ digit PIN works
          </p>
        )}
      </motion.div>
    </div>
  );
};
