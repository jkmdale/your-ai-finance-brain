import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Hash,
  Fingerprint,
  Shield,
  Zap,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AuthMethodSelectionProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const AuthMethodSelection: React.FC<AuthMethodSelectionProps> = ({
  onComplete,
  onSkip,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setupPin, setupBiometric, isBiometricAvailable, user } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, [isBiometricAvailable]);

  const saveUserPreference = async (method: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          login_preference: method,
          setup_completed: true,
        },
      });

      if (error) {
        console.error('Error saving user preference:', error);
        toast.error('Failed to save preference');
        return false;
      }

      localStorage.setItem(`security_method_${user.id}`, method);
      localStorage.setItem(`security_setup_${user.id}`, 'true');
      return true;
    } catch (err) {
      console.error('Unexpected error saving preference:', err);
      return false;
    }
  };

  const handleConfirm = async () => {
    if (!selectedMethod) return;

    if (selectedMethod === 'pin') {
      setLoading(true);
      alert('👣 Starting PIN setup');

      try {
        const result = await setupPin('1234'); // Replace with actual user PIN input later

        if (result?.error) {
          alert('❌ Error saving PIN: ' + result.error.message);
        } else {
          alert('✅ PIN saved successfully!');
          const success = await saveUserPreference('pin');
          if (success) onComplete();
        }
      } catch (err) {
        alert('❌ Unexpected error: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    if (selectedMethod === 'biometric') {
      setLoading(true);
      try {
        const result = await setupBiometric();
        if (result?.error) {
          toast.error('Failed to set up biometrics');
        } else {
          toast.success('Biometric setup complete!');
          const success = await saveUserPreference('biometric');
          if (success) onComplete();
        }
      } catch (err) {
        toast.error('Unexpected error setting up biometrics');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <motion.div className="space-y-6">
      <div className="text-center">
        <Shield className="mx-auto h-12 w-12 text-primary" />
        <h2 className="text-xl font-semibold mt-4">Secure Your App</h2>
        <p className="text-sm text-muted-foreground">
          Choose your preferred way to unlock the app
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant={selectedMethod === 'pin' ?