
import { supabase } from '@/integrations/supabase/client';

export const authService = {
  async signIn(email: string, password: string) {
    console.log('Attempting sign in for:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.log('Sign in error:', error);
      
      // Check if it's an email confirmation issue
      if (error.message.includes('Email not confirmed') || 
          error.message.includes('Invalid login credentials')) {
        
        return { 
          error: { 
            ...error, 
            message: 'Invalid email or password. If you just signed up, please check your email for a confirmation link first.',
            needsConfirmation: true
          } 
        };
      }
    }
    
    return { error };
  },

  async signUp(email: string, password: string, additionalData?: { firstName?: string; lastName?: string; country?: string }) {
    console.log('Attempting sign up for:', email, additionalData);
    const redirectUrl = `${window.location.origin}/`;
    
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
      console.log('Sign up error:', error);
      return { error };
    }
    
    // Check if user was created but needs confirmation
    if (data.user && !data.session) {
      return { 
        error: null, 
        needsConfirmation: true,
        message: 'Please check your email and click the confirmation link to complete your registration.'
      };
    }
    
    return { error: null };
  },

  async resendConfirmation(email: string) {
    console.log('Resending confirmation for:', email);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    
    if (error) {
      console.log('Resend confirmation error:', error);
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
