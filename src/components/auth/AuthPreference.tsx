
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Fingerprint, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

interface AuthPreferenceProps {
  onComplete: () => void;
  hasPin: boolean;
  hasBiometric: boolean;
}

export const AuthPreference: React.FC<AuthPreferenceProps> = ({ 
  onComplete, 
  hasPin, 
  hasBiometric 
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('email');
  const [loading, setLoading] = useState(false);

  const handleSavePreference = async () => {
    setLoading(true);
    
    try {
      // Store preference in localStorage for now
      localStorage.setItem('preferredAuthMethod', selectedMethod);
      toast.success('Authentication preference saved!');
      onComplete();
    } catch (error) {
      toast.error('Failed to save preference');
    } finally {
      setLoading(false);
    }
  };

  const authOptions = [
    {
      value: 'email',
      label: 'Email & Password',
      description: 'Sign in with your email and password',
      icon: Mail,
      available: true,
      color: 'from-purple-600 to-blue-600'
    },
    {
      value: 'pin',
      label: 'PIN Code',
      description: 'Quick access with your 4-digit PIN',
      icon: Lock,
      available: hasPin,
      color: 'from-green-600 to-emerald-600'
    },
    {
      value: 'biometric',
      label: 'Biometric',
      description: 'Use fingerprint or face recognition',
      icon: Fingerprint,
      available: hasBiometric,
      color: 'from-orange-600 to-red-600'
    }
  ];

  const availableOptions = authOptions.filter(option => option.available);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Choose Your Preferred Sign-In</h2>
          <p className="text-white/70">
            Select how you'd like to sign in next time you open the app
          </p>
        </div>

        <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod} className="space-y-4 mb-8">
          {availableOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <div key={option.value} className="relative">
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="peer sr-only"
                />
                <label
                  htmlFor={option.value}
                  className="flex items-center space-x-4 p-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer peer-checked:border-purple-400 peer-checked:bg-purple-500/20 transition-all duration-200"
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${option.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{option.label}</p>
                    <p className="text-white/60 text-sm">{option.description}</p>
                  </div>
                  <div className="w-4 h-4 border-2 border-white/40 rounded-full peer-checked:border-purple-400 peer-checked:bg-purple-400 transition-all duration-200"></div>
                </label>
              </div>
            );
          })}
        </RadioGroup>

        <Button
          onClick={handleSavePreference}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl h-12 flex items-center justify-center space-x-2"
        >
          {loading ? (
            <span>Saving...</span>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
};
