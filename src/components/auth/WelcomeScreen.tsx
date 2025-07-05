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
  userPreference?: string | null;
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
  loading,
  userPreference
}) => {
  const availableMethods = [];
  
  if (hasPin) availableMethods.push('pin');
  if (hasBiometric && biometricAvailable) availableMethods.push('biometric');
  availableMethods.push('email');

  // Determine the primary method based on user preference
  const primaryMethod = userPreference || 'email';

  const getMethodInfo = (method: string) => {
    switch (method) {
      case 'pin':
        return {
          title: 'Use PIN',
          icon: Hash,
          variant: 'glass-primary' as const,
          action: onPinAuth
        };
      case 'biometric':
        return {
          title: 'Use Biometric',
          icon: Fingerprint,
          variant: 'glass-secondary' as const,
          action: onBiometricAuth
        };
      default:
        return {
          title: 'Use Email & Password',
          icon: Shield,
          variant: 'glass-primary' as const,
          action: () => onModeChange('email')
        };
    }
  };

  const primaryMethodInfo = getMethodInfo(primaryMethod);

  return (
    <motion.div
      key="welcome"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="glass-card rounded-3xl p-8 max-w-sm w-full safe-area-bottom"
    >
      <div className="text-center mb-8">
        <div className="w-20 h-20 app-gradient-purple rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back!</h2>
        <p className="text-white/70 mb-2 text-sm">Choose your preferred sign-in method for</p>
        <p className="text-purple-300 font-medium text-sm truncate px-4">{email}</p>
        {userPreference && (
          <p className="text-white/50 text-xs mt-2">
            Preferred: {userPreference.charAt(0).toUpperCase() + userPreference.slice(1)}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {/* Primary preferred method */}
        {(primaryMethod === 'pin' && hasPin) && (
          <Button
            onClick={primaryMethodInfo.action}
            disabled={loading}
            variant={primaryMethodInfo.variant}
            size="touch"
            className="w-full"
          >
            <primaryMethodInfo.icon className="w-5 h-5" />
            <span>{loading ? 'Authenticating...' : `${primaryMethodInfo.title} (Preferred)`}</span>
          </Button>
        )}

        {(primaryMethod === 'biometric' && hasBiometric && biometricAvailable) && (
          <Button
            onClick={primaryMethodInfo.action}
            disabled={loading}
            variant={primaryMethodInfo.variant}
            size="touch"
            className="w-full"
          >
            <primaryMethodInfo.icon className="w-5 h-5" />
            <span>{loading ? 'Authenticating...' : `${primaryMethodInfo.title} (Preferred)`}</span>
          </Button>
        )}

        {/* Alternative methods */}
        {hasPin && primaryMethod !== 'pin' && (
          <Button
            onClick={onPinAuth}
            disabled={loading}
            variant="glass-outline"
            size="touch"
            className="w-full"
          >
            <Hash className="w-5 h-5" />
            <span>{loading ? 'Authenticating...' : 'Use PIN'}</span>
          </Button>
        )}

        {hasBiometric && biometricAvailable && primaryMethod !== 'biometric' && (
          <Button
            onClick={onBiometricAuth}
            disabled={loading}
            variant="glass-outline"
            size="touch"
            className="w-full"
          >
            <Fingerprint className="w-5 h-5" />
            <span>{loading ? 'Authenticating...' : 'Use Biometric'}</span>
          </Button>
        )}

        {primaryMethod !== 'email' && (
          <Button
            onClick={() => onModeChange('email')}
            disabled={loading}
            variant="glass-outline"
            size="touch"
            className="w-full"
          >
            Use Email & Password
          </Button>
        )}

        {primaryMethod === 'email' && (
          <Button
            onClick={() => onModeChange('email')}
            disabled={loading}
            variant="glass-primary"
            size="touch"
            className="w-full"
          >
            {loading ? 'Authenticating...' : 'Use Email & Password (Preferred)'}
          </Button>
        )}
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => onModeChange('email-entry')}
          className="text-white/70 hover:text-white transition-colors duration-200 text-sm touch-target py-2"
          disabled={loading}
        >
          ← Use different email
        </button>
      </div>
    </motion.div>
  );
};