
import { supabase } from '@/integrations/supabase/client';
import { PinSecurityService } from '@/services/pinSecurityService';

export const pinAuthService = {
  async setupPin(pin: string, user: any) {
    console.log('=== PIN SETUP START ===');
    console.log('Setting up PIN for user:', user?.email, 'ID:', user?.id);
    
    // Enhanced user authentication check
    if (!user) {
      console.error('No user provided to setupPin');
      return { error: 'No user logged in' };
    }

    if (!user.id) {
      console.error('User object missing ID:', user);
      return { error: 'Invalid user session' };
    }

    // Verify current authentication state
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        return { error: 'Authentication session error' };
      }
      
      if (!session || !session.user) {
        console.error('No active session found');
        return { error: 'No active authentication session' };
      }

      if (session.user.id !== user.id) {
        console.error('User ID mismatch - provided:', user.id, 'session:', session.user.id);
        return { error: 'User session mismatch' };
      }

      console.log('✓ Authentication verified for user:', session.user.email);
    } catch (error) {
      console.error('Failed to verify authentication:', error);
      return { error: 'Failed to verify authentication' };
    }
    
    // Validate PIN format
    if (!PinSecurityService.isValidPin(pin)) {
      console.error('Invalid PIN format provided');
      return { error: 'PIN must be 4-8 digits long' };
    }

    // Check PIN strength
    const strength = PinSecurityService.estimatePinStrength(pin);
    if (strength === 'weak') {
      console.error('PIN is too weak');
      return { error: 'PIN is too weak. Avoid common patterns like 1234 or repeated digits.' };
    }

    try {
      console.log('Hashing PIN...');
      const { hash, salt } = await PinSecurityService.hashPin(pin);
      console.log('✓ PIN hashed successfully');
      
      // Prepare data for upsert - ensure user_id is set correctly
      const pinData = { 
        user_id: user.id, // This is now required (NOT NULL)
        pin_hash: hash,
        pin_salt: salt,
        user_email: user.email || null
      };

      console.log('Storing PIN in database with data:', {
        user_id: pinData.user_id,
        user_email: pinData.user_email,
        has_hash: !!pinData.pin_hash,
        has_salt: !!pinData.pin_salt
      });

      const { data, error } = await supabase
        .from('user_pins')
        .upsert(pinData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) {
        console.error('Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        return { error: `Failed to save PIN: ${error.message}` };
      }
      
      console.log('✓ PIN setup successful, data saved:', data);
      console.log('=== PIN SETUP SUCCESS ===');
      return { error: null };
    } catch (error: any) {
      console.error('=== PIN SETUP FAILED ===');
      console.error('Unexpected error during PIN setup:', error);
      return { error: error.message || 'Failed to set up PIN' };
    }
  },

  async signInWithPin(pin: string, email: string) {
    console.log('=== PIN SIGN IN START ===');
    console.log('Attempting PIN authentication for:', email);
    
    if (!PinSecurityService.isValidPin(pin)) {
      console.error('Invalid PIN format for sign in');
      return { error: 'Invalid PIN format' };
    }

    try {
      // Get the stored PIN data for this user
      console.log('Querying PIN data for user:', email);
      const { data: userData, error: userError } = await supabase
        .from('user_pins')
        .select('pin_hash, pin_salt, user_id')
        .eq('user_email', email)
        .maybeSingle();

      if (userError) {
        console.error('Database error querying PIN data:', userError);
        return { error: 'Database error occurred during authentication' };
      }

      if (!userData) {
        console.error('No PIN found for user:', email);
        return { error: 'No PIN set up for this account' };
      }

      console.log('✓ Found PIN data for user');

      // Verify PIN using secure comparison
      console.log('Verifying PIN...');
      const isValid = await PinSecurityService.verifyPin(
        pin, 
        userData.pin_hash, 
        userData.pin_salt || ''
      );
      
      if (!isValid) {
        console.error('PIN verification failed');
        return { error: 'Invalid PIN' };
      }

      console.log('✓ PIN verification successful');
      console.log('=== PIN SIGN IN SUCCESS ===');
      return { error: null };
    } catch (error: any) {
      console.error('=== PIN SIGN IN FAILED ===');
      console.error('PIN authentication error:', error);
      return { error: 'Authentication failed' };
    }
  }
};
