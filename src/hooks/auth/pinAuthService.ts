
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { PinSecurityService } from '@/services/pinSecurityService';

export const pinAuthService = {
  setupPin: async (pin: string, user: User | null) => {
    console.log('🔵 PIN Setup - Starting process');
    console.log('🔵 PIN Setup - User provided:', !!user);
    console.log('🔵 PIN Setup - User ID:', user?.id);
    console.log('🔵 PIN Setup - PIN length:', pin?.length);

    if (!user) {
      console.error('❌ PIN Setup - No authenticated user');
      return { error: 'No authenticated user.' };
    }

    if (!pin || pin.length !== 4) {
      console.error('❌ PIN Setup - Invalid PIN format');
      return { error: 'PIN must be 4 digits.' };
    }

    try {
      console.log('🔵 PIN Setup - Starting PIN hashing');
      const { hash, salt } = await PinSecurityService.hashPin(pin);
      console.log('✅ PIN Setup - PIN hashed successfully');
      console.log('🔵 PIN Setup - Hash length:', hash?.length);
      console.log('🔵 PIN Setup - Salt length:', salt?.length);

      console.log('🔵 PIN Setup - Attempting database upsert');
      console.log('🔵 PIN Setup - Data to insert:', {
        user_id: user.id,
        pin_hash: hash ? '***HASH***' : null,
        salt: salt ? '***SALT***' : null
      });

      const { data, error } = await supabase
        .from('user_pins')
        .upsert({
          user_id: user.id,
          pin_hash: hash,
          salt: salt
        }, { 
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select();

      console.log('🔵 PIN Setup - Database response data:', data);
      console.log('🔵 PIN Setup - Database response error:', error);

      if (error) {
        console.error('❌ PIN Setup - Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return { error: `Database error: ${error.message}` };
      }

      console.log('✅ PIN Setup - Successfully saved to database');
      return { success: true };
    } catch (error) {
      console.error('❌ PIN Setup - Unexpected error:', error);
      return { error: `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
