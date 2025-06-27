import { supabase } from '@/integrations/supabase/client';
import { generatePinHash } from '@/services/pinSecurityService'; // assumes you have this function

export const pinAuthService = {
  async setupPin(pin: string, user: any) {
    console.log('=== PIN SETUP START ===');
    console.log('Setting up PIN for user:', user?.email, 'ID:', user?.id);

    if (!user || !user.id || !user.email) {
      console.error('❌ No valid user provided to setupPin');
      return { error: 'User not signed in' };
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || !session.user || session.user.id !== user.id) {
        console.error('❌ Session error or mismatch');
        return { error: 'User session mismatch or invalid' };
      }

      console.log('✓ Auth verified. Generating hash...');
      const { hash, salt } = await generatePinHash(pin);
      console.log('✓ Hash and salt generated');

      const { error: dbError } = await supabase.from('user_pins').upsert({
        user_id: user.id,
        user_email: user.email,
        pin_hash: hash,
        pin_salt: salt,
      });

      if (dbError) {
        console.error('❌ Failed to upsert PIN to Supabase:', dbError.message);
        return { error: dbError.message };
      }

      console.log('✅ PIN stored successfully');
      return { success: true };
    } catch (err: any) {
      console.error('❌ Unexpected error in setupPin:', err.message);
      return { error: 'Unexpected error setting PIN' };
    }
  },

  async signInWithPin(pin: string, user: any) {
    console.log('🔓 Starting PIN sign-in...');

    if (!user || !user.email) {
      return { error: 'User email is required' };
    }

    try {
      const { data, error } = await supabase
        .from('user_pins')
        .select('pin_hash, pin_salt')
        .eq('user_email', user.email)
        .single();

      if (error) {
        return { error: 'Failed to retrieve stored PIN' };
      }

      const isValid = await generatePinHash.validate(pin, data.pin_hash, data.pin_salt);
      return isValid ? { success: true } : { error: 'Incorrect PIN' };
    } catch (err: any) {
      console.error('PIN sign-in error:', err.message);
      return { error: 'PIN sign-in failed' };
    }
  },
};