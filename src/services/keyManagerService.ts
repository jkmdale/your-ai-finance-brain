
import { supabase } from '@/integrations/supabase/client';
import { encryptionService, EncryptedData } from './encryptionService';

interface StoredEncryptionKeys {
  id: string;
  user_id: string;
  encrypted_private_key: string;
  public_key: string;
  key_derivation_salt: string;
}

class KeyManagerService {
  private userKey: CryptoKey | null = null;
  private keyDerivationSalt: Uint8Array | null = null;

  // Initialize encryption for a new user
  async initializeUserEncryption(userId: string, masterPassword: string): Promise<void> {
    try {
      // Generate master key from password
      const { key: masterKey, salt } = await encryptionService.deriveMasterKey(masterPassword);
      
      // Generate encryption key pair
      const keyPair = await encryptionService.generateKeyPair();
      
      // Export keys for storage
      const publicKeyData = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKeyData = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      
      // Encrypt private key with master key
      const encryptedPrivateKey = await encryptionService.encryptData(
        Array.from(new Uint8Array(privateKeyData)),
        masterKey
      );

      // Store encrypted keys in database
      const { error } = await supabase
        .from('user_encryption_keys')
        .insert({
          user_id: userId,
          encrypted_private_key: JSON.stringify(encryptedPrivateKey),
          public_key: encryptionService.arrayBufferToBase64(publicKeyData),
          key_derivation_salt: encryptionService.arrayBufferToBase64(salt)
        });

      if (error) throw error;

      // Cache the user key
      this.userKey = masterKey;
      this.keyDerivationSalt = salt;

    } catch (error) {
      console.error('Error initializing user encryption:', error);
      throw error;
    }
  }

  // Load and decrypt user's encryption keys
  async loadUserKeys(userId: string, masterPassword: string): Promise<void> {
    try {
      // Get stored encryption keys
      const { data: keyData, error } = await supabase
        .from('user_encryption_keys')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (!keyData) throw new Error('No encryption keys found for user');

      // Derive master key from password and stored salt
      const salt = encryptionService.base64ToArrayBuffer(keyData.key_derivation_salt);
      const { key: masterKey } = await encryptionService.deriveMasterKey(
        masterPassword,
        new Uint8Array(salt)
      );

      // Decrypt and import private key
      const encryptedPrivateKey: EncryptedData = JSON.parse(keyData.encrypted_private_key);
      const privateKeyArray = await encryptionService.decryptData(encryptedPrivateKey, masterKey);
      
      // Cache the master key for data encryption/decryption
      this.userKey = masterKey;
      this.keyDerivationSalt = new Uint8Array(salt);

    } catch (error) {
      console.error('Error loading user keys:', error);
      throw error;
    }
  }

  // Check if user has encryption keys set up
  async hasEncryptionKeys(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_encryption_keys')
        .select('id')
        .eq('user_id', userId)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  // Get current user's encryption key
  getUserKey(): CryptoKey | null {
    return this.userKey;
  }

  // Clear cached keys (for logout)
  clearKeys(): void {
    this.userKey = null;
    this.keyDerivationSalt = null;
  }

  // Encrypt sensitive data before storing
  async encryptForStorage(data: any): Promise<{ encryptedData: string; metadata: any }> {
    if (!this.userKey) {
      throw new Error('User encryption key not loaded');
    }

    const encrypted = await encryptionService.encryptData(data, this.userKey);
    const metadata = encryptionService.createMetadata();

    return {
      encryptedData: JSON.stringify(encrypted),
      metadata
    };
  }

  // Decrypt data retrieved from storage
  async decryptFromStorage(encryptedData: string): Promise<any> {
    if (!this.userKey) {
      throw new Error('User encryption key not loaded');
    }

    const encrypted: EncryptedData = JSON.parse(encryptedData);
    return await encryptionService.decryptData(encrypted, this.userKey);
  }
}

export const keyManagerService = new KeyManagerService();
