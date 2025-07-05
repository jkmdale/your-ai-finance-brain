import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthMode } from './types';

interface BiometricLoginFormProps {
  email: string;
  biometricAvailable: boolean;
  onBiometricAuth: () => void;
  onModeChange: (mode: AuthMode) => void;
  onHome?: () => void;
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
  onHome,
  loading
}) => {
  return (
    <motion.div
      key="biometric"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="glass-card rounded-3xl p-8 max-w-sm w-full safe-area-bottom"
    >
      <div className="flex justify-between items-center mb-6">
        <div></div>
        {onHome && (
          <button
            onClick={onHome}
            className="p-3 text-white/70 hover:text-white glass-button rounded-xl transition-all duration-200 touch-target"
          >
            <Home className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="text-center mb-8">
        <div className="w-20 h-20 app-gradient-blue rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Fingerprint className="w-10 h-10 text-white animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Biometric Login</h2>
        <p className="text-white/70 text-sm px-4 mb-2">
          {biometricAvailable 
            ? 'Use your fingerprint, face ID, or other biometric method' 
            : 'Biometric authentication is not available on this device'
          }
        </p>
        <p className="text-blue-300 font-medium text-sm truncate px-4">{email}</p>
      </div>

      <div className="space-y-6">
        <Button
          onClick={onBiometricAuth}
          disabled={loading || !biometricAvailable}
          variant="glass-secondary"
          size="touch"
          className="w-full"
        >
          <Fingerprint className="w-5 h-5" />
          {loading ? 'Authenticating...' : 'Authenticate'}
        </Button>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => onModeChange('email-entry')}
          className="text-white/70 hover:text-white transition-colors duration-200 text-sm touch-target py-2"
          disabled={loading}
        >
          ← Use different method
        </button>
      </div>
    </motion.div>
  );
};