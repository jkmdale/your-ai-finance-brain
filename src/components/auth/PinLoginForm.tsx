import React from 'react';
import { motion } from 'framer-motion';
import { Home, Hash } from 'lucide-react';
import { PinPad } from './PinPad';
import { AuthMode } from './types';

interface PinLoginFormProps {
  email: string;
  onPinComplete: (pin: string) => void;
  onModeChange: (mode: AuthMode) => void;
  onHome?: () => void;
  loading: boolean;
}

const pageVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
};

export const PinLoginForm: React.FC<PinLoginFormProps> = ({
  email,
  onPinComplete,
  onModeChange,
  onHome,
  loading
}) => {
  return (
    <motion.div
      key="pin"
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
        <div className="w-16 h-16 app-gradient-purple rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Hash className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Enter PIN</h2>
        <p className="text-white/70 text-sm px-4">Enter your secure PIN code for</p>
        <p className="text-purple-300 font-medium text-sm truncate px-4">{email}</p>
      </div>

      <PinPad 
        onPinComplete={onPinComplete}
        loading={loading}
      />

      <div className="mt-8 text-center">
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