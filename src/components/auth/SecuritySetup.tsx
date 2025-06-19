
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Fingerprint, X, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { PinPad } from './PinPad';
import { toast } from 'sonner';

interface SecuritySetupProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const SecuritySetup: React.FC<SecuritySetupProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState<'intro' | 'pin' | 'biometric' | 'complete'>('intro');
  const [pinSetup, setPinSetup] = useState(false);
  const [biometricSetup, setBiometricSetup] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { setupPin, setupBiometric, isBiometricAvailable } = useAuth();

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, [isBiometricAvailable]);

  const handlePinSetup = async (pin: string) => {
    setLoading(true);
    const { error } = await setupPin(pin);
    
    if (error) {
      toast.error('Failed to set up PIN');
    } else {
      toast.success('PIN set up successfully!');
      setPinSetup(true);
      if (biometricAvailable) {
        setCurrentStep('biometric');
      } else {
        setCurrentStep('complete');
      }
    }
    setLoading(false);
  };

  const handleBiometricSetup = async () => {
    setLoading(true);
    const { error } = await setupBiometric();
    
    if (error) {
      // Show more user-friendly error message
      if (error.includes('preview mode')) {
        toast.error('Biometric setup is not available in preview mode. This will work when you deploy your app or access it directly.');
      } else {
        toast.error(error || 'Failed to set up biometric authentication');
      }
    } else {
      toast.success('Biometric authentication set up successfully!');
      setBiometricSetup(true);
      setCurrentStep('complete');
    }
    setLoading(false);
  };

  const handleSkipBiometric = () => {
    setCurrentStep('complete');
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl"
      >
        {currentStep === 'intro' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Secure Your Account</h2>
            <p className="text-white/70 mb-8">
              Set up additional security methods for faster and more secure access to your account.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3 text-left">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">4-Digit PIN</p>
                  <p className="text-white/60 text-sm">Quick access with a secure PIN</p>
                </div>
              </div>
              
              {biometricAvailable && (
                <div className="flex items-center space-x-3 text-left">
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Fingerprint className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Biometric Authentication</p>
                    <p className="text-white/60 text-sm">Use fingerprint or face recognition</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => setCurrentStep('pin')}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12"
              >
                Set Up Security Methods
              </Button>
              
              <Button
                onClick={onSkip}
                variant="ghost"
                className="w-full text-white/70 hover:text-white hover:bg-white/10 rounded-xl h-12"
              >
                Skip for now
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'pin' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Set Up PIN</h2>
              <button
                onClick={onSkip}
                className="text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-white/70 mb-6 text-center">
              Choose a 4-digit PIN for quick access
            </p>

            <PinPad 
              onPinComplete={handlePinSetup}
              loading={loading}
              isSetup={true}
            />
          </div>
        )}

        {currentStep === 'biometric' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Fingerprint className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white mb-4">Set Up Biometric Auth</h2>
            <p className="text-white/70 mb-8">
              Use your fingerprint, face ID, or other biometric method for secure access
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleBiometricSetup}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl h-12"
              >
                {loading ? 'Setting Up...' : 'Set Up Biometric'}
              </Button>
              
              <Button
                onClick={handleSkipBiometric}
                variant="ghost"
                className="w-full text-white/70 hover:text-white hover:bg-white/10 rounded-xl h-12"
              >
                Skip Biometric
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-4">Security Setup Complete!</h2>
            <p className="text-white/70 mb-8">
              Your account is now more secure. You can use these methods to sign in faster next time.
            </p>

            <div className="space-y-4 mb-8">
              {pinSetup && (
                <div className="flex items-center justify-center space-x-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">PIN authentication enabled</span>
                </div>
              )}
              
              {biometricSetup && (
                <div className="flex items-center justify-center space-x-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Biometric authentication enabled</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleComplete}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12"
            >
              Continue to Dashboard
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
