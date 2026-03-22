import { useMemo } from 'react';

import { type WeekOverviewInfo, getCurrentWeekInfo, getToday } from '@khepri/core';

import { useTrainingPlan } from './useTrainingPlan';

export interface UseWeekOverviewReturn {
  readonly info: WeekOverviewInfo | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export function useWeekOverview(): UseWeekOverviewReturn {
  const { plan, isLoading, error } = useTrainingPlan();

  const info = useMemo(() => {
    if (plan == null) return null;

    return getCurrentWeekInfo(
      plan.start_date,
      plan.total_weeks,
      plan.periodization,
      plan.weekly_template,
      getToday()
    );
  }, [plan]);

  return { info, isLoading, error };
}
