import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BlockSetupData } from '@/hooks/useBlockPlanning';

// ====================================================================
// Constants
// ====================================================================

const STORAGE_VERSION = 1;
const KEY_PREFIX = 'khepri:block-setup-draft:';

// ====================================================================
// Types
// ====================================================================

interface StoredDraft {
  readonly version: number;
  readonly data: BlockSetupData;
}

// ====================================================================
// Type Guard
// ====================================================================

function isValidStoredDraft(value: unknown): value is StoredDraft {
  if (typeof value !== 'object' || value == null) return false;
  const obj = value as Record<string, unknown>;
  if (obj.version !== STORAGE_VERSION) return false;
  return isValidBlockSetupData(obj.data);
}

function isValidUnavailableDate(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry == null) return false;
  const obj = entry as Record<string, unknown>;
  return typeof obj.date === 'string';
}

function isValidDayPreference(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry == null) return false;
  const obj = entry as Record<string, unknown>;
  return typeof obj.dayOfWeek === 'number' && typeof obj.sport === 'string';
}

function isValidBlockSetupData(value: unknown): value is BlockSetupData {
  if (typeof value !== 'object' || value == null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.weeklyHoursMin !== 'number' || obj.weeklyHoursMin <= 0) return false;
  if (typeof obj.weeklyHoursMax !== 'number' || obj.weeklyHoursMax <= 0) return false;
  if (!Array.isArray(obj.unavailableDates)) return false;
  if (!obj.unavailableDates.every(isValidUnavailableDate)) return false;
  // dayPreferences is optional
  if (obj.dayPreferences != null) {
    if (!Array.isArray(obj.dayPreferences)) return false;
    if (!obj.dayPreferences.every(isValidDayPreference)) return false;
  }
  return true;
}

// ====================================================================
// Public API
// ====================================================================

function storageKey(seasonId: string): string {
  return `${KEY_PREFIX}${seasonId}`;
}

export async function loadBlockSetupDraft(seasonId: string): Promise<BlockSetupData | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(seasonId));
    if (raw == null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isValidStoredDraft(parsed)) {
      // Schema mismatch or corruption — discard silently
      await AsyncStorage.removeItem(storageKey(seasonId));
      return null;
    }

    return parsed.data;
  } catch {
    // JSON parse failure or AsyncStorage error — clear and return null
    await AsyncStorage.removeItem(storageKey(seasonId)).catch(() => {});
    return null;
  }
}

export async function saveBlockSetupDraft(seasonId: string, data: BlockSetupData): Promise<void> {
  try {
    const draft: StoredDraft = { version: STORAGE_VERSION, data };
    await AsyncStorage.setItem(storageKey(seasonId), JSON.stringify(draft));
  } catch {
    // Best-effort — AsyncStorage failures are non-fatal for draft persistence
  }
}

export async function clearBlockSetupDraft(seasonId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(seasonId));
  } catch {
    // Best-effort — AsyncStorage failures are non-fatal for draft cleanup
  }
}
