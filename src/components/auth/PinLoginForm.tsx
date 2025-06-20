
import React from 'react';
import { motion } from 'framer-motion';
import { PinPad } from './PinPad';
import { AuthMode } from './types';

interface PinLoginFormProps {
  email: string;
  onPinComplete: (pin: string) => void;
  onModeChange: (mode: AuthMode) => void;
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
  loading
}) => {
  return (
    <motion.div
      key="pin"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Enter PIN</h2>
        <p className="text-white/70">Enter your secure PIN code for {email}</p>
      </div>

      <PinPad 
        onPinComplete={onPinComplete}
        loading={loading}
      />

      <div className="mt-8 text-center">
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
