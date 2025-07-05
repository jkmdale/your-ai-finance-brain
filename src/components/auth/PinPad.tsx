import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Delete, ArrowRight } from 'lucide-react';

interface PinPadProps {
  onPinComplete: (pin: string) => void;
  loading: boolean;
  isSetup?: boolean;
  maxLength?: number;
}

export const PinPad: React.FC<PinPadProps> = ({ 
  onPinComplete, 
  loading, 
  isSetup = false,
  maxLength = 6
}) => {
  const [pin, setPin] = useState('');

  const handleNumberClick = (number: string) => {
    if (pin.length < maxLength && !loading) {
      const newPin = pin + number;
      setPin(newPin);
      
      if (newPin.length >= 4) {
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

  const handleSubmit = () => {
    if (pin.length >= 4 && !loading) {
      onPinComplete(pin);
      if (!isSetup) {
        setPin('');
      }
    }
  };

  // Number pad layout: 1-9, then special bottom row
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="max-w-xs mx-auto">
      {/* PIN Display */}
      <div className="flex justify-center space-x-3 mb-8">
        {[...Array(Math.max(4, pin.length))].map((_, index) => (
          <motion.div
            key={index}
            className={`w-4 h-4 rounded-full ${
              index < pin.length 
                ? 'bg-white shadow-lg shadow-white/20' 
                : 'bg-white/20 border border-white/30'
            }`}
            animate={{
              scale: index === pin.length - 1 && pin.length > 0 ? [1, 1.3, 1] : 1
            }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>

      {/* Number Pad - 3x4 Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* First 3 rows: 1-9 */}
        {numbers.map((number) => (
          <motion.button
            key={number}
            onClick={() => handleNumberClick(number)}
            disabled={loading}
            className="glass-button w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-semibold transition-all duration-200 border-white/20 hover:bg-white/20 disabled:opacity-50 touch-target"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            {number}
          </motion.button>
        ))}

        {/* Bottom row: Delete, 0, Submit */}
        <motion.button
          onClick={handleDelete}
          disabled={loading || pin.length === 0}
          className="glass-button w-16 h-16 rounded-2xl flex items-center justify-center text-white transition-all duration-200 border-white/20 hover:bg-white/20 disabled:opacity-30 touch-target"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
        >
          <Delete className="w-5 h-5" />
        </motion.button>

        <motion.button
          onClick={() => handleNumberClick('0')}
          disabled={loading}
          className="glass-button w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-semibold transition-all duration-200 border-white/20 hover:bg-white/20 disabled:opacity-50 touch-target"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
        >
          0
        </motion.button>

        <motion.button
          onClick={handleSubmit}
          disabled={loading || pin.length < 4}
          className="glass-button w-16 h-16 rounded-2xl flex items-center justify-center text-white transition-all duration-200 border-white/20 hover:bg-white/20 disabled:opacity-30 touch-target"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
        >
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>

      {loading && (
        <div className="text-center mt-6">
          <div className="text-white/70 text-sm">
            {isSetup ? 'Setting up PIN...' : 'Verifying PIN...'}
          </div>
        </div>
      )}
    </div>
  );
};