
import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthMode } from './types';

interface BiometricLoginFormProps {
  email: string;
  biometricAvailable: boolean;
  onBiometricAuth: () => void;
  onModeChange: (mode: AuthMode) => void;
  loading: boolean;
}

const pageVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
};

export const BiometricLoginForm: React.FC<BiometricLoginFormProps> = ({
  email,
  biometricAvailable,
  onBiometricAuth,
  onModeChange,
  loading
}) => {
  return (
    <motion.div
      key="biometric"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl"
    >
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Fingerprint className="w-10 h-10 text-white animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Biometric Login</h2>
        <p className="text-white/70">
          {biometricAvailable 
            ? `Use your fingerprint, face ID, or other biometric method for ${email}` 
            : 'Biometric authentication is not available on this device'
          }
        </p>
      </div>

      <div className="space-y-6">
        <Button
          onClick={onBiometricAuth}
          disabled={loading || !biometricAvailable}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl h-12 disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Authenticate'}
        </Button>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => onModeChange('email-entry')}
          className="text-white/70 hover:text-white transition-colors duration-200"
          disabled={loading}
        >
          ← Use different method
        </button>
      </div>
    </motion.div>
  );
};
