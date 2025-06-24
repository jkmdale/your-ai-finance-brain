import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Hash, Fingerprint, LogOut, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAppSecurity } from '@/hooks/useAppSecurity';
import { toast } from 'sonner';

export const AppUnlockScreen: React.FC = () => {
  const [pin, setPin] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const { preferredUnlockMethod, unlockApp } = useAppSecurity();
  const { signInWithPin, signInWithBiometric, signOut, user, isBiometricAvailable } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricAttempted, setBiometricAttempted] = useState(false);
  const [biometricFailed, setBiometricFailed] = useState(false);

  React.useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, [isBiometricAvailable]);

  // Auto-attempt biometric unlock if it's the preferred method and hasn't been attempted yet
  React.useEffect(() => {
    if (preferredUnlockMethod === 'biometric' && biometricAvailable && !biometricAttempted && !biometricFailed) {
      setBiometricAttempted(true);
      handleBiometricUnlock();
    }
  }, [preferredUnlockMethod, biometricAvailable, biometricAttempted, biometricFailed]);

  const handleNumberClick = (number: string) => {
    if (pin.length < 4 && !isUnlocking) {
      const newPin = pin + number;
      setPin(newPin);
      
      if (newPin.length === 4) {
        setTimeout(() => {
          handlePinUnlock(newPin);
        }, 100);
      }
    }
  };

  const handleDelete = () => {
    if (!isUnlocking) {
      setPin(pin.slice(0, -1));
    }
  };

  const handlePinUnlock = async (pinToVerify = pin) => {
    if (pinToVerify.length !== 4) {
      toast.error('Please enter a 4-digit PIN');
      return;
    }

    if (!user?.email) {
      toast.error('User session not found');
      return;
    }

    setIsUnlocking(true);
    
    try {
      const { error } = await signInWithPin(pinToVerify, user.email);
      
      if (error) {
        toast.error(error);
        setPin('');
        setIsUnlocking(false);
        return;
      }
      
      unlockApp();
      toast.success('App unlocked!');
      setIsUnlocking(false);
    } catch (error) {
      toast.error('PIN verification failed');
      setPin('');
      setIsUnlocking(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (!user?.email) return;

    setIsUnlocking(true);
    
    try {
      const { error } = await signInWithBiometric(user.email);
      
      if (error) {
        console.log('Biometric error:', error);
        setBiometricFailed(true);
        
        // Check for specific passkey errors
        if (error.includes('No passkeys available') || error.includes('passkey')) {
          toast.error('No biometric credentials found. Please use PIN instead.');
        } else if (error.includes('cancelled') || error.includes('not allowed')) {
          toast.error('Biometric authentication was cancelled');
        } else {
          toast.error('Biometric authentication failed');
        }
        
        setIsUnlocking(false);
        return;
      }
      
      unlockApp();
      toast.success('App unlocked!');
      setIsUnlocking(false);
    } catch (error: any) {
      console.log('Biometric unlock error:', error);
      setBiometricFailed(true);
      
      if (error.message?.includes('passkey') || error.name === 'NotAllowedError') {
        toast.error('No biometric credentials found. Please use PIN instead.');
      } else {
        toast.error('Biometric unlock failed');
      }
      
      setIsUnlocking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  const switchToPinMode = () => {
    setBiometricFailed(false);
    setBiometricAttempted(true);
  };

  const numbers = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4 z-50">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
      >
        {(preferredUnlockMethod === 'pin' || biometricFailed) ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Enter your PIN</h2>
              <p className="text-white/70 text-sm">Use the PIN you set up to unlock the app</p>
            </div>

            {/* PIN Display Dots */}
            <div className="flex justify-center space-x-4 mb-12">
              {[...Array(4)].map((_, index) => (
                <motion.div
                  key={index}
                  className={`w-4 h-4 rounded-full ${
                    index < pin.length 
                      ? 'bg-purple-400' 
                      : 'bg-white/20'
                  }`}
                  animate={{
                    scale: index === pin.length - 1 && pin.length > 0 ? [1, 1.2, 1] : 1
                  }}
                  transition={{ duration: 0.2 }}
                />
              ))}
            </div>

            {/* Number Pad */}
            <div className="space-y-4">
              {/* Numbers 1-3 */}
              <div className="grid grid-cols-3 gap-4">
                {numbers.slice(0, 3).map((item) => (
                  <motion.button
                    key={item.num}
                    onClick={() => handleNumberClick(item.num)}
                    disabled={isUnlocking}
                    className="w-20 h-20 backdrop-blur-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-2xl flex flex-col items-center justify-center text-white transition-all duration-200 border border-white/10"
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-2xl font-medium">{item.num}</span>
                    {item.letters && <span className="text-xs text-white/60 mt-1">{item.letters}</span>}
                  </motion.button>
                ))}
              </div>

              {/* Numbers 4-6 */}
              <div className="grid grid-cols-3 gap-4">
                {numbers.slice(3, 6).map((item) => (
                  <motion.button
                    key={item.num}
                    onClick={() => handleNumberClick(item.num)}
                    disabled={isUnlocking}
                    className="w-20 h-20 backdrop-blur-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-2xl flex flex-col items-center justify-center text-white transition-all duration-200 border border-white/10"
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-2xl font-medium">{item.num}</span>
                    <span className="text-xs text-white/60 mt-1">{item.letters}</span>
                  </motion.button>
                ))}
              </div>

              {/* Numbers 7-9 */}
              <div className="grid grid-cols-3 gap-4">
                {numbers.slice(6, 9).map((item) => (
                  <motion.button
                    key={item.num}
                    onClick={() => handleNumberClick(item.num)}
                    disabled={isUnlocking}
                    className="w-20 h-20 backdrop-blur-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-2xl flex flex-col items-center justify-center text-white transition-all duration-200 border border-white/10"
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-2xl font-medium">{item.num}</span>
                    <span className="text-xs text-white/60 mt-1">{item.letters}</span>
                  </motion.button>
                ))}
              </div>

              {/* Bottom Row: Biometric, 0, Delete */}
              <div className="grid grid-cols-3 gap-4">
                {/* Biometric Button */}
                <motion.button
                  onClick={biometricAvailable && !biometricFailed ? handleBiometricUnlock : undefined}
                  disabled={isUnlocking || !biometricAvailable || biometricFailed}
                  className="w-20 h-20 backdrop-blur-sm bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-2xl flex flex-col items-center justify-center text-white transition-all duration-200 border border-white/10"
                  whileTap={{ scale: 0.95 }}
                >
                  <Fingerprint className="w-6 h-6 mb-1" />
                  <span className="text-xs text-white/60">Touch</span>
                </motion.button>

                {/* Zero */}
                <motion.button
                  onClick={() => handleNumberClick('0')}
                  disabled={isUnlocking}
                  className="w-20 h-20 backdrop-blur-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-2xl flex items-center justify-center text-white transition-all duration-200 border border-white/10"
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-2xl font-medium">0</span>
                </motion.button>

                {/* Delete */}
                <motion.button
                  onClick={handleDelete}
                  disabled={isUnlocking || pin.length === 0}
                  className="w-20 h-20 backdrop-blur-sm bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-2xl flex items-center justify-center text-white transition-all duration-200 border border-white/10"
                  whileTap={{ scale: 0.95 }}
                >
                  <Delete className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {isUnlocking && (
              <div className="text-center mt-6">
                <div className="text-white/70 text-sm">Verifying PIN...</div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Unlock SmartFinanceAI</h2>
              <p className="text-white/70">Use biometric authentication to continue</p>
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
              onClick={switchToPinMode}
              disabled={isUnlocking}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0 rounded-xl h-12 flex items-center justify-center space-x-2"
            >
              <Hash className="w-5 h-5" />
              <span>Use PIN Instead</span>
            </Button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/10">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full text-white/70 hover:text-white hover:bg-white/10 rounded-xl h-10 flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>

        <p className="text-white/40 text-xs text-center mt-4">
          For demo: PIN is any 4 digits
        </p>
      </motion.div>
    </div>
  );
};
