import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Hash, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppSecurity } from '@/hooks/useAppSecurity';
import { toast } from 'sonner';
import { PinPad } from '@/components/auth/PinPad';

export const PinSetupScreen: React.FC = () => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'setup' | 'confirm'>('setup');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const { setupPin, user } = useAuth();
  const { setIsPinSetup } = useAppSecurity();

  const handlePinComplete = (enteredPin: string) => {
    if (step === 'setup') {
      setPin(enteredPin);
      setStep('confirm');
    } else {
      setConfirmPin(enteredPin);
      handlePinSetup(pin, enteredPin);
    }
  };

  const handlePinSetup = async (originalPin: string, confirmedPin: string) => {
    console.log('🔵 PinSetupScreen - Starting PIN setup');
    console.log('🔵 PinSetupScreen - User authenticated:', !!user);
    console.log('🔵 PinSetupScreen - PINs match:', originalPin === confirmedPin);

    if (originalPin !== confirmedPin) {
      console.error('❌ PinSetupScreen - PINs do not match');
      toast.error('PINs do not match. Please try again.');
      setPin('');
      setConfirmPin('');
      setStep('setup');
      return;
    }

    setIsSettingUp(true);

    try {
      console.log('🔵 PinSetupScreen - Calling setupPin service');
      const result = await setupPin(originalPin);
      console.log('🔵 PinSetupScreen - Setup result:', result);

      if (result?.error) {
        console.error('❌ PinSetupScreen - Setup failed:', result.error);
        toast.error(`Failed to set up PIN: ${result.error}`);
        setPin('');
        setConfirmPin('');
        setStep('setup');
      } else {
        console.log('✅ PinSetupScreen - PIN setup successful');
        setIsPinSetup(true);
        toast.success('PIN set up successfully!');
      }
    } catch (error) {
      console.error('❌ PinSetupScreen - Unexpected error:', error);
      toast.error('Failed to set up PIN. Please try again.');
      setPin('');
      setConfirmPin('');
      setStep('setup');
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <div className="fixed inset-0 app-gradient-bg flex items-center justify-center p-4 z-50 safe-area-top safe-area-bottom">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass-card rounded-3xl p-8 max-w-sm w-full"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 app-gradient-purple rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            {step === 'setup' ? (
              <Hash className="w-8 h-8 text-white" />
            ) : (
              <Check className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {step === 'setup' ? 'Set Your PIN' : 'Confirm Your PIN'}
          </h2>
          <p className="text-white/70 text-sm px-4">
            {step === 'setup'
              ? 'Choose a 4-digit PIN to secure your app'
              : 'Enter your PIN again to confirm'}
          </p>
        </div>

        <PinPad
          onPinComplete={handlePinComplete}
          loading={isSettingUp}
          isSetup={true}
          maxLength={4}
        />

        {isSettingUp && (
          <div className="text-center mt-6">
            <div className="text-white/70 text-sm">Setting up PIN...</div>
          </div>
        )}
      </motion.div>
    </div>
  );
};