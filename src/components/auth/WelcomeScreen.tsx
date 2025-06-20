
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Fingerprint, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthMode } from './types';

interface WelcomeScreenProps {
  email: string;
  hasPin: boolean;
  hasBiometric: boolean;
  biometricAvailable: boolean;
  onModeChange: (mode: AuthMode) => void;
  onPinAuth: () => void;
  onBiometricAuth: () => void;
  loading: boolean;
}

const pageVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  email,
  hasPin,
  hasBiometric,
  biometricAvailable,
  onModeChange,
  onPinAuth,
  onBiometricAuth,
  loading
}) => {
  const availableMethods = [];
  
  if (hasPin) availableMethods.push('pin');
  if (hasBiometric && biometricAvailable) availableMethods.push('biometric');
  availableMethods.push('email');

  return (
    <motion.div
      key="welcome"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl"
    >
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back!</h2>
        <p className="text-white/70 mb-2">Choose your preferred sign-in method for</p>
        <p className="text-purple-300 font-medium">{email}</p>
      </div>

      <div className="space-y-4">
        {hasPin && (
          <Button
            onClick={onPinAuth}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl h-12 flex items-center justify-center space-x-3"
          >
            <Hash className="w-5 h-5" />
            <span>{loading ? 'Authenticating...' : 'Use PIN'}</span>
          </Button>
        )}

        {hasBiometric && biometricAvailable && (
          <Button
            onClick={onBiometricAuth}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl h-12 flex items-center justify-center space-x-3"
          >
            <Fingerprint className="w-5 h-5" />
            <span>{loading ? 'Authenticating...' : 'Use Biometric'}</span>
          </Button>
        )}

        <Button
          onClick={() => onModeChange('email')}
          disabled={loading}
          variant="outline"
          className="w-full border-white/20 text-white hover:bg-white/10 rounded-xl h-12"
        >
          Use Email & Password
        </Button>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => onModeChange('email-entry')}
          className="text-white/70 hover:text-white transition-colors duration-200"
          disabled={loading}
        >
          ← Use different email
        </button>
      </div>
    </motion.div>
  );
};
