
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Hash, Fingerprint, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAppSecurity } from '@/hooks/useAppSecurity';
import { toast } from 'sonner';

export const SecurityMethodSetup: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<'pin' | 'biometric' | null>(null);
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

  const handleMethodSelection = (method: 'pin' | 'biometric') => {
    setSelectedMethod(method);
  };

  const handleSetupComplete = async () => {
    if (!selectedMethod) return;

    setIsSettingUp(true);

    try {
      if (selectedMethod === 'pin') {
        // For PIN setup, we'll show the PIN setup screen
        setPreferredUnlockMethod('pin');
        // Don't set setupComplete yet - wait for PIN to be set up
        toast.success('PIN method selected! Set up your PIN next.');
      } else if (selectedMethod === 'biometric') {
        // Set up biometric authentication
        const { error } = await setupBiometric();
        if (error) {
          toast.error(error);
          setIsSettingUp(false);
          return;
        }
        setPreferredUnlockMethod('biometric');
        setSetupComplete(true);
        toast.success('Biometric security enabled!');
      }
    } catch (error) {
      toast.error('Setup failed. Please try again.');
      setIsSettingUp(false);
    }
  };

  const securityOptions = [
    {
      id: 'pin',
      title: 'PIN Code',
      description: 'Use a 4-digit PIN to unlock the app',
      icon: Hash,
      available: true,
      recommended: false
    },
    {
      id: 'biometric',
      title: 'Biometric',
      description: 'Use fingerprint or face recognition',
      icon: Fingerprint,
      available: biometricAvailable,
      recommended: biometricAvailable
    }
  ].filter(option => option.available);

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
          <h2 className="text-2xl font-bold text-white mb-2">Secure Your App</h2>
          <p className="text-white/70">
            Choose how you'd like to unlock SmartFinanceAI for enhanced security
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {securityOptions.map((option) => {
            const IconComponent = option.icon;
            const isSelected = selectedMethod === option.id;
            
            return (
              <motion.div
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'border-purple-400 bg-purple-500/20' 
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => handleMethodSelection(option.id as 'pin' | 'biometric')}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-medium">{option.title}</p>
                      {option.recommended && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-sm">{option.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <Button
          onClick={handleSetupComplete}
          disabled={!selectedMethod || isSettingUp}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12 flex items-center justify-center space-x-2"
        >
          {isSettingUp ? (
            <span>Setting up...</span>
          ) : (
            <>
              <span>Enable Security</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

        <p className="text-white/50 text-xs text-center mt-4">
          You'll need to unlock the app each time you open it and after 5 minutes of inactivity
        </p>
      </motion.div>
    </div>
  );
};
