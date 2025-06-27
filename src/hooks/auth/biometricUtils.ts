
export const biometricUtils = {
  // Helper function to convert ArrayBuffer to base64
  arrayBufferToBase64(buffer: ArrayBuffer): string {
    try {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (error) {
      console.error('Error converting ArrayBuffer to base64:', error);
      throw new Error('Failed to convert ArrayBuffer to base64');
    }
  },

  // Helper function to convert base64 to ArrayBuffer
  base64ToArrayBuffer(base64: string): ArrayBuffer {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error('Error converting base64 to ArrayBuffer:', error);
      throw new Error('Failed to convert base64 to ArrayBuffer');
    }
  },

  // Helper to generate a random challenge
  generateChallenge(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
  },

  // Helper to create a user ID buffer
  createUserIdBuffer(userId: string): Uint8Array {
    return new TextEncoder().encode(userId);
  }
};
