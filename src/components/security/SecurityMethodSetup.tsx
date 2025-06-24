
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Hash, Fingerprint, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAppSecurity } from '@/hooks/useAppSecurity';
import { toast } from 'sonner';

export const SecurityMethodSetup: React.FC = () => {
  const [step, setStep] = useState<'intro' | 'preference-selection'>('intro');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const { setupBiometric, isBiometricAvailable } = useAuth();
  const { setPreferredUnlockMethod, setSetupComplete, setIsPinSetup } = useAppSecurity();
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  React.useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, [isBiometricAvailable]);

  const handleSetupPinFirst = () => {
    // Navigate to PIN setup by setting isPinSetup to false (which triggers PIN setup screen)
    setIsPinSetup(false);
  };

  const handlePreferenceSelection = async (method: 'pin' | 'biometric') => {
    setIsSettingUp(true);

    try {
      if (method === 'biometric') {
        // Set up biometric authentication
        const { error } = await setupBiometric();
        if (error) {
          toast.error(error);
          setIsSettingUp(false);
          return;
        }
        toast.success('Biometric security enabled!');
      }
      
      setPreferredUnlockMethod(method);
      setSetupComplete(true);
      
      if (method === 'pin') {
        toast.success('PIN security enabled!');
      }
    } catch (error) {
      toast.error('Setup failed. Please try again.');
      setIsSettingUp(false);
    }
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
        {step === 'intro' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Secure Your App</h2>
            <p className="text-white/70 mb-8">
              First, let's set up a PIN code to secure your app. You'll use this to unlock SmartFinanceAI.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3 text-left">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Hash className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">4-Digit PIN Required</p>
                  <p className="text-white/60 text-sm">Essential for app security</p>
                </div>
              </div>
              
              {biometricAvailable && (
                <div className="flex items-center space-x-3 text-left">
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Fingerprint className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Biometric Option Available</p>
                    <p className="text-white/60 text-sm">Optional fingerprint or face unlock</p>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleSetupPinFirst}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12 flex items-center justify-center space-x-2"
            >
              <span>Set Up PIN Code</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <p className="text-white/50 text-xs text-center mt-4">
              A PIN is required to secure your financial data
            </p>
          </div>
        )}

        {step === 'preference-selection' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">PIN Setup Complete!</h2>
            <p className="text-white/70 text-sm mb-8">
              Now choose your preferred unlock method for daily use
            </p>

            <div className="space-y-4 mb-8">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative p-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-200"
                onClick={() => handlePreferenceSelection('pin')}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Hash className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">Use PIN Code</p>
                    <p className="text-white/60 text-sm">Quick 4-digit unlock</p>
                  </div>
                </div>
              </motion.div>

              {biometricAvailable && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative p-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-200"
                  onClick={() => handlePreferenceSelection('biometric')}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Fingerprint className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center space-x-2">
                        <p className="text-white font-medium">Use Biometric</p>
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                          Recommended
                        </span>
                      </div>
                      <p className="text-white/60 text-sm">Fingerprint or face unlock</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {isSettingUp && (
              <div className="text-center">
                <div className="text-white/70 text-sm">Setting up your preferred method...</div>
              </div>
            )}

            <p className="text-white/50 text-xs text-center">
              You can change this preference later in settings
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
