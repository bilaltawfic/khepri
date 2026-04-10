import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BlockSetupData } from '@/hooks/useBlockPlanning';

import {
  clearBlockSetupDraft,
  loadBlockSetupDraft,
  saveBlockSetupDraft,
} from '../block-setup-storage';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

describe('block-setup-storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
  });

  const VALID_DATA: BlockSetupData = {
    weeklyHoursMin: 8,
    weeklyHoursMax: 12,
    unavailableDates: [{ date: '2026-03-15', reason: 'Vacation' }],
    dayPreferences: [{ dayOfWeek: 1, sport: 'run' }],
  };

  // ====================================================================
  // Round-trip
  // ====================================================================

  describe('save → load round-trip', () => {
    it('restores the saved data', async () => {
      let stored: string | null = null;
      mockSetItem.mockImplementation((_key: string, value: string) => {
        stored = value;
        return Promise.resolve();
      });
      mockGetItem.mockImplementation(() => Promise.resolve(stored));

      await saveBlockSetupDraft('season-1', VALID_DATA);
      const loaded = await loadBlockSetupDraft('season-1');

      expect(loaded).toEqual(VALID_DATA);
    });

    it('round-trips data without optional dayPreferences', async () => {
      const dataWithoutPrefs = {
        weeklyHoursMin: 5,
        weeklyHoursMax: 10,
        unavailableDates: [],
      };

      let stored: string | null = null;
      mockSetItem.mockImplementation((_key: string, value: string) => {
        stored = value;
        return Promise.resolve();
      });
      mockGetItem.mockImplementation(() => Promise.resolve(stored));

      await saveBlockSetupDraft('season-2', dataWithoutPrefs);
      const loaded = await loadBlockSetupDraft('season-2');

      expect(loaded).toEqual(dataWithoutPrefs);
    });
  });

  // ====================================================================
  // Namespacing
  // ====================================================================

  describe('season namespacing', () => {
    it('uses distinct keys per season', async () => {
      await saveBlockSetupDraft('season-A', VALID_DATA);
      await saveBlockSetupDraft('season-B', VALID_DATA);

      expect(mockSetItem).toHaveBeenCalledTimes(2);
      const key1 = mockSetItem.mock.calls[0][0] as string;
      const key2 = mockSetItem.mock.calls[1][0] as string;
      expect(key1).not.toBe(key2);
      expect(key1).toContain('season-A');
      expect(key2).toContain('season-B');
    });

    it('does not collide between seasons', async () => {
      const storage = new Map<string, string>();
      mockSetItem.mockImplementation((key: string, value: string) => {
        storage.set(key, value);
        return Promise.resolve();
      });
      mockGetItem.mockImplementation((key: string) => Promise.resolve(storage.get(key) ?? null));

      const dataA = { ...VALID_DATA, weeklyHoursMin: 5 };
      const dataB = { ...VALID_DATA, weeklyHoursMin: 15 };

      await saveBlockSetupDraft('season-A', dataA);
      await saveBlockSetupDraft('season-B', dataB);

      expect(await loadBlockSetupDraft('season-A')).toEqual(dataA);
      expect(await loadBlockSetupDraft('season-B')).toEqual(dataB);
    });
  });

  // ====================================================================
  // Version mismatch
  // ====================================================================

  describe('version mismatch', () => {
    it('returns null and clears key for unknown version', async () => {
      const stale = JSON.stringify({ version: 999, data: VALID_DATA });
      mockGetItem.mockResolvedValue(stale);

      const result = await loadBlockSetupDraft('season-1');

      expect(result).toBeNull();
      expect(mockRemoveItem).toHaveBeenCalled();
    });
  });

  // ====================================================================
  // Malformed data
  // ====================================================================

  describe('malformed data', () => {
    it('returns null and clears key for invalid JSON', async () => {
      mockGetItem.mockResolvedValue('not-json{{{');

      const result = await loadBlockSetupDraft('season-1');

      expect(result).toBeNull();
      expect(mockRemoveItem).toHaveBeenCalled();
    });

    it('returns null for missing weeklyHoursMin', async () => {
      const bad = JSON.stringify({
        version: 1,
        data: { weeklyHoursMax: 12, unavailableDates: [] },
      });
      mockGetItem.mockResolvedValue(bad);

      expect(await loadBlockSetupDraft('season-1')).toBeNull();
    });

    it('returns null for non-array unavailableDates', async () => {
      const bad = JSON.stringify({
        version: 1,
        data: { weeklyHoursMin: 8, weeklyHoursMax: 12, unavailableDates: 'not-array' },
      });
      mockGetItem.mockResolvedValue(bad);

      expect(await loadBlockSetupDraft('season-1')).toBeNull();
    });

    it('returns null for zero weeklyHoursMin', async () => {
      const bad = JSON.stringify({
        version: 1,
        data: { weeklyHoursMin: 0, weeklyHoursMax: 12, unavailableDates: [] },
      });
      mockGetItem.mockResolvedValue(bad);

      expect(await loadBlockSetupDraft('season-1')).toBeNull();
    });
  });

  // ====================================================================
  // Load from empty
  // ====================================================================

  describe('load from empty', () => {
    it('returns null when nothing stored', async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await loadBlockSetupDraft('season-1');

      expect(result).toBeNull();
      expect(mockRemoveItem).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // Clear
  // ====================================================================

  describe('clearBlockSetupDraft', () => {
    it('removes the key', async () => {
      await clearBlockSetupDraft('season-1');

      expect(mockRemoveItem).toHaveBeenCalledWith(expect.stringContaining('season-1'));
    });
  });
});
