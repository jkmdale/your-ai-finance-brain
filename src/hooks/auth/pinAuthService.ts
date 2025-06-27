import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { PinSecurityService } from '@/services/pinSecurityService';

export const pinAuthService = {
  setupPin: async (pin: string, user: User | null) => {
    if (!user) {
      return { error: 'No authenticated user.' };
    }

    try {
      const { hash, salt } = await PinSecurityService.hashPin(pin);

      const { error } = await supabase
        .from('user_pins')
        .upsert({
          user_id: user.id,
          pin_hash: hash,
          salt: salt
        }, { onConflict: ['user_id'] });

      if (error) {
        console.error('Error saving PIN:', error);
        return { error: 'Failed to save PIN.' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error setting up PIN:', error);
      return { error: 'Failed to hash or save PIN.' };
    }
  },

  signInWithPin: async (email: string, pin: string) => {
    try {
      // Get user from email
      const { data: userData, error: userError } = await supabase
        .from('user_pins')
        .select('user_id, pin_hash, salt')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error('User PIN record not found:', userError);
        return { error: 'Invalid email or PIN.' };
      }

      const { user_id, pin_hash, salt } = userData;

      const isValid = await PinSecurityService.verifyPin(pin, pin_hash, salt);
      if (!isValid) {
        return { error: 'Incorrect PIN.' };
      }

      // Get the actual user by ID and sign in using a secure method (you may customize this)
      const { data: userInfo, error: fetchError } = await supabase.auth.admin.getUserById(user_id);
      if (fetchError || !userInfo) {
        return { error: 'Failed to fetch user account.' };
      }

      // Implement your actual sign-in logic here
      return { success: true };
    } catch (err) {
      console.error('PIN login error:', err);
      return { error: 'An error occurred during PIN login.' };
    }
  }
};