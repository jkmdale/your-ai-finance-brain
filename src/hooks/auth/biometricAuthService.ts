
import { supabase } from '@/integrations/supabase/client';

export const biometricAuthService = {
  async isBiometricAvailable(): Promise<boolean> {
    // Check if we're in an iframe (like Lovable preview)
    if (window.self !== window.top) {
      console.log('Biometric authentication not available in iframe environment');
      return false;
    }

    // Check for HTTPS requirement
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.log('Biometric authentication requires HTTPS');
      return false;
    }

    if (!window.PublicKeyCredential) {
      console.log('WebAuthn not supported in this browser');
      return false;
    }
    
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log('Biometric authenticator available:', available);
      return available;
    } catch (error) {
      console.log('Biometric check failed:', error);
      return false;
    }
  },

  async setupBiometric(user: any) {
    if (!user) return { error: 'No user logged in' };
    
    // Check if we're in an iframe first
    if (window.self !== window.top) {
      return { error: 'Biometric authentication is not available in preview mode. It will work when deployed or accessed directly.' };
    }

    // Check for HTTPS requirement
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      return { error: 'Biometric authentication requires HTTPS connection' };
    }

    const isAvailable = await this.isBiometricAvailable();
    if (!isAvailable) {
      return { error: 'Biometric authentication not available on this device' };
    }

    try {
      console.log('Starting biometric credential creation...');
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
            { alg: -7, type: "public-key" as const },
            { alg: -257, type: "public-key" as const }
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform" as const,
            userVerification: "required" as const,
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: "none" as const
        }
      };

      console.log('Creating credential with options:', publicKeyCredentialCreationOptions);
      
      const credential = await navigator.credentials.create(publicKeyCredentialCreationOptions) as PublicKeyCredential;

      console.log('Credential created:', credential);

      if (!credential || !credential.response) {
        console.log('No credential returned');
        return { error: 'Failed to create biometric credential' };
      }

      console.log('Storing credential in database...');
      const response = credential.response as AuthenticatorAttestationResponse;
      
      const credentialData = {
        user_id: user.id,
        user_email: user.email,
        credential_id: credential.id,
        public_key: JSON.stringify({
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          type: credential.type,
          response: {
            clientDataJSON: Array.from(new Uint8Array(response.clientDataJSON)),
            attestationObject: Array.from(new Uint8Array(response.attestationObject))
          }
        }),
        device_info: {
          userAgent: navigator.userAgent.substring(0, 100),
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from('biometric_credentials')
        .insert(credentialData);

      console.log('Database insert result:', { error });

      if (!error) {
        console.log('Biometric setup successful!');
        return { error: null };
      } else {
        console.log('Database error:', error);
        return { error: error.message || 'Failed to save biometric credential' };
      }
    } catch (error: any) {
      console.error('Biometric setup error:', error);
      
      // Provide user-friendly error messages
      if (error.name === 'NotAllowedError') {
        return { error: 'Biometric setup was cancelled or not allowed by your browser. Please try again and allow the permission when prompted.' };
      } else if (error.name === 'InvalidStateError') {
        return { error: 'A biometric credential already exists for this account.' };
      } else if (error.name === 'NotSupportedError') {
        return { error: 'Biometric authentication is not supported on this device.' };
      } else if (error.name === 'AbortError') {
        return { error: 'Biometric setup was cancelled or timed out.' };
      } else if (error.name === 'SecurityError') {
        return { error: 'Security error: Please ensure you are using HTTPS or localhost.' };
      }
      
      return { error: error.message || 'Biometric setup failed' };
    }
  },

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

    const isAvailable = await this.isBiometricAvailable();
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
            id: Uint8Array.from(atob(cred.credential_id), c => c.charCodeAt(0)),
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

      // Verify the credential ID matches one of our stored credentials
      const matchingCredential = storedCredentials.find(cred => cred.credential_id === assertion.id);
      
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
