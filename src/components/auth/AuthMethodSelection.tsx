
import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Hash, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthMethodSelectionProps {
  onSelectMethod: (method: 'pin' | 'biometric') => void;
  availableMethods: {
    pin: boolean;
    biometric: boolean;
  };
}

export const AuthMethodSelection: React.FC<AuthMethodSelectionProps> = ({
  onSelectMethod,
  availableMethods
}) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4 z-50">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ArrowRight className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Choose Sign-In Method</h2>
          <p className="text-white/70 text-sm">Select your preferred way to unlock the app</p>
        </div>

        <div className="space-y-4">
          {availableMethods.pin && (
            <motion.button
              onClick={() => onSelectMethod('pin')}
              className="w-full backdrop-blur-sm bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-6 flex items-center space-x-4 text-white transition-all duration-200"
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                <Hash className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold">PIN Code</h3>
                <p className="text-white/60 text-sm">Use your 4-digit PIN</p>
              </div>
              <ArrowRight className="w-5 h-5 text-white/40" />
            </motion.button>
          )}

          {availableMethods.biometric && (
            <motion.button
              onClick={() => onSelectMethod('biometric')}
              className="w-full backdrop-blur-sm bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-6 flex items-center space-x-4 text-white transition-all duration-200"
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold">Biometric</h3>
                <p className="text-white/60 text-sm">Use fingerprint or face unlock</p>
              </div>
              <ArrowRight className="w-5 h-5 text-white/40" />
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
