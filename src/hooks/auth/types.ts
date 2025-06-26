
import { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, additionalData?: { firstName?: string; lastName?: string; country?: string }) => Promise<{ error: any; needsConfirmation?: boolean; message?: string }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error: any }>;
  setupPin: (pin: string) => Promise<{ error: any }>;
  signInWithPin: (pin: string, email: string) => Promise<{ error: any }>;
  setupBiometric: () => Promise<{ error: any }>;
  signInWithBiometric: (email: string) => Promise<{ error: any }>;
  isBiometricAvailable: () => Promise<boolean>;
  getUserCapabilities: (email: string) => Promise<{ hasPin: boolean; hasBiometric: boolean }>;
  getUserPreference: (email: string) => Promise<string | null>;
  hasPin: boolean;
  hasBiometric: boolean;
}

export interface UserCapabilities {
  hasPin: boolean;
  hasBiometric: boolean;
}
