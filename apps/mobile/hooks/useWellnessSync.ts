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
 * Map Intervals.icu 1-4 scale to our 1-10 scale.
 * Intervals.icu uses 1=best (Great/Low), 4=worst (Poor/Extreme).
 * Maps: 1->10, 2->7, 3->4, 4->1
 */
export function scale4to10Inverted(value: number | undefined): number | null {
  if (value == null || value < 1) return null;
  return 10 - (value - 1) * 3;
}

/**
 * Map Intervals.icu fatigue (1-4) to our energy level (1-10).
 * Fatigue is inverted: 1 (LOW fatigue) = high energy, 4 (EXTREME fatigue) = low energy.
 */
export function fatigueToEnergy(fatigue: number | undefined): number | null {
  if (fatigue == null || fatigue < 1) return null;
  return 10 - (fatigue - 1) * 3;
}

/**
 * Map Intervals.icu sleep score (0-100) to our 1-10 scale.
 * Divides by 10 and rounds, clamped to 1-10.
 */
export function sleepScoreTo10(score: number | undefined): number | null {
  if (score == null) return null;
  return Math.max(1, Math.min(10, Math.round(score / 10)));
}

/**
 * Map Intervals.icu 1-4 scale to our 1-10 scale (same direction).
 * Used for stress/soreness where 1=Low (good) and 4=Extreme (bad).
 * Maps: 1->1, 2->4, 3->7, 4->10
 */
export function scale4to10(value: number | undefined): number | null {
  if (value == null || value < 1) return null;
  return 1 + (value - 1) * 3;
}

/**
 * Transform Intervals.icu wellness data to check-in form prefill data.
 */
export function transformWellnessToCheckin(wellness: WellnessDataPoint): Partial<CheckinFormData> {
  return {
    sleepQuality: sleepScoreTo10(wellness.sleepScore) ?? scale4to10Inverted(wellness.sleepQuality),
    sleepHours: wellness.sleepHours ?? null,
    energyLevel: fatigueToEnergy(wellness.fatigue),
    stressLevel: scale4to10(wellness.stress),
    overallSoreness: scale4to10(wellness.soreness),
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
        const transformed = transformWellnessToCheckin(wellness);
        const hasValues = Object.values(transformed).some((v) => v != null);
        setState({
          isLoading: false,
          error: null,
          wellnessData: wellness,
          prefillData: hasValues ? transformed : null,
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
