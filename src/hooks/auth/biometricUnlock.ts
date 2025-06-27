
import { supabase } from '@/integrations/supabase/client';
import { biometricUtils } from './biometricUtils';
import { biometricAvailability } from './biometricAvailability';

export const biometricUnlock = {
  async unlockWithBiometric(userEmail: string, userId: string) {
    console.log('🔐 Starting biometric unlock for:', userEmail);

    // Environment checks
    if (window.self !== window.top) {
      return { error: 'Biometric authentication is not available in preview mode. It will work when deployed or accessed directly.' };
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      return { error: 'Biometric authentication requires HTTPS connection' };
    }

    const isAvailable = await biometricAvailability.isBiometricAvailable();
    if (!isAvailable) {
      return { error: 'Biometric authentication not available on this device' };
    }

    try {
      console.log('🔍 Fetching stored credentials for user:', userEmail);
      
      // Get stored credentials for this user
      const { data: storedCredentials, error: fetchError } = await supabase
        .from('biometric_credentials')
        .select('credential_id, user_id, user_email')
        .eq('user_email', userEmail)
        .eq('user_id', userId);

      if (fetchError) {
        console.error('❌ Database error fetching credentials:', fetchError);
        return { error: 'Failed to retrieve biometric credentials' };
      }

      if (!storedCredentials || storedCredentials.length === 0) {
        console.log('❌ No biometric credentials found for user:', userEmail);
        return { error: 'No passkeys found for this account. Please set up biometric authentication first.' };
      }

      console.log('✅ Found stored credentials:', storedCredentials.length);

      // Create authentication challenge
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      // Convert stored credential IDs back to ArrayBuffer for the request
      const allowCredentials = storedCredentials.map(cred => ({
        id: biometricUtils.base64ToArrayBuffer(cred.credential_id),
        type: "public-key" as const,
        transports: ["internal"] as AuthenticatorTransport[]
      }));

      const publicKeyCredentialRequestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          userVerification: "required" as const,
          timeout: 60000,
          rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
          allowCredentials
        }
      };
      
      console.log('🚀 Requesting biometric authentication...');
      
      const assertion = await navigator.credentials.get(publicKeyCredentialRequestOptions) as PublicKeyCredential;

      if (!assertion) {
        console.log('❌ No assertion returned - user cancelled');
        return { error: 'Biometric authentication was cancelled' };
      }

      console.log('✅ Biometric authentication completed, credential ID:', assertion.id);

      // Convert assertion ID to base64 for comparison
      const assertionIdBase64 = biometricUtils.arrayBufferToBase64(assertion.rawId);
      console.log('🔍 Looking for matching credential with ID:', assertionIdBase64);

      // Find matching credential
      const matchingCredential = storedCredentials.find(cred => {
        console.log('Comparing stored:', cred.credential_id, 'with assertion:', assertionIdBase64);
        return cred.credential_id === assertionIdBase64;
      });
      
      if (!matchingCredential) {
        console.error('❌ No matching credential found in database');
        return { error: 'Biometric credential not recognized. Please try again or use a different authentication method.' };
      }

      // Verify user ID matches the session
      if (matchingCredential.user_id !== userId) {
        console.error('❌ User ID mismatch');
        return { error: 'Authentication failed - user mismatch' };
      }

      console.log('✅ Credential verified for user:', matchingCredential.user_id);

      // Update last used timestamp
      await supabase
        .from('biometric_credentials')
        .update({ last_used: new Date().toISOString() })
        .eq('credential_id', matchingCredential.credential_id);

      console.log('🎉 Biometric unlock successful!');
      return { error: null };
      
    } catch (error: any) {
      console.error('❌ Biometric unlock error:', error);
      
      // Enhanced error handling
      if (error.name === 'NotAllowedError') {
        return { error: 'Biometric authentication was cancelled or denied. Please try again.' };
      } else if (error.name === 'SecurityError') {
        return { error: 'Security error: Please ensure you are using HTTPS or localhost' };
      } else if (error.name === 'InvalidStateError') {
        return { error: 'No valid passkeys available. Please set up biometric authentication first.' };
      } else if (error.name === 'AbortError') {
        return { error: 'Biometric authentication timed out. Please try again.' };
      } else if (error.name === 'NotSupportedError') {
        return { error: 'Biometric authentication is not supported on this device.' };
      }
      
      return { error: error.message || 'Biometric authentication failed' };
    }
  }
};
