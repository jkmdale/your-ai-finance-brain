
import { supabase } from '@/integrations/supabase/client';
import { biometricUtils } from './biometricUtils';
import { biometricAvailability } from './biometricAvailability';

export const biometricSetup = {
  async setupBiometric(user: any) {
    if (!user) return { error: 'No user logged in' };
    
    // Check if we're in an iframe first
    if (window.self !== window.top) {
      return { error: 'Biometric authentication is not available in preview mode. It will work when deployed or accessed directly.' };
    }

    // Check for HTTPS requirement (allow localhost for development)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      return { error: 'Biometric authentication requires HTTPS connection' };
    }

    const isAvailable = await biometricAvailability.isBiometricAvailable();
    if (!isAvailable) {
      return { error: 'Biometric authentication not available on this device' };
    }

    try {
      console.log('Starting biometric credential creation...');
      
      // Check if user already has biometric credentials
      const { data: existingCredentials } = await supabase
        .from('biometric_credentials')
        .select('id')
        .eq('user_id', user.id)
        .eq('user_email', user.email);

      if (existingCredentials && existingCredentials.length > 0) {
        return { error: 'Biometric credentials already exist for this account' };
      }

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = new TextEncoder().encode(user.id);
      
      const publicKeyCredentialCreationOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: { 
            name: "SmartFinanceAI",
            id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname
          },
          user: {
            id: userId,
            name: user.email || '',
            displayName: user.email || ''
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" as const },   // ES256
            { alg: -257, type: "public-key" as const }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform" as const,
            userVerification: "required" as const,
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: "none" as const,
          excludeCredentials: [] // Don't exclude any credentials during setup
        }
      };

      console.log('Creating credential with options:', publicKeyCredentialCreationOptions);
      
      const credential = await navigator.credentials.create(publicKeyCredentialCreationOptions) as PublicKeyCredential;

      if (!credential || !credential.response) {
        console.log('No credential returned');
        return { error: 'Failed to create biometric credential' };
      }

      console.log('Credential created successfully:', credential.id);
      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Convert credential ID to base64 for storage
      const credentialIdBase64 = biometricUtils.arrayBufferToBase64(credential.rawId);
      
      // Extract and store the public key properly
      const publicKeyBase64 = biometricUtils.arrayBufferToBase64(response.attestationObject);
      
      const credentialData = {
        user_id: user.id,
        user_email: user.email,
        credential_id: credentialIdBase64,
        public_key: publicKeyBase64, // Store as base64, not JSON
        device_info: {
          userAgent: navigator.userAgent.substring(0, 200),
          platform: navigator.platform,
          timestamp: new Date().toISOString(),
          credentialType: credential.type
        }
      };

      console.log('Storing credential data:', { ...credentialData, public_key: '[REDACTED]' });

      const { error } = await supabase
        .from('biometric_credentials')
        .insert(credentialData);

      if (!error) {
        console.log('Biometric setup successful!');
        return { error: null };
      } else {
        console.error('Database error:', error);
        return { error: error.message || 'Failed to save biometric credential' };
      }
    } catch (error: any) {
      console.error('Biometric setup error:', error);
      
      // Provide user-friendly error messages
      if (error.name === 'NotAllowedError') {
        return { error: 'Biometric setup was cancelled. Please try again and allow the permission when prompted.' };
      } else if (error.name === 'InvalidStateError') {
        return { error: 'A biometric credential may already exist for this account. Please try signing in instead.' };
      } else if (error.name === 'NotSupportedError') {
        return { error: 'Biometric authentication is not supported on this device or browser.' };
      } else if (error.name === 'AbortError') {
        return { error: 'Biometric setup was cancelled or timed out.' };
      } else if (error.name === 'SecurityError') {
        return { error: 'Security error: Please ensure you are using HTTPS or localhost.' };
      }
      
      return { error: error.message || 'Biometric setup failed' };
    }
  }
};
