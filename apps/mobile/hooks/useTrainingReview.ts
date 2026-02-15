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
  formatDateLocal,
  getFormStatus,
} from '@khepri/core';

import { useAuth } from '@/contexts';
import {
  type ActivityData,
  type WellnessDataPoint,
  getRecentActivities,
} from '@/services/intervals';
import { type MCPToolResponse, getAuthHeaders, getMCPGatewayUrl } from '@/services/mcp-gateway';

const LOOKBACK_DAYS = 42;

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

interface WellnessResponse {
  wellness: WellnessDataPoint[];
  date_range: {
    oldest: string;
    newest: string;
  };
}

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
    date: a.start_date.split('T')[0] ?? a.start_date,
    duration: Math.round(a.duration / 60),
    tss: a.tss ?? 0,
    type: a.type,
  }));
}

async function fetchWellnessData(): Promise<WellnessDataPoint[]> {
  const headers = await getAuthHeaders();
  const today = new Date();
  const oldest = new Date();
  oldest.setDate(today.getDate() - LOOKBACK_DAYS);

  const response = await fetch(getMCPGatewayUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'execute_tool',
      tool_name: 'get_wellness_data',
      tool_input: {
        oldest: formatDateLocal(oldest),
        newest: formatDateLocal(today),
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch wellness data');
  }

  const result: MCPToolResponse<WellnessResponse> = await response.json();

  if (!result.success || !result.data) {
    return [];
  }

  return result.data.wellness;
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
        fetchWellnessData(),
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
