
import { supabase } from '@/integrations/supabase/client';
import { PinSecurityService } from '@/services/pinSecurityService';

export const pinAuthService = {
  async setupPin(pin: string, user: any) {
    console.log('Setting up PIN for user:', user?.email);
    
    if (!user) {
      console.log('No user logged in');
      return { error: 'No user logged in' };
    }
    
    if (!PinSecurityService.isValidPin(pin)) {
      console.log('Invalid PIN format');
      return { error: 'PIN must be 4-8 digits long' };
    }

    const strength = PinSecurityService.estimatePinStrength(pin);
    if (strength === 'weak') {
      console.log('PIN is too weak');
      return { error: 'PIN is too weak. Avoid common patterns like 1234 or repeated digits.' };
    }

    try {
      console.log('Hashing PIN...');
      const { hash, salt } = await PinSecurityService.hashPin(pin);
      
      console.log('Storing PIN in database...');
      const { error } = await supabase
        .from('user_pins')
        .upsert({ 
          user_id: user.id, 
          pin_hash: hash,
          pin_salt: salt,
          user_email: user.email 
        });
      
      if (error) {
        console.log('Database error:', error);
        return { error: error.message };
      }
      
      console.log('PIN setup successful');
      return { error: null };
    } catch (error: any) {
      console.error('PIN setup error:', error);
      return { error: error.message || 'Failed to set up PIN' };
    }
  },

  async signInWithPin(pin: string, email: string) {
    console.log('Attempting PIN authentication for:', email);
    
    if (!PinSecurityService.isValidPin(pin)) {
      return { error: 'Invalid PIN format' };
    }

    try {
      // Get the stored PIN data for this user - handle potential query errors
      const { data: userData, error: userError } = await supabase
        .from('user_pins')
        .select('pin_hash, pin_salt, user_id')
        .eq('user_email', email)
        .maybeSingle();

      if (userError) {
        console.log('Database error querying PIN data:', userError);
        return { error: 'Database error occurred during authentication' };
      }

      if (!userData) {
        console.log('No PIN found for user:', email);
        return { error: 'No PIN set up for this account' };
      }

      // Verify PIN using secure comparison - handle null salt
      const isValid = await PinSecurityService.verifyPin(
        pin, 
        userData.pin_hash, 
        userData.pin_salt || ''
      );
      
      if (!isValid) {
        console.log('PIN verification failed');
        return { error: 'Invalid PIN' };
      }

      console.log('PIN verification successful');
      
      // Generate magic link for authentication
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      
      // Auto-sign in using the generated link
      const { error: signInError } = await supabase.auth.verifyOtp({
        email: email,
        token: data.properties?.email_otp || '',
        type: 'email'
      });
      
      if (signInError) {
        console.log('Auto sign-in failed:', signInError);
        return { error: 'Authentication failed' };
      }
      
      return { error: null };
    } catch (error: any) {
      console.log('PIN authentication error:', error);
      return { error: 'Authentication failed' };
    }
  }
};
