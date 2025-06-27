
export const biometricAvailability = {
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
  }
};
