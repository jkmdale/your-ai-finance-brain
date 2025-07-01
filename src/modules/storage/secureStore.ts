// src/modules/storage/secureStore.ts import { openDB } from 'idb' import { aesEncrypt, aesDecrypt, getCryptoKey } from '@/utils/crypto' import type { Transaction } from '@/types/Transaction'

const DB_NAME = 'SFAI-secure' const STORE_NAME = 'transactions'

export async function encryptAndStoreTransactions(data: Transaction[]): Promise<void> { const key = await getCryptoKey() const encrypted = await Promise.all(data.map(d => aesEncrypt(d, key)))

const db = await openDB(DB_NAME, 1, { upgrade(db) { if (!db.objectStoreNames.contains(STORE_NAME)) { db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true }) } } })

const tx = db.transaction(STORE_NAME, 'readwrite') const store = tx.objectStore(STORE_NAME) encrypted.forEach(enc => store.add(enc)) await tx.done }

export async function decryptAndLoadTransactions(): Promise<Transaction[]> { const key = await getCryptoKey() const db = await openDB(DB_NAME, 1) const tx = db.transaction(STORE_NAME, 'readonly') const store = tx.objectStore(STORE_NAME)

const all = await store.getAll() const decrypted = await Promise.all(all.map(entry => aesDecrypt<Transaction>(entry, key))) return decrypted }

