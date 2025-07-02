// src/utils/crypto.ts

/** Derives or retrieves a persistent AES-GCM key from IndexedDB */
export async function getCryptoKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem('sfai_aes_key');
  if (stored) {
    const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await crypto.subtle.exportKey('raw', key);
  const encoded = btoa(String.fromCharCode(...new Uint8Array(raw)));
  localStorage.setItem('sfai_aes_key', encoded);
  return key;
}

/** Encrypts a data object with AES-GCM */
export async function aesEncrypt<T>(data: T, key: CryptoKey): Promise<{ iv: string; payload: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    iv: btoa(String.fromCharCode(...iv)),
    payload: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  };
}

/** Decrypts AES-GCM encrypted payload */
export async function aesDecrypt<T>(payload: { iv: string; payload: string }, key: CryptoKey): Promise<T> {
  const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(payload.payload), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return JSON.parse(new TextDecoder().decode(decrypted));
}