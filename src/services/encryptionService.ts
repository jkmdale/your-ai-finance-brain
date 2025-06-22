
export interface EncryptionKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedData {
  encryptedContent: string;
  iv: string;
  salt: string;
}

export interface EncryptionMetadata {
  algorithm: string;
  keyDerivation: string;
  version: string;
  timestamp: number;
}

class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 16;
  private static readonly PBKDF2_ITERATIONS = 100000;

  // Generate a master key from user's password/pin
  async deriveMasterKey(password: string, salt?: Uint8Array): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const actualSalt = salt || crypto.getRandomValues(new Uint8Array(EncryptionService.SALT_LENGTH));
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: actualSalt,
        iterations: EncryptionService.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: EncryptionService.ALGORITHM,
        length: EncryptionService.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );

    return { key, salt: actualSalt };
  }

  // Generate encryption key pair for user
  async generateKeyPair(): Promise<EncryptionKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt']
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  // Encrypt data with AES-GCM
  async encryptData(data: any, key: CryptoKey): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    const jsonData = JSON.stringify(data);
    const dataBuffer = encoder.encode(jsonData);

    const iv = crypto.getRandomValues(new Uint8Array(EncryptionService.IV_LENGTH));
    const salt = crypto.getRandomValues(new Uint8Array(EncryptionService.SALT_LENGTH));

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: EncryptionService.ALGORITHM,
        iv: iv
      },
      key,
      dataBuffer
    );

    return {
      encryptedContent: this.arrayBufferToBase64(encryptedBuffer),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt)
    };
  }

  // Decrypt data with AES-GCM
  async decryptData(encryptedData: EncryptedData, key: CryptoKey): Promise<any> {
    const encryptedBuffer = this.base64ToArrayBuffer(encryptedData.encryptedContent);
    const iv = this.base64ToArrayBuffer(encryptedData.iv);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: EncryptionService.ALGORITHM,
        iv: iv
      },
      key,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    const jsonData = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonData);
  }

  // Export key to storable format
  async exportKey(key: CryptoKey): Promise<string> {
    const keyBuffer = await crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(keyBuffer);
  }

  // Import key from stored format
  async importKey(keyData: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyData);
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: EncryptionService.ALGORITHM,
        length: EncryptionService.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Public utility methods - made public to be accessible from other services
  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Create encryption metadata
  createMetadata(): EncryptionMetadata {
    return {
      algorithm: EncryptionService.ALGORITHM,
      keyDerivation: 'PBKDF2',
      version: '1.0',
      timestamp: Date.now()
    };
  }
}

export const encryptionService = new EncryptionService();
