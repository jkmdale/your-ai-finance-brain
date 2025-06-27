
import { supabase } from '@/integrations/supabase/client';
import { biometricUtils } from './biometricUtils';
import { biometricAvailability } from './biometricAvailability';

export const biometricSignIn = {
  async signInWithBiometric(email: string) {
    console.log('Attempting biometric authentication for:', email);

    // Check if we're in an iframe first
    if (window.self !== window.top) {
      return { error: 'Biometric authentication is not available in preview mode. It will work when deployed or accessed directly.' };
    }

    // Check for HTTPS requirement
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      return { error: 'Biometric authentication requires HTTPS connection' };
    }

    const isAvailable = await biometricAvailability.isBiometricAvailable();
    if (!isAvailable) {
      return { error: 'Biometric authentication not available' };
    }

    try {
      // First, get the stored credential for this user
      const { data: storedCredentials, error: fetchError } = await supabase
        .from('biometric_credentials')
        .select('credential_id, user_id, user_email')
        .eq('user_email', email);

      if (fetchError) {
        console.log('Database error fetching credentials:', fetchError);
        return { error: 'Failed to retrieve biometric credentials' };
      }

      if (!storedCredentials || storedCredentials.length === 0) {
        console.log('No biometric credentials found for user:', email);
        return { error: 'No passkeys found for this account. Please set up biometric authentication first.' };
      }

      console.log('Found stored credentials:', storedCredentials.length);

      // Create the authentication request with allowCredentials
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      const publicKeyCredentialRequestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          userVerification: "required" as const,
          timeout: 60000,
          rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
          // Convert credential IDs properly for allowCredentials
          allowCredentials: storedCredentials.map(cred => ({
            id: biometricUtils.base64ToArrayBuffer(cred.credential_id),
            type: "public-key" as const
          }))
        }
      };
      
      console.log('Requesting biometric authentication...');
      const assertion = await navigator.credentials.get(publicKeyCredentialRequestOptions) as PublicKeyCredential;

      if (!assertion) {
        return { error: 'Biometric authentication cancelled' };
      }

      console.log('Biometric authentication successful, credential ID:', assertion.id);

      // Convert the assertion ID to base64 for comparison
      const assertionIdBase64 = biometricUtils.arrayBufferToBase64(assertion.rawId);

      // Verify the credential ID matches one of our stored credentials
      const matchingCredential = storedCredentials.find(cred => cred.credential_id === assertionIdBase64);
      
      if (!matchingCredential) {
        console.log('Credential not found in database');
        return { error: 'Biometric authentication failed - credential not recognized' };
      }

      console.log('Credential verified, user ID:', matchingCredential.user_id);

      // Simple success - don't try to auto-sign in, let the app handle the session
      console.log('Biometric authentication successful for user:', matchingCredential.user_id);
      return { error: null };
    } catch (error: any) {
      console.error('Biometric sign-in error:', error);
      
      if (error.name === 'NotAllowedError') {
        return { error: 'Biometric authentication was cancelled or denied. Please try again.' };
      } else if (error.name === 'SecurityError') {
        return { error: 'Security error: Please ensure you are using HTTPS or localhost' };
      } else if (error.name === 'InvalidStateError') {
        return { error: 'No passkeys available for this account. Please set up biometric authentication first.' };
      } else if (error.name === 'AbortError') {
        return { error: 'Biometric authentication timed out. Please try again.' };
      }
      
      return { error: error.message || 'Biometric authentication failed' };
    }
  }
};
