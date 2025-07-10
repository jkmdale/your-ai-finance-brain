
import { supabase } from '@/integrations/supabase/client';

export const authService = {
  async signIn(email: string, password: string) {
    console.log('🔵 Attempting sign in for:', email);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Sign in error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.status);
      
      // Check if it's an email confirmation issue
      if (error.message.includes('Email not confirmed')) {
        console.log('📧 Email not confirmed - user needs to check their email');
        return { 
          error: { 
            ...error, 
            message: 'Please check your email and click the confirmation link before signing in. If you need a new confirmation email, click "Resend Confirmation" below.',
            needsConfirmation: true
          } 
        };
      }
      
      if (error.message.includes('Invalid login credentials')) {
        console.log('❌ Invalid credentials - could be unconfirmed email or wrong password');
        return { 
          error: { 
            ...error, 
            message: 'Invalid email or password. If you just signed up, you must confirm your email first. Check your inbox for a confirmation email.',
            needsConfirmation: true
          } 
        };
      }

      if (error.message.includes('Too many requests')) {
        return { 
          error: { 
            ...error, 
            message: 'Too many sign-in attempts. Please wait a few minutes before trying again.'
          } 
        };
      }
    }
    
    console.log('✅ Sign in successful');
    return { error };
  },

  async signUp(email: string, password: string, additionalData?: { firstName?: string; lastName?: string; country?: string }) {
    console.log('🔵 Starting sign up for:', email, additionalData);
    const redirectUrl = `${window.location.origin}/`;
    
    console.log('🔵 Using redirect URL:', redirectUrl);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: additionalData ? {
          first_name: additionalData.firstName,
          last_name: additionalData.lastName,
          country: additionalData.country
        } : undefined
      }
    });
    
    if (error) {
      console.error('❌ Sign up error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return { error };
    }
    
    console.log('✅ Sign up response:', data);
    
    // Check if user was created but needs confirmation
    if (data.user && !data.session) {
      console.log('📧 User created, confirmation email should be sent to:', email);
      return { 
        error: null, 
        needsConfirmation: true,
        message: 'Please check your email and click the confirmation link to complete your registration.'
      };
    }
    
    return { error: null };
  },

  async resendConfirmation(email: string) {
    console.log('🔵 Resending confirmation for:', email);
    
    const redirectUrl = `${window.location.origin}/`;
    console.log('🔵 Using redirect URL for resend:', redirectUrl);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      console.error('❌ Resend confirmation error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Resend confirmation request completed successfully');
    }
    
    return { error };
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async getUserCapabilities(email: string): Promise<{ hasPin: boolean; hasBiometric: boolean }> {
    try {
      // Check for PIN by email
      const { data: pinData } = await supabase
        .from('user_pins')
        .select('id')
        .eq('user_email', email)
        .single();

      // Check for biometric by email
      const { data: biometricData } = await supabase
        .from('biometric_credentials')
        .select('id')
        .eq('user_email', email)
        .single();

      return {
        hasPin: !!pinData,
        hasBiometric: !!biometricData
      };
    } catch (error) {
      console.log('Error checking user capabilities:', error);
      return { hasPin: false, hasBiometric: false };
    }
  },

  async getUserPreference(email: string): Promise<string | null> {
    try {
      // First try to get from auth metadata
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      
      const targetUser = data.users?.find((u: any) => u.email === email);
      if (targetUser?.user_metadata?.login_preference) {
        return targetUser.user_metadata.login_preference as string;
      }
      
      // Fallback to localStorage if available
      return localStorage.getItem('preferredAuthMethod');
    } catch (error) {
      console.log('Error getting user preference:', error);
      return localStorage.getItem('preferredAuthMethod');
    }
  }
};
