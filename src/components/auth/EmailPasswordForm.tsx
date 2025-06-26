
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthMode } from './types';

interface EmailPasswordFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  onSubmit: (isSignUp: boolean, additionalData?: { firstName?: string; lastName?: string; country?: string }) => void;
  onModeChange: (mode: AuthMode) => void;
  onHome?: () => void;
  loading: boolean;
  isSignUp: boolean;
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
  onHome,
  loading,
  isSignUp
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      onSubmit(true, { firstName, lastName, country });
    } else {
      onSubmit(false);
    }
  };

  return (
    <motion.div
      key={isSignUp ? "signup" : "email"}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl"
    >
      <div className="flex justify-between items-center mb-6">
        <div></div>
        {onHome && (
          <button
            onClick={onHome}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
          >
            <Home className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-800 to-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
          <Shield className="w-10 h-10 text-white/90" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-2xl"></div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p className="text-white/70">
          {isSignUp ? 'Join SmartFinanceAI to get started' : 'Sign in to your SmartFinanceAI account'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl h-12"
            required
          />
        </div>

        {isSignUp && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl h-12"
                required
              />
              <Input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl h-12"
                required
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl h-12"
                required
              />
            </div>
          </>
        )}

        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder-white/50 rounded-xl h-12 pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12"
        >
          {loading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Create Account' : 'Sign In')}
        </Button>
      </form>

      <div className="mt-8 text-center space-y-4">
        {!isSignUp && (
          <button
            onClick={() => onModeChange('email-entry')}
            className="text-white/70 hover:text-white transition-colors duration-200"
          >
            ← Back to login options
          </button>
        )}
        <div>
          <button
            onClick={() => onModeChange(isSignUp ? 'email' : 'signup')}
            className="text-white/70 hover:text-white transition-colors duration-200"
          >
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span className="text-purple-400 font-medium">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
