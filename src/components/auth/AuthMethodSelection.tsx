
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Hash, Fingerprint, ArrowRight, Shield, Zap, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AuthMethodSelectionProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const AuthMethodSelection: React.FC<AuthMethodSelectionProps> = ({ onComplete, onSkip }) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setupPin, setupBiometric, isBiometricAvailable } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  React.useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, [isBiometricAvailable]);

  const methods = [
    {
      id: 'email',
      title: 'Email + Password',
      description: 'Classic and reliable authentication',
      icon: Mail,
      color: 'from-slate-500 to-slate-600',
      benefits: ['Always available', 'Works everywhere', 'Easy to remember']
    },
    {
      id: 'pin',
      title: '4-6 Digit PIN',
      description: 'Quick and secure numeric code',
      icon: Hash,
      color: 'from-green-500 to-emerald-600',
      benefits: ['Lightning fast', 'Easy to type', 'Highly secure']
    },
    {
      id: 'biometric',
      title: 'Biometric',
      description: 'Fingerprint or Face ID',
      icon: Fingerprint,
      color: 'from-orange-500 to-red-500',
      benefits: ['Most secure', 'Instant access', 'No passwords to remember'],
      disabled: !biometricAvailable
    }
  ];

  const handleMethodSelect = async (methodId: string) => {
    if (methodId === 'email') {
      localStorage.setItem('preferredAuthMethod', 'email');
      onComplete();
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
        localStorage.setItem('preferredAuthMethod', 'biometric');
        toast.success('Biometric authentication set up successfully!');
        onComplete();
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
    localStorage.setItem('preferredAuthMethod', 'pin');
    toast.success('PIN set up successfully!');
    setLoading(false);
    onComplete();
  };

  if (selectedMethod === 'pin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
      <motion.div
        className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl max-w-4xl w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Choose Your Login Method</h1>
          <p className="text-white/70 text-lg">How would you like to sign in next time? You can change this later in settings.</p>
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
              onClick={() => !method.disabled && handleMethodSelect(method.id)}
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${method.color} rounded-2xl flex items-center justify-center mb-6 mx-auto`}>
                <method.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2 text-center">{method.title}</h3>
              <p className="text-white/70 text-center mb-4">{method.description}</p>
              
              <div className="space-y-2">
                {method.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-white/60">
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              {method.disabled && (
                <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center">
                  <span className="text-white/60 text-sm font-medium">Not Available</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={onSkip}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            disabled={loading}
          >
            Skip for Now
          </Button>
          <div className="text-white/60 text-sm text-center">
            💡 Choose PIN or Biometric for the fastest, most secure experience
          </div>
        </div>
      </motion.div>
    </div>
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
          {step === 'create' ? 'Enter your new PIN' : 'Confirm your PIN'}
        </p>
      </div>

      <div className="flex justify-center space-x-4 mb-8">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className={`w-4 h-4 rounded-full border-2 ${
              index < (step === 'create' ? pin.length : confirmPin.length)
                ? 'bg-white border-white' 
                : 'border-white/30'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((num, index) => (
          <button
            key={index}
            onClick={() => {
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
            className="w-16 h-16 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white text-xl font-semibold transition-colors duration-200"
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};
