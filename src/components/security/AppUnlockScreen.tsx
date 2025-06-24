
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Hash, Fingerprint, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
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

  React.useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, [isBiometricAvailable]);

  // Auto-attempt biometric unlock if it's the preferred method and hasn't been attempted yet
  React.useEffect(() => {
    if (preferredUnlockMethod === 'biometric' && biometricAvailable && !biometricAttempted) {
      setBiometricAttempted(true);
      handleBiometricUnlock();
    }
  }, [preferredUnlockMethod, biometricAvailable, biometricAttempted]);

  const handlePinUnlock = async () => {
    if (pin.length !== 4) {
      toast.error('Please enter a 4-digit PIN');
      return;
    }

    setIsUnlocking(true);
    
    // For demo purposes, we'll accept any 4-digit PIN
    // In production, you'd validate against the stored PIN
    if (pin === '1234' || pin.length === 4) {
      setTimeout(() => {
        unlockApp();
        toast.success('App unlocked!');
        setIsUnlocking(false);
      }, 500);
    } else {
      toast.error('Invalid PIN');
      setPin('');
      setIsUnlocking(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (!user?.email) return;

    setIsUnlocking(true);
    
    try {
      // Use the actual biometric authentication
      const { error } = await signInWithBiometric(user.email);
      
      if (error) {
        toast.error('Biometric authentication failed');
        setIsUnlocking(false);
        return;
      }
      
      unlockApp();
      toast.success('App unlocked!');
      setIsUnlocking(false);
    } catch (error) {
      toast.error('Biometric unlock failed');
      setIsUnlocking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4 z-50">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 max-w-md w-full shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Unlock SmartFinanceAI</h2>
          <p className="text-white/70">
            {preferredUnlockMethod === 'pin' ? 'Enter your PIN to continue' : 'Use biometric authentication to continue'}
          </p>
        </div>

        {preferredUnlockMethod === 'pin' ? (
          <div className="space-y-6">
            <div className="flex justify-center">
              <InputOTP 
                value={pin} 
                onChange={setPin} 
                maxLength={4}
                onComplete={handlePinUnlock}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="bg-white/10 border-white/20 text-white text-xl w-14 h-14" />
                  <InputOTPSlot index={1} className="bg-white/10 border-white/20 text-white text-xl w-14 h-14" />
                  <InputOTPSlot index={2} className="bg-white/10 border-white/20 text-white text-xl w-14 h-14" />
                  <InputOTPSlot index={3} className="bg-white/10 border-white/20 text-white text-xl w-14 h-14" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              onClick={handlePinUnlock}
              disabled={pin.length !== 4 || isUnlocking}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12"
            >
              {isUnlocking ? 'Unlocking...' : 'Unlock'}
            </Button>

            {biometricAvailable && (
              <Button
                onClick={handleBiometricUnlock}
                disabled={isUnlocking}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 rounded-xl h-12 flex items-center justify-center space-x-2"
              >
                <Fingerprint className="w-5 h-5" />
                <span>Use Biometric Instead</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Button
              onClick={handleBiometricUnlock}
              disabled={isUnlocking}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12 flex items-center justify-center space-x-2"
            >
              <Fingerprint className="w-5 h-5" />
              <span>{isUnlocking ? 'Authenticating...' : 'Unlock with Biometric'}</span>
            </Button>

            <Button
              onClick={() => window.location.reload()}
              disabled={isUnlocking}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 rounded-xl h-12 flex items-center justify-center space-x-2"
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
