
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Delete, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PinPadProps {
  onPinComplete: (pin: string) => void;
  onClear?: () => void;
  maxLength?: number;
  loading?: boolean;
}

export const PinPad = ({ onPinComplete, onClear, maxLength = 4, loading = false }: PinPadProps) => {
  const [pin, setPin] = useState('');

  const handleNumberPress = (number: string) => {
    if (pin.length < maxLength && !loading) {
      const newPin = pin + number;
      setPin(newPin);
      
      if (newPin.length === maxLength) {
        setTimeout(() => onPinComplete(newPin), 100);
      }
    }
  };

  const handleBackspace = () => {
    if (!loading) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (!loading) {
      setPin('');
      onClear?.();
    }
  };

  const numbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '']
  ];

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* PIN Display */}
      <div className="flex justify-center space-x-4 mb-8">
        {Array.from({ length: maxLength }).map((_, index) => (
          <motion.div
            key={index}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              index < pin.length 
                ? 'bg-white border-white' 
                : 'border-white/30'
            }`}
            animate={{ 
              scale: index === pin.length - 1 ? [1, 1.2, 1] : 1 
            }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {numbers.map((row, rowIndex) =>
          row.map((number, colIndex) => (
            <motion.div key={`${rowIndex}-${colIndex}`} whileTap={{ scale: 0.95 }}>
              {number ? (
                <Button
                  onClick={() => handleNumberPress(number)}
                  disabled={loading}
                  variant="ghost"
                  className="w-16 h-16 text-2xl font-semibold text-white hover:bg-white/10 rounded-full border-2 border-white/20 hover:border-white/40 transition-all duration-200"
                >
                  {number}
                </Button>
              ) : (
                <div className="w-16 h-16" />
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-8">
        <Button
          onClick={handleClear}
          disabled={loading || pin.length === 0}
          variant="ghost"
          className="w-16 h-16 text-white hover:bg-white/10 rounded-full border-2 border-white/20 hover:border-white/40 transition-all duration-200"
        >
          <span className="text-sm font-medium">Clear</span>
        </Button>

        <Button
          onClick={handleBackspace}
          disabled={loading || pin.length === 0}
          variant="ghost"
          className="w-16 h-16 text-white hover:bg-white/10 rounded-full border-2 border-white/20 hover:border-white/40 transition-all duration-200"
        >
          <Delete className="w-6 h-6" />
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center mt-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
};
