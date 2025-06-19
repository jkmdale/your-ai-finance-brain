
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

interface PinPadProps {
  onPinComplete: (pin: string) => void;
  loading: boolean;
  isSetup?: boolean;
}

export const PinPad: React.FC<PinPadProps> = ({ onPinComplete, loading, isSetup = false }) => {
  const [pin, setPin] = useState('');

  const handleNumberClick = (number: string) => {
    if (pin.length < 4 && !loading) {
      const newPin = pin + number;
      setPin(newPin);
      
      if (newPin.length === 4) {
        setTimeout(() => {
          onPinComplete(newPin);
          if (!isSetup) {
            setPin(''); // Clear PIN after completion for login, but not for setup
          }
        }, 100);
      }
    }
  };

  const handleDelete = () => {
    if (!loading) {
      setPin(pin.slice(0, -1));
    }
  };

  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="max-w-xs mx-auto">
      {/* PIN Display */}
      <div className="flex justify-center space-x-4 mb-8">
        {[...Array(4)].map((_, index) => (
          <motion.div
            key={index}
            className={`w-4 h-4 rounded-full border-2 ${
              index < pin.length 
                ? 'bg-white border-white' 
                : 'border-white/30'
            }`}
            animate={{
              scale: index === pin.length - 1 && pin.length > 0 ? [1, 1.2, 1] : 1
            }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {numbers.slice(0, 9).map((number) => (
          <motion.button
            key={number}
            onClick={() => handleNumberClick(number)}
            disabled={loading}
            className="w-16 h-16 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white text-xl font-semibold transition-colors duration-200"
            whileTap={{ scale: 0.95 }}
          >
            {number}
          </motion.button>
        ))}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-4">
        <div /> {/* Empty space */}
        <motion.button
          onClick={() => handleNumberClick('0')}
          disabled={loading}
          className="w-16 h-16 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white text-xl font-semibold transition-colors duration-200"
          whileTap={{ scale: 0.95 }}
        >
          0
        </motion.button>
        <motion.button
          onClick={handleDelete}
          disabled={loading || pin.length === 0}
          className="w-16 h-16 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white transition-colors duration-200"
          whileTap={{ scale: 0.95 }}
        >
          <Delete className="w-5 h-5" />
        </motion.button>
      </div>

      {loading && (
        <div className="text-center mt-4">
          <div className="text-white/70 text-sm">
            {isSetup ? 'Setting up PIN...' : 'Verifying PIN...'}
          </div>
        </div>
      )}
    </div>
  );
};
