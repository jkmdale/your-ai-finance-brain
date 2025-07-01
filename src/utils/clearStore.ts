// src/modules/storage/utils/clearStore.ts import { openDB, deleteDB } from 'idb'

const DB_NAME = 'SFAI-secure' const STORE_NAME = 'transactions'

export async function clearSecureStore(): Promise<void> { try { await deleteDB(DB_NAME) localStorage.removeItem('sfai_aes_key') console.info('🔐 Secure store cleared.') } catch (err) { console.error('❌ Failed to clear secure store:', err) } }

