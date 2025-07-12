// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Environment variables with fallbacks for consistent configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://gzznuwtxyyaqlbbrxsuz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6em51d3R4eXlhcWxiYnJ4c3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODE1NzgsImV4cCI6MjA2NTU1NzU3OH0.u-9MqMTAvSIf2V6qnt8oriNH-Sx-UXU0R6K3gsj5MSw";

// Debug logging in development
if (import.meta.env.DEV) {
  console.log('🔧 Supabase Client Configuration:', {
    url: SUPABASE_URL,
    hasKey: !!SUPABASE_PUBLISHABLE_KEY,
    usingEnvVars: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  });
}

// ✅ Enhanced Supabase client with proper auth configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // More secure flow
    debug: import.meta.env.DEV, // Enable debug logging in development
  },
  realtime: {
    params: {
      eventsPerSecond: 2 // Reduce realtime load
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'smartfinance-web-app'
    }
  }
});

// ✅ Enhanced auth state monitoring for debugging
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 Supabase Auth State Change:', {
      event,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      email: session?.user?.email,
      expiresAt: session?.expires_at,
      timestamp: new Date().toISOString()
    });
  });
}

// ✅ Helper function to validate current auth state
export const validateAuthState = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Auth validation error:', error);
      return { valid: false, error };
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ User validation error:', userError);
      return { valid: false, error: userError };
    }
    
    const isValid = !!(session && user && user.id);
    
    if (import.meta.env.DEV) {
      console.log('🔍 Auth State Validation:', {
        hasSession: !!session,
        hasUser: !!user,
        userId: user?.id,
        isValid,
        sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
      });
    }
    
    return { 
      valid: isValid, 
      session, 
      user, 
      error: null 
    };
  } catch (error) {
    console.error('❌ Auth validation exception:', error);
    return { valid: false, error };
  }
};

// ✅ Helper function to wait for auth initialization
export const waitForAuth = (timeout = 5000): Promise<{ session: any; user: any; error: any }> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Auth initialization timeout'));
    }, timeout);
    
    const checkAuth = async () => {
      try {
        const result = await validateAuthState();
        clearTimeout(timeoutId);
        resolve({ 
          session: result.session || null, 
          user: result.user || null, 
          error: result.error 
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    };
    
    // Try immediate check
    checkAuth();
    
    // Also listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
        resolve({ session, user: session?.user, error: null });
      }
    });
  });
};