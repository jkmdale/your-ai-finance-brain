
export const biometricAvailability = {
  async isBiometricAvailable(): Promise<boolean> {
    try {
      // Check if we're in an iframe (like Lovable preview)
      if (window.self !== window.top) {
        console.log('🚫 Biometric authentication not available in iframe environment');
        return false;
      }

      // Check for HTTPS requirement (allow localhost for development)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.log('🚫 Biometric authentication requires HTTPS (current:', window.location.protocol, ')');
        return false;
      }

      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        console.log('🚫 WebAuthn not supported in this browser');
        return false;
      }

      // Check if conditional mediation is available (newer browsers)
      if (PublicKeyCredential.isConditionalMediationAvailable) {
        const conditionalAvailable = await PublicKeyCredential.isConditionalMediationAvailable();
        console.log('🔍 Conditional mediation available:', conditionalAvailable);
      }
      
      // Check for platform authenticator
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log('🔍 Platform authenticator available:', available);
      
      if (available) {
        console.log('✅ Biometric authentication is available');
      } else {
        console.log('🚫 No biometric authenticator available on this device');
      }
      
      return available;
    } catch (error) {
      console.error('❌ Error checking biometric availability:', error);
      return false;
    }
  }
};
