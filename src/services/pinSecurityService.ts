
export class PinSecurityService {
  private static readonly MIN_PIN_LENGTH = 4;
  private static readonly MAX_PIN_LENGTH = 8;
  private static readonly SALT_LENGTH = 16;
  private static readonly HASH_ITERATIONS = 100000;

  /**
   * Hash a PIN securely using PBKDF2
   */
  static async hashPin(pin: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }> {
    // Validate PIN
    if (!this.isValidPin(pin)) {
      throw new Error('Invalid PIN format');
    }

    const encoder = new TextEncoder();
    const pinData = encoder.encode(pin);
    
    // Generate or use provided salt
    const actualSalt = salt || crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    
    // Import PIN as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      pinData,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derive hash using PBKDF2
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: actualSalt,
        iterations: this.HASH_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      256 // 32 bytes
    );

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const saltString = Array.from(actualSalt).map(b => b.toString(16).padStart(2, '0')).join('');

    return { hash, salt: saltString };
  }

  /**
   * Verify a PIN against a stored hash
   */
  static async verifyPin(pin: string, storedHash: string, storedSalt: string): Promise<boolean> {
    try {
      // Convert salt back to Uint8Array
      const saltArray = new Uint8Array(
        storedSalt.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      );

      // Hash the provided PIN with the stored salt
      const { hash } = await this.hashPin(pin, saltArray);
      
      // Constant-time comparison to prevent timing attacks
      return this.constantTimeEqual(hash, storedHash);
    } catch (error) {
      console.error('PIN verification error:', error);
      return false;
    }
  }

  /**
   * Validate PIN format
   */
  static isValidPin(pin: string): boolean {
    if (!pin || typeof pin !== 'string') return false;
    
    const length = pin.length;
    if (length < this.MIN_PIN_LENGTH || length > this.MAX_PIN_LENGTH) return false;
    
    // PIN should only contain digits
    return /^\d+$/.test(pin);
  }

  /**
   * Generate a secure random PIN for testing/demo purposes
   */
  static generateRandomPin(length: number = 4): string {
    if (length < this.MIN_PIN_LENGTH || length > this.MAX_PIN_LENGTH) {
      throw new Error(`PIN length must be between ${this.MIN_PIN_LENGTH} and ${this.MAX_PIN_LENGTH}`);
    }
    
    const digits = '0123456789';
    let pin = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.getRandomValues(new Uint8Array(1))[0] % digits.length;
      pin += digits[randomIndex];
    }
    
    return pin;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Estimate PIN strength
   */
  static estimatePinStrength(pin: string): 'weak' | 'medium' | 'strong' {
    if (!this.isValidPin(pin)) return 'weak';
    
    const length = pin.length;
    const hasRepeating = /(.)\1{2,}/.test(pin); // 3+ consecutive same digits
    const isSequential = this.isSequentialPin(pin);
    const isCommon = this.isCommonPin(pin);
    
    if (length >= 6 && !hasRepeating && !isSequential && !isCommon) {
      return 'strong';
    } else if (length >= 5 && !isCommon) {
      return 'medium';
    } else {
      return 'weak';
    }
  }

  /**
   * Check if PIN is sequential (e.g., 1234, 9876)
   */
  private static isSequentialPin(pin: string): boolean {
    const digits = pin.split('').map(Number);
    
    // Check ascending sequence
    let isAscending = true;
    let isDescending = true;
    
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] !== digits[i-1] + 1) isAscending = false;
      if (digits[i] !== digits[i-1] - 1) isDescending = false;
    }
    
    return isAscending || isDescending;
  }

  /**
   * Check if PIN is commonly used
   */
  private static isCommonPin(pin: string): boolean {
    const commonPins = [
      '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
      '1234', '4321', '0123', '3210', '1122', '2211', '1212', '2121',
      '0101', '1010', '1357', '2468', '9876', '6789'
    ];
    
    return commonPins.includes(pin);
  }
}
