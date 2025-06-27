
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
      
      const { data, error } = await supabase
        .from('user_pins')
        .upsert({
          user_id: user.id,
          pin_hash: hash,
          salt: salt,
          user_email: user.email
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
      return { error: null };
    } catch (error) {
      console.error('❌ PIN Setup - Unexpected error:', error);
      return { error: `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  },

  signInWithPin: async (pin: string, email: string) => {
    console.log('🔵 PIN Sign In - Starting process');
    console.log('🔵 PIN Sign In - Email:', email);
    console.log('🔵 PIN Sign In - PIN length:', pin?.length);

    try {
      // Get user PIN data from email
      const { data: userData, error: userError } = await supabase
        .from('user_pins')
        .select('user_id, pin_hash, salt')
        .eq('user_email', email)
        .single();

      console.log('🔵 PIN Sign In - Database query result:', { userData, userError });

      if (userError) {
        console.error('❌ PIN Sign In - Database error:', userError);
        return { error: 'Invalid email or PIN.' };
      }

      if (!userData) {
        console.error('❌ PIN Sign In - No user data found');
        return { error: 'Invalid email or PIN.' };
      }

      const { user_id, pin_hash, salt } = userData;

      if (!user_id || !pin_hash || !salt) {
        console.error('❌ PIN Sign In - Incomplete user data:', { user_id: !!user_id, pin_hash: !!pin_hash, salt: !!salt });
        return { error: 'Invalid user data. Please contact support.' };
      }

      console.log('🔵 PIN Sign In - Verifying PIN');
      const isValid = await PinSecurityService.verifyPin(pin, pin_hash, salt);
      
      if (!isValid) {
        console.error('❌ PIN Sign In - PIN verification failed');
        return { error: 'Incorrect PIN.' };
      }

      console.log('✅ PIN Sign In - PIN verified successfully');
      return { error: null };
    } catch (err) {
      console.error('❌ PIN Sign In - Unexpected error:', err);
      return { error: 'An error occurred during PIN login.' };
    }
  }
};
