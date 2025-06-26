
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
      
      // Check if user already has a PIN
      console.log('Checking for existing PIN...');
      const { data: existingPin, error: checkError } = await supabase
        .from('user_pins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing PIN:', checkError);
        // Continue anyway, might be first-time setup
      } else if (existingPin) {
        console.log('Found existing PIN, will update');
      } else {
        console.log('No existing PIN found, will create new');
      }

      // Prepare data for upsert
      const pinData = { 
        user_id: user.id, 
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
        
        // Provide more specific error messages based on error type
        if (error.code === '23505') {
          return { error: 'PIN already exists for this user' };
        } else if (error.code === '42501') {
          return { error: 'Permission denied. Please ensure you are properly logged in.' };
        } else if (error.message.includes('row-level security')) {
          return { error: 'Security policy violation. Please try logging out and back in.' };
        }
        
        return { error: `Database error: ${error.message}` };
      }
      
      console.log('✓ PIN setup successful, data saved:', data);
      console.log('=== PIN SETUP SUCCESS ===');
      return { error: null };
    } catch (error: any) {
      console.error('=== PIN SETUP FAILED ===');
      console.error('Unexpected error during PIN setup:', error);
      console.error('Error stack:', error.stack);
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
      // Get the stored PIN data for this user - handle potential query errors
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

      // Verify PIN using secure comparison - handle null salt
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
      
      // Generate magic link for authentication
      console.log('Generating authentication link...');
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) {
        console.error('Failed to generate auth link:', error);
        throw error;
      }
      
      // Auto-sign in using the generated link
      console.log('Attempting auto sign-in...');
      const { error: signInError } = await supabase.auth.verifyOtp({
        email: email,
        token: data.properties?.email_otp || '',
        type: 'email'
      });
      
      if (signInError) {
        console.error('Auto sign-in failed:', signInError);
        return { error: 'Authentication failed' };
      }
      
      console.log('✓ PIN authentication successful');
      console.log('=== PIN SIGN IN SUCCESS ===');
      return { error: null };
    } catch (error: any) {
      console.error('=== PIN SIGN IN FAILED ===');
      console.error('PIN authentication error:', error);
      return { error: 'Authentication failed' };
    }
  }
};
