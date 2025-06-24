
import React from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthMode } from './types';

interface EmailConfirmationScreenProps {
  pendingEmail: string;
  onResendConfirmation: () => void;
  onModeChange: (mode: AuthMode) => void;
  loading: boolean;
}

const pageVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
};

export const EmailConfirmationScreen: React.FC<EmailConfirmationScreenProps> = ({
  pendingEmail,
  onResendConfirmation,
  onModeChange,
  loading
}) => {
  return (
    <motion.div
      key="email-confirmation"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-6 shadow-2xl max-h-screen overflow-hidden"
    >
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
        <p className="text-white/70 mb-3">
          We've sent a confirmation link to:
        </p>
        <p className="text-white font-medium">{pendingEmail}</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">Next steps:</p>
              <ul className="space-y-1 text-blue-200">
                <li>1. Check your email inbox (and spam folder)</li>
                <li>2. Click the confirmation link</li>
                <li>3. Return here to sign in</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          onClick={onResendConfirmation}
          disabled={loading}
          variant="outline"
          className="w-full border-white/20 text-slate-900 bg-white/90 hover:bg-white hover:text-slate-900 rounded-xl h-12"
        >
          {loading ? 'Sending...' : 'Resend confirmation email'}
        </Button>

        <Button
          onClick={() => onModeChange('email')}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12"
        >
          Back to Sign In
        </Button>
      </div>

      <div className="text-center">
        <button
          onClick={() => onModeChange('email-entry')}
          className="text-white/70 hover:text-white transition-colors duration-200"
        >
          ← Back to options
        </button>
      </div>
    </motion.div>
  );
};
