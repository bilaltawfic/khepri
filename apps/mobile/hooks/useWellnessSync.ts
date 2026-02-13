import { useCallback, useEffect, useState } from 'react';

import { type WellnessDataPoint, getTodayWellness } from '@/services/intervals';
import type { CheckinFormData } from '@/types/checkin';

interface WellnessSyncState {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly wellnessData: WellnessDataPoint | null;
  readonly prefillData: Partial<CheckinFormData> | null;
}

/**
 * Map Intervals.icu 1-5 scale to our 1-10 scale.
 * Maps: 1->1, 2->3, 3->5, 4->7, 5->9
 */
export function scale5to10(value: number | undefined): number | null {
  if (value == null) return null;
  return Math.round((value - 1) * 2 + 1);
}

/**
 * Map Intervals.icu fatigue (1-5) to our energy level (1-10).
 * Fatigue is inverted: 1 (low fatigue) = 9 (high energy), 5 (high fatigue) = 1 (low energy)
 */
export function fatigueToEnergy(fatigue: number | undefined): number | null {
  if (fatigue == null) return null;
  return Math.round((6 - fatigue) * 2 - 1);
}

/**
 * Transform Intervals.icu wellness data to check-in form prefill data.
 */
export function transformWellnessToCheckin(wellness: WellnessDataPoint): Partial<CheckinFormData> {
  return {
    sleepQuality: scale5to10(wellness.sleepQuality),
    sleepHours: wellness.sleepHours ?? null,
    energyLevel: fatigueToEnergy(wellness.fatigue),
    stressLevel: scale5to10(wellness.stress),
    overallSoreness: scale5to10(wellness.soreness),
  };
}

export function useWellnessSync(): WellnessSyncState & {
  readonly refetch: () => Promise<void>;
} {
  const [state, setState] = useState<WellnessSyncState>({
    isLoading: true,
    error: null,
    wellnessData: null,
    prefillData: null,
  });

  const fetchWellness = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const wellness = await getTodayWellness();

      if (wellness) {
        const prefillData = transformWellnessToCheckin(wellness);
        setState({
          isLoading: false,
          error: null,
          wellnessData: wellness,
          prefillData,
        });
      } else {
        // No wellness data for today - not an error, just no data
        setState({
          isLoading: false,
          error: null,
          wellnessData: null,
          prefillData: null,
        });
      }
    } catch (error) {
      // Don't block check-in on wellness sync failure
      console.warn('Failed to fetch wellness data:', error);
      setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to sync wellness data',
        wellnessData: null,
        prefillData: null,
      });
    }
  }, []);

  useEffect(() => {
    fetchWellness();
  }, [fetchWellness]);

  return {
    ...state,
    refetch: fetchWellness,
  };
}
