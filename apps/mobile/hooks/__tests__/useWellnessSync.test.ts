import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { WellnessDataPoint } from '@/services/intervals';
import {
  fatigueToEnergy,
  scale5to10,
  transformWellnessToCheckin,
  useWellnessSync,
} from '../useWellnessSync';

const mockGetTodayWellness = jest.fn();

jest.mock('@/services/intervals', () => ({
  getTodayWellness: (...args: unknown[]) => mockGetTodayWellness(...args),
}));

describe('scale5to10', () => {
  it('maps 1 to 1', () => {
    expect(scale5to10(1)).toBe(1);
  });

  it('maps 2 to 3', () => {
    expect(scale5to10(2)).toBe(3);
  });

  it('maps 3 to 5', () => {
    expect(scale5to10(3)).toBe(5);
  });

  it('maps 4 to 7', () => {
    expect(scale5to10(4)).toBe(7);
  });

  it('maps 5 to 9', () => {
    expect(scale5to10(5)).toBe(9);
  });

  it('returns null for undefined', () => {
    expect(scale5to10(undefined)).toBeNull();
  });
});

describe('fatigueToEnergy', () => {
  it('maps fatigue 1 (low) to energy 9 (high)', () => {
    expect(fatigueToEnergy(1)).toBe(9);
  });

  it('maps fatigue 2 to energy 7', () => {
    expect(fatigueToEnergy(2)).toBe(7);
  });

  it('maps fatigue 3 to energy 5', () => {
    expect(fatigueToEnergy(3)).toBe(5);
  });

  it('maps fatigue 4 to energy 3', () => {
    expect(fatigueToEnergy(4)).toBe(3);
  });

  it('maps fatigue 5 (high) to energy 1 (low)', () => {
    expect(fatigueToEnergy(5)).toBe(1);
  });

  it('returns null for undefined', () => {
    expect(fatigueToEnergy(undefined)).toBeNull();
  });
});

describe('transformWellnessToCheckin', () => {
  it('transforms full wellness data to checkin prefill', () => {
    const wellness: WellnessDataPoint = {
      date: '2026-02-13',
      ctl: 70,
      atl: 65,
      tsb: 5,
      rampRate: 2,
      sleepQuality: 4,
      sleepHours: 7.5,
      fatigue: 2,
      stress: 3,
      soreness: 2,
    };

    const result = transformWellnessToCheckin(wellness);

    expect(result).toEqual({
      sleepQuality: 7,
      sleepHours: 7.5,
      energyLevel: 7,
      stressLevel: 5,
      overallSoreness: 3,
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
      sleepQuality: 4,
      sleepHours: 7.5,
      fatigue: 2,
      stress: 3,
      soreness: 2,
    });

    const { result } = renderHook(() => useWellnessSync());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.prefillData).toEqual({
      sleepQuality: 7,
      sleepHours: 7.5,
      energyLevel: 7,
      stressLevel: 5,
      overallSoreness: 3,
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
      // No sleepQuality, sleepHours, fatigue, stress, or soreness
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
      sleepQuality: 3,
      sleepHours: 6,
      fatigue: 3,
      stress: 2,
      soreness: 1,
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.prefillData).toEqual({
      sleepQuality: 5,
      sleepHours: 6,
      energyLevel: 5,
      stressLevel: 3,
      overallSoreness: 1,
    });
  });
});
