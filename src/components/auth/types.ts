
export type AuthMode = 'welcome' | 'email' | 'pin' | 'biometric' | 'signup' | 'email-confirmation' | 'email-entry';

export interface AuthScreenProps {
  onAuthSuccess?: () => void;
}
