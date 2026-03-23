import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { WellnessDataPoint } from '@/services/intervals';
import {
  fatigueToEnergy,
  scale4to10,
  scale4to10Inverted,
  sleepScoreTo10,
  transformWellnessToCheckin,
  useWellnessSync,
} from '../useWellnessSync';

const mockGetTodayWellness = jest.fn();

jest.mock('@/services/intervals', () => ({
  getTodayWellness: (...args: unknown[]) => mockGetTodayWellness(...args),
}));

describe('scale4to10Inverted', () => {
  it('maps 1 (Great) to 10', () => {
    expect(scale4to10Inverted(1)).toBe(10);
  });

  it('maps 2 (Good) to 7', () => {
    expect(scale4to10Inverted(2)).toBe(7);
  });

  it('maps 3 (Avg) to 4', () => {
    expect(scale4to10Inverted(3)).toBe(4);
  });

  it('maps 4 (Poor) to 1', () => {
    expect(scale4to10Inverted(4)).toBe(1);
  });

  it('returns null for undefined', () => {
    expect(scale4to10Inverted(undefined)).toBeNull();
  });

  it('returns null for 0 (not set)', () => {
    expect(scale4to10Inverted(0)).toBeNull();
  });
});

describe('scale4to10', () => {
  it('maps 1 (Low) to 1', () => {
    expect(scale4to10(1)).toBe(1);
  });

  it('maps 2 (Avg) to 4', () => {
    expect(scale4to10(2)).toBe(4);
  });

  it('maps 3 (High) to 7', () => {
    expect(scale4to10(3)).toBe(7);
  });

  it('maps 4 (Extreme) to 10', () => {
    expect(scale4to10(4)).toBe(10);
  });

  it('returns null for undefined', () => {
    expect(scale4to10(undefined)).toBeNull();
  });

  it('returns null for 0 (not set)', () => {
    expect(scale4to10(0)).toBeNull();
  });
});

describe('fatigueToEnergy', () => {
  it('maps fatigue 1 (LOW) to energy 10', () => {
    expect(fatigueToEnergy(1)).toBe(10);
  });

  it('maps fatigue 2 (AVG) to energy 7', () => {
    expect(fatigueToEnergy(2)).toBe(7);
  });

  it('maps fatigue 3 (HIGH) to energy 4', () => {
    expect(fatigueToEnergy(3)).toBe(4);
  });

  it('maps fatigue 4 (EXTREME) to energy 1', () => {
    expect(fatigueToEnergy(4)).toBe(1);
  });

  it('returns null for undefined', () => {
    expect(fatigueToEnergy(undefined)).toBeNull();
  });

  it('returns null for 0 (not set)', () => {
    expect(fatigueToEnergy(0)).toBeNull();
  });
});

describe('sleepScoreTo10', () => {
  it('maps 85 to 9', () => {
    expect(sleepScoreTo10(85)).toBe(9);
  });

  it('maps 100 to 10', () => {
    expect(sleepScoreTo10(100)).toBe(10);
  });

  it('maps 50 to 5', () => {
    expect(sleepScoreTo10(50)).toBe(5);
  });

  it('maps 0 to 1 (clamped minimum)', () => {
    expect(sleepScoreTo10(0)).toBe(1);
  });

  it('maps 3 to 1 (clamped minimum)', () => {
    expect(sleepScoreTo10(3)).toBe(1);
  });

  it('returns null for undefined', () => {
    expect(sleepScoreTo10(undefined)).toBeNull();
  });
});

describe('transformWellnessToCheckin', () => {
  it('transforms full wellness data using sleepScore', () => {
    const wellness: WellnessDataPoint = {
      date: '2026-02-13',
      ctl: 70,
      atl: 65,
      tsb: 5,
      rampRate: 2,
      sleepScore: 85,
      sleepHours: 7.5,
      fatigue: 2,
      stress: 3,
      soreness: 2,
    };

    const result = transformWellnessToCheckin(wellness);

    expect(result).toEqual({
      sleepQuality: 9, // sleepScore 85 / 10 = 8.5 → 9
      sleepHours: 7.5,
      energyLevel: 7, // fatigue 2 → inverted
      stressLevel: 7, // stress 3 → same direction
      overallSoreness: 4, // soreness 2 → same direction
    });
  });

  it('handles missing optional fields with null values', () => {
    const wellness: WellnessDataPoint = {
      date: '2026-02-13',
      ctl: 70,
      atl: 65,
      tsb: 5,
      rampRate: 2,
    };

    const result = transformWellnessToCheckin(wellness);

    expect(result).toEqual({
      sleepQuality: null,
      sleepHours: null,
      energyLevel: null,
      stressLevel: null,
      overallSoreness: null,
    });
  });

  it('passes sleepHours through without scaling', () => {
    const wellness: WellnessDataPoint = {
      date: '2026-02-13',
      ctl: 70,
      atl: 65,
      tsb: 5,
      rampRate: 2,
      sleepHours: 6.5,
    };

    const result = transformWellnessToCheckin(wellness);

    expect(result.sleepHours).toBe(6.5);
  });

  it('ignores sleepQuality field (uses sleepScore instead)', () => {
    const wellness: WellnessDataPoint = {
      date: '2026-02-13',
      ctl: 70,
      atl: 65,
      tsb: 5,
      rampRate: 2,
      sleepQuality: 1, // GREAT on 1-4 scale, but should be ignored
      // no sleepScore
    };

    const result = transformWellnessToCheckin(wellness);

    expect(result.sleepQuality).toBeNull(); // no sleepScore = null
  });
});

describe('useWellnessSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in loading state', () => {
    mockGetTodayWellness.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useWellnessSync());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.wellnessData).toBeNull();
    expect(result.current.prefillData).toBeNull();
  });

  it('transforms wellness data to checkin prefill', async () => {
    mockGetTodayWellness.mockResolvedValue({
      date: '2026-02-13',
      ctl: 70,
      atl: 65,
      tsb: 5,
      rampRate: 2,
      sleepScore: 80,
      sleepHours: 7.5,
      fatigue: 2,
      stress: 3,
      soreness: 2,
    });

    const { result } = renderHook(() => useWellnessSync());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.prefillData).toEqual({
      sleepQuality: 8, // 80/10 = 8
      sleepHours: 7.5,
      energyLevel: 7, // fatigue 2 inverted
      stressLevel: 7, // stress 3 same direction
      overallSoreness: 4, // soreness 2 same direction
    });
    expect(result.current.wellnessData).toBeTruthy();
    expect(result.current.error).toBeNull();
  });

  it('returns null prefill when no wellness data', async () => {
    mockGetTodayWellness.mockResolvedValue(null);

    const { result } = renderHook(() => useWellnessSync());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.prefillData).toBeNull();
    expect(result.current.wellnessData).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns null prefill when wellness data has no subjective fields', async () => {
    mockGetTodayWellness.mockResolvedValue({
      date: '2026-02-13',
      ctl: 70,
      atl: 65,
      tsb: 5,
      rampRate: 2,
      // No sleepScore, sleepHours, fatigue, stress, or soreness
    });

    const { result } = renderHook(() => useWellnessSync());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.prefillData).toBeNull();
    expect(result.current.wellnessData).toBeTruthy();
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors gracefully', async () => {
    mockGetTodayWellness.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWellnessSync());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.prefillData).toBeNull();
    expect(result.current.wellnessData).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('handles non-Error thrown values', async () => {
    mockGetTodayWellness.mockRejectedValue('string error');

    const { result } = renderHook(() => useWellnessSync());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to sync wellness data');
  });

  it('refetch re-fetches wellness data', async () => {
    mockGetTodayWellness.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useWellnessSync());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.prefillData).toBeNull();

    // Now mock data available on refetch
    mockGetTodayWellness.mockResolvedValueOnce({
      date: '2026-02-13',
      ctl: 70,
      atl: 65,
      tsb: 5,
      rampRate: 2,
      sleepScore: 70,
      sleepHours: 6,
      fatigue: 3,
      stress: 2,
      soreness: 1,
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.prefillData).toEqual({
      sleepQuality: 7, // 70/10 = 7
      sleepHours: 6,
      energyLevel: 4, // fatigue 3 inverted
      stressLevel: 4, // stress 2 same direction
      overallSoreness: 1, // soreness 1 same direction
    });
  });
});
