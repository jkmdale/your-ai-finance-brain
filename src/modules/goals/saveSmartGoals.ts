/* File: src/modules/goals/saveSmartGoals.ts Description: Saves SMART goals securely to encrypted IndexedDB. */

import { SmartGoal } from './recommendations';
import { encryptAndStore, decryptAndLoad } from '../storage/secureStore';

const GOALS_KEY = 'smart-goals-v1';

export async function saveSmartGoals(goals: SmartGoal[]) {
  await encryptAndStore(GOALS_KEY, goals);
}

export async function loadSmartGoals(): Promise<SmartGoal[]> {
  const data = await decryptAndLoad(GOALS_KEY);
  return Array.isArray(data) ? data : [];
}

export async function clearSmartGoals() {
  await encryptAndStore(GOALS_KEY, null);
}