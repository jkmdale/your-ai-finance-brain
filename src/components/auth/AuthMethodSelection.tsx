
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Hash, Fingerprint, Shield, Zap, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AuthMethodSelectionProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const AuthMethodSelection: React.FC<AuthMethodSelectionProps> = ({ onComplete, onSkip }) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setupPin, setupBiometric, isBiometricAvailable, user } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  React.useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, [isBiometricAvailable]);

  const saveUserPreference = async (method: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          login_preference: method,
          setup_completed: true
        }
      });
      
      if (error) {
        console.error('Error saving user preference:', error);
        toast.error('Failed to save preference');
        return false;
      }
      
      localStorage.setItem('preferredAuthMethod', method);
      return true;
    } catch (error) {
      console.error('Error updating user metadata:', error);
      return false;
    }
  };

  const methods = [
    {
      id: 'email',
      title: 'Email & Password',
      subtitle: 'Reliable & Universal',
      description: 'Works everywhere, always available',
      icon: Mail,
      color: 'from-blue-500 to-blue-600',
      benefits: ['Works on any device', 'Always available', 'No setup required']
    },
    {
      id: 'pin',
      title: '4-6 Digit PIN',
      subtitle: 'Quick & Secure',
      description: 'Fast numeric authentication',
      icon: Hash,
      color: 'from-green-500 to-emerald-600',
      benefits: ['Lightning fast', 'Easy to remember', 'Works offline']
    },
    {
      id: 'biometric',
      title: 'Biometric Login',
      subtitle: 'Fingerprint/Face ID',
      description: 'Most secure, instant access',
      icon: Fingerprint,
      color: 'from-orange-500 to-red-500',
      benefits: ['Most secure', 'Instant unlock', 'Passwordless'],
      disabled: !biometricAvailable,
      tooltip: !biometricAvailable ? 'Not available on this device' : undefined
    }
  ];

  const handleMethodSelect = async (methodId: string) => {
    if (methodId === 'email') {
      const success = await saveUserPreference('email');
      if (success) {
        toast.success('Email authentication selected as your preferred method');
        onComplete();
      }
      return;
    }

    setLoading(true);
    setSelectedMethod(methodId);

    try {
      if (methodId === 'pin') {
        // This will be handled by the PIN setup component
        return;
      } else if (methodId === 'biometric') {
        const { error } = await setupBiometric();
        if (error) {
          toast.error(error);
          setLoading(false);
          setSelectedMethod(null);
          return;
        }
        
        const success = await saveUserPreference('biometric');
        if (success) {
          toast.success('Biometric authentication set up successfully!');
          onComplete();
        } else {
          setLoading(false);
          setSelectedMethod(null);
        }
      }
    } catch (error) {
      toast.error('Failed to set up authentication method');
      setLoading(false);
      setSelectedMethod(null);
    }
  };

  const handlePinSetup = async (pin: string) => {
    const { error } = await setupPin(pin);
    if (error) {
      toast.error('Failed to set up PIN');
      setLoading(false);
      setSelectedMethod(null);
      return;
    }
    
    const success = await saveUserPreference('pin');
    if (success) {
      toast.success('PIN set up successfully!');
      setLoading(false);
      onComplete();
    } else {
      setLoading(false);
      setSelectedMethod(null);
    }
  };

  if (selectedMethod === 'pin') {
    return (
      <motion.div
        className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl max-w-md w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Create Your PIN</h2>
          <p className="text-white/70">Choose a 4-6 digit PIN for quick access</p>
        </div>

        <PinSetup onPinComplete={handlePinSetup} loading={loading} />

        <div className="mt-6 text-center">
          <button
            onClick={() => setSelectedMethod(null)}
            className="text-white/70 hover:text-white transition-colors"
            disabled={loading}
          >
            ← Back to options
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl max-w-4xl w-full"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to Smart Finance AI!</h1>
        <h2 className="text-xl font-semibold text-white/90 mb-3">How would you like to sign in next time?</h2>
        <p className="text-white/70 text-lg">Choose your preferred authentication method. You can always change this later in settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {methods.map((method) => (
          <motion.div
            key={method.id}
            className={`relative backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/30 ${
              method.disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            whileHover={method.disabled ? {} : { scale: 1.02 }}
            whileTap={method.disabled ? {} : { scale: 0.98 }}
            onClick={() => !method.disabled && !loading && handleMethodSelect(method.id)}
            title={method.tooltip}
          >
            <div className={`w-14 h-14 bg-gradient-to-br ${method.color} rounded-2xl flex items-center justify-center mb-4 mx-auto`}>
              <method.icon className="w-7 h-7 text-white" />
            </div>
            
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-white mb-1">{method.title}</h3>
              <p className="text-purple-300 text-sm font-medium mb-2">{method.subtitle}</p>
              <p className="text-white/70 text-sm">{method.description}</p>
            </div>
            
            <div className="space-y-2">
              {method.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-2 text-xs text-white/60">
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full flex-shrink-0"></div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {method.disabled && (
              <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center">
                <span className="text-white/60 text-sm font-medium">Not Available</span>
              </div>
            )}

            {loading && selectedMethod === method.id && (
              <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="text-center">
        <Button
          onClick={async () => {
            const success = await saveUserPreference('email');
            if (success) {
              onSkip();
            }
          }}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
          disabled={loading}
        >
          I'll choose later (default to Email & Password)
        </Button>
        <p className="text-white/50 text-sm mt-3">
          💡 Tip: PIN and Biometric logins are faster and more secure than passwords
        </p>
      </div>
    </motion.div>
  );
};

// Simple PIN setup component
const PinSetup: React.FC<{ onPinComplete: (pin: string) => void; loading: boolean }> = ({ onPinComplete, loading }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');

  const handlePinInput = (value: string) => {
    if (step === 'create') {
      setPin(value);
      if (value.length >= 4) {
        setTimeout(() => setStep('confirm'), 100);
      }
    } else {
      setConfirmPin(value);
      if (value.length >= 4) {
        if (value === pin) {
          onPinComplete(value);
        } else {
          toast.error('PINs do not match. Please try again.');
          setPin('');
          setConfirmPin('');
          setStep('create');
        }
      }
    }
  };

  return (
    <div className="max-w-xs mx-auto">
      <div className="text-center mb-6">
        <p className="text-white/70 text-sm">
          {step === 'create' ? 'Enter your new PIN (4-6 digits)' : 'Confirm your PIN'}
        </p>
      </div>

      <div className="flex justify-center space-x-3 mb-8">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full border-2 transition-all ${
              index < (step === 'create' ? pin.length : confirmPin.length)
                ? 'bg-green-400 border-green-400 scale-110' 
                : 'border-white/30'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((num, index) => (
          <button
            key={index}
            onClick={() => {
              if (loading) return;
              
              if (num === '⌫') {
                if (step === 'create') {
                  setPin(pin.slice(0, -1));
                } else {
                  setConfirmPin(confirmPin.slice(0, -1));
                }
              } else if (num !== '') {
                const currentPin = step === 'create' ? pin : confirmPin;
                if (currentPin.length < 6) {
                  handlePinInput(currentPin + num);
                }
              }
            }}
            disabled={loading || num === ''}
            className="w-14 h-14 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center text-white text-lg font-semibold transition-colors duration-200"
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};
