
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthMode } from './types';

interface EmailPasswordFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  onSubmit: (isSignUp: boolean) => void;
  onModeChange: (mode: AuthMode) => void;
  loading: boolean;
  isSignUp?: boolean;
}

const pageVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
};

export const EmailPasswordForm: React.FC<EmailPasswordFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  onModeChange,
  loading,
  isSignUp = false
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <motion.div
      key={isSignUp ? 'signup' : 'email'}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>
        <p className="text-white/70">
          {isSignUp ? 'Join SmartFinanceAI today' : 'Enter your credentials to continue'}
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl h-12"
          />
        </div>

        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl h-12 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <Button
          onClick={() => onSubmit(isSignUp)}
          disabled={loading}
          className={`w-full ${
            isSignUp 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
          } text-white rounded-xl h-12`}
        >
          {loading 
            ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
            : (isSignUp ? 'Create Account' : 'Sign In')
          }
        </Button>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => onModeChange('email-entry')}
          className="text-white/70 hover:text-white transition-colors duration-200"
        >
          {isSignUp ? '← Back to login' : '← Back'}
        </button>
      </div>
    </motion.div>
  );
};
