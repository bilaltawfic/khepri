import { useCallback, useEffect, useState } from 'react';

import {
  type FitnessDataPoint,
  type FormStatus,
  type FormTrend,
  type RecoveryAssessment,
  type WeeklyLoadSummary,
  assessRecovery,
  calculateFormTrend,
  calculateWeeklyLoads,
  getFormStatus,
} from '@khepri/core';

import { useAuth } from '@/contexts';
import {
  type ActivityData,
  type WellnessDataPoint,
  getRecentActivities,
  getWellnessData,
} from '@/services/intervals';

export const LOOKBACK_DAYS = 42;

export type TrainingReviewData = {
  readonly formStatus: FormStatus;
  readonly formTrend: FormTrend | null;
  readonly weeklyLoads: readonly WeeklyLoadSummary[];
  readonly recovery: RecoveryAssessment | null;
  readonly fitnessData: readonly FitnessDataPoint[];
  readonly latestCTL: number;
  readonly latestATL: number;
  readonly latestTSB: number;
};

export type UseTrainingReviewReturn = {
  readonly data: TrainingReviewData | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
};

function mapWellnessToFitness(wellness: readonly WellnessDataPoint[]): FitnessDataPoint[] {
  return wellness.map((w) => ({
    date: w.date,
    ctl: w.ctl,
    atl: w.atl,
    tsb: w.tsb,
  }));
}

function mapActivities(activities: readonly ActivityData[]) {
  return activities.map((a) => ({
    date: a.start_date.split('T')[0],
    duration: Math.round(a.duration / 60),
    tss: a.tss ?? 0,
    type: a.type,
  }));
}

export function useTrainingReview(): UseTrainingReviewReturn {
  const { user } = useAuth();
  const [data, setData] = useState<TrainingReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isCurrent: () => boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      const [wellness, activities] = await Promise.all([
        getWellnessData(LOOKBACK_DAYS),
        getRecentActivities(LOOKBACK_DAYS),
      ]);

      if (!isCurrent()) return;

      const fitnessData = mapWellnessToFitness(wellness);

      if (fitnessData.length === 0) {
        setData(null);
        setIsLoading(false);
        return;
      }

      const latest = fitnessData.at(-1);
      if (latest == null) {
        setData(null);
        setIsLoading(false);
        return;
      }
      const formStatus = getFormStatus(latest.tsb);
      const formTrend = calculateFormTrend(fitnessData.slice(-7));
      const activityRecords = mapActivities(activities);
      const weeklyLoads = calculateWeeklyLoads(activityRecords);
      const recovery = assessRecovery(fitnessData);

      setData({
        formStatus,
        formTrend,
        weeklyLoads,
        recovery,
        fitnessData,
        latestCTL: latest.ctl,
        latestATL: latest.atl,
        latestTSB: latest.tsb,
      });
    } catch (err) {
      if (!isCurrent()) return;
      setError(err instanceof Error ? err.message : 'Failed to load training data');
    } finally {
      if (isCurrent()) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    if (user?.id) {
      void loadData(() => isCurrent);
    } else {
      setData(null);
      setIsLoading(false);
    }

    return () => {
      isCurrent = false;
    };
  }, [user?.id, loadData]);

  const refresh = useCallback(async () => {
    await loadData(() => true);
  }, [loadData]);

  return { data, isLoading, error, refresh };
}
