import { type WeekOverviewInfo, formatDateLocal, getCurrentWeekInfo } from '@khepri/core';

import { useTrainingPlan } from './useTrainingPlan';

export interface UseWeekOverviewReturn {
  readonly info: WeekOverviewInfo | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export function useWeekOverview(): UseWeekOverviewReturn {
  const { plan, isLoading, error } = useTrainingPlan();

  if (plan == null) {
    return { info: null, isLoading, error };
  }

  const today = formatDateLocal(new Date());
  const info = getCurrentWeekInfo(
    plan.start_date,
    plan.total_weeks,
    plan.periodization,
    plan.weekly_template,
    today
  );

  return { info, isLoading, error };
}
