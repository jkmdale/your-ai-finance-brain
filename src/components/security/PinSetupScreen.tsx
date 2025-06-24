import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Hash, Delete, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAppSecurity } from '@/hooks/useAppSecurity';
import { toast } from 'sonner';

export const PinSetupScreen: React.FC = () => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'setup' | 'confirm'>('setup');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const { setupPin } = useAuth();
  const { setIsPinSetup } = useAppSecurity();

  const handleNumberClick = (number: string) => {
    if (isSettingUp) return;
    
    if (step === 'setup') {
      if (pin.length < 4) {
        const newPin = pin + number;
        setPin(newPin);
        
        if (newPin.length === 4) {
          setTimeout(() => {
            setStep('confirm');
          }, 100);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const newConfirmPin = confirmPin + number;
        setConfirmPin(newConfirmPin);
        
        if (newConfirmPin.length === 4) {
          setTimeout(() => {
            handlePinSetup(pin, newConfirmPin);
          }, 100);
        }
      }
    }
  };

  const handleDelete = () => {
    if (isSettingUp) return;
    
    if (step === 'setup') {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const handlePinSetup = async (originalPin: string, confirmedPin: string) => {
    if (originalPin !== confirmedPin) {
      toast.error('PINs do not match. Please try again.');
      setPin('');
      setConfirmPin('');
      setStep('setup');
      return;
    }

    setIsSettingUp(true);
    
    try {
      const { error } = await setupPin(originalPin);
      
      if (error) {
        toast.error('Failed to set up PIN. Please try again.');
        setPin('');
        setConfirmPin('');
        setStep('setup');
        setIsSettingUp(false);
        return;
      }
      
      // Mark PIN as set up - this will trigger the security method setup
      setIsPinSetup(true);
      toast.success('PIN set up successfully!');
    } catch (error) {
      toast.error('Failed to set up PIN. Please try again.');
      setPin('');
      setConfirmPin('');
      setStep('setup');
      setIsSettingUp(false);
    }
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

  const currentPin = step === 'setup' ? pin : confirmPin;

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
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            {step === 'setup' ? (
              <Hash className="w-8 h-8 text-white" />
            ) : (
              <Check className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {step === 'setup' ? 'Set Your PIN' : 'Confirm Your PIN'}
          </h2>
          <p className="text-white/70 text-sm">
            {step === 'setup' 
              ? 'Choose a 4-digit PIN to secure your app' 
              : 'Enter your PIN again to confirm'
            }
          </p>
        </div>

        <div className="flex justify-center space-x-4 mb-12">
          {[...Array(4)].map((_, index) => (
            <motion.div
              key={index}
              className={`w-4 h-4 rounded-full ${
                index < currentPin.length 
                  ? 'bg-purple-400' 
                  : 'bg-white/20'
              }`}
              animate={{
                scale: index === currentPin.length - 1 && currentPin.length > 0 ? [1, 1.2, 1] : 1
              }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {numbers.slice(0, 3).map((item) => (
              <motion.button
                key={item.num}
                onClick={() => handleNumberClick(item.num)}
                disabled={isSettingUp}
                className="w-20 h-20 backdrop-blur-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-2xl flex flex-col items-center justify-center text-white transition-all duration-200 border border-white/10"
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-2xl font-medium">{item.num}</span>
                {item.letters && <span className="text-xs text-white/60 mt-1">{item.letters}</span>}
              </motion.button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {numbers.slice(3, 6).map((item) => (
              <motion.button
                key={item.num}
                onClick={() => handleNumberClick(item.num)}
                disabled={isSettingUp}
                className="w-20 h-20 backdrop-blur-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-2xl flex flex-col items-center justify-center text-white transition-all duration-200 border border-white/10"
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-2xl font-medium">{item.num}</span>
                <span className="text-xs text-white/60 mt-1">{item.letters}</span>
              </motion.button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {numbers.slice(6, 9).map((item) => (
              <motion.button
                key={item.num}
                onClick={() => handleNumberClick(item.num)}
                disabled={isSettingUp}
                className="w-20 h-20 backdrop-blur-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-2xl flex flex-col items-center justify-center text-white transition-all duration-200 border border-white/10"
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-2xl font-medium">{item.num}</span>
                <span className="text-xs text-white/60 mt-1">{item.letters}</span>
              </motion.button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div></div>
            <motion.button
              onClick={() => handleNumberClick('0')}
              disabled={isSettingUp}
              className="w-20 h-20 backdrop-blur-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-2xl flex items-center justify-center text-white transition-all duration-200 border border-white/10"
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-2xl font-medium">0</span>
            </motion.button>
            <motion.button
              onClick={handleDelete}
              disabled={isSettingUp || currentPin.length === 0}
              className="w-20 h-20 backdrop-blur-sm bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-2xl flex items-center justify-center text-white transition-all duration-200 border border-white/10"
              whileTap={{ scale: 0.95 }}
            >
              <Delete className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {isSettingUp && (
          <div className="text-center mt-6">
            <div className="text-white/70 text-sm">Setting up PIN...</div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
