
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { PinSecurityService } from '@/services/pinSecurityService';

export const pinAuthService = {
  setupPin: async (pin: string, user: User | null) => {
    console.log('🔵 PIN Setup - Starting process');
    console.log('🔵 PIN Setup - User provided:', !!user);
    console.log('🔵 PIN Setup - User ID:', user?.id);
    console.log('🔵 PIN Setup - User Email:', user?.email);
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

      // Step 2: Use explicit INSERT/UPDATE instead of upsert to avoid RLS conflicts
      console.log('🔵 PIN Setup - Checking for existing PIN');
      
      // First check if user already has a PIN
      const { data: existingPin, error: checkError } = await supabase
        .from('user_pins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('❌ PIN Setup - Error checking existing PIN:', checkError);
        return { error: `Failed to check existing PIN: ${checkError.message}` };
      }

      let result;
      if (existingPin) {
        console.log('🔵 PIN Setup - Updating existing PIN');
        // Update existing PIN - using correct column name 'salt'
        result = await supabase
          .from('user_pins')
          .update({
            pin_hash: hash,
            salt: salt,
            user_email: user.email,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select();
      } else {
        console.log('🔵 PIN Setup - Creating new PIN');
        // Insert new PIN - using correct column name 'salt'
        result = await supabase
          .from('user_pins')
          .insert({
            user_id: user.id,
            pin_hash: hash,
            salt: salt,
            user_email: user.email
          })
          .select();
      }

      const { data, error } = result;

      console.log('🔵 PIN Setup - Database operation result:', { data, error });

      if (error) {
        console.error('❌ PIN Setup - Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return { error: `Database error: ${error.message}` };
      }

      if (!data || data.length === 0) {
        console.error('❌ PIN Setup - No data returned from database operation');
        return { error: 'PIN setup failed - no data returned' };
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

    if (!email || !pin) {
      console.error('❌ PIN Sign In - Missing email or PIN');
      return { error: 'Email and PIN are required.' };
    }

    try {
      console.log('🔵 PIN Sign In - Querying database for user PIN data');
      // Get user PIN data from email - using correct column name 'salt'
      const { data: userData, error: userError } = await supabase
        .from('user_pins')
        .select('user_id, pin_hash, salt')
        .eq('user_email', email)
        .maybeSingle();

      console.log('🔵 PIN Sign In - Database query result:', { 
        hasData: !!userData, 
        error: userError 
      });

      if (userError) {
        console.error('❌ PIN Sign In - Database error:', userError);
        return { error: 'Invalid email or PIN.' };
      }

      if (!userData) {
        console.error('❌ PIN Sign In - No user data found for email:', email);
        return { error: 'Invalid email or PIN.' };
      }

      const { user_id, pin_hash, salt } = userData;

      if (!user_id || !pin_hash || !salt) {
        console.error('❌ PIN Sign In - Incomplete user data:', { 
          user_id: !!user_id, 
          pin_hash: !!pin_hash, 
          salt: !!salt 
        });
        return { error: 'Invalid user data. Please contact support.' };
      }

      console.log('🔵 PIN Sign In - Verifying PIN against stored hash');
      const isValid = await PinSecurityService.verifyPin(pin, pin_hash, salt);
      
      if (!isValid) {
        console.error('❌ PIN Sign In - PIN verification failed');
        return { error: 'Incorrect PIN.' };
      }

      console.log('✅ PIN Sign In - PIN verified successfully for user:', user_id);
      return { error: null };
    } catch (err) {
      console.error('❌ PIN Sign In - Unexpected error:', err);
      return { error: 'An error occurred during PIN login.' };
    }
  }
};
