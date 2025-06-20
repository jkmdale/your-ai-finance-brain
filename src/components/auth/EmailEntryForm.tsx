
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthMode } from './types';

interface EmailEntryFormProps {
  email: string;
  setEmail: (email: string) => void;
  onContinue: () => void;
  onModeChange: (mode: AuthMode) => void;
  loading: boolean;
}

const pageVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
};

export const EmailEntryForm: React.FC<EmailEntryFormProps> = ({
  email,
  setEmail,
  onContinue,
  onModeChange,
  loading
}) => {
  return (
    <motion.div
      key="email-entry"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl"
    >
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-800 to-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
          <Shield className="w-10 h-10 text-white/90" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-2xl"></div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Secure Login Required</h1>
        <p className="text-white/70">Enter your email to see login options</p>
      </div>

      <div className="space-y-6">
        <div>
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl h-12"
          />
        </div>

        <Button
          onClick={onContinue}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12"
        >
          {loading ? 'Checking...' : 'Continue'}
        </Button>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => onModeChange('signup')}
          className="text-white/70 hover:text-white transition-colors duration-200"
        >
          Don't have an account? <span className="text-purple-400 font-medium">Sign up</span>
        </button>
      </div>
    </motion.div>
  );
};
