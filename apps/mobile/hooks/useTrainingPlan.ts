import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import {
  type TrainingPlanRow,
  cancelTrainingPlan,
  getActiveTrainingPlan,
  getAthleteByAuthUser,
  pauseTrainingPlan,
} from '@khepri/supabase-client';

export interface UseTrainingPlanReturn {
  readonly plan: TrainingPlanRow | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly pausePlan: () => Promise<{ success: boolean; error?: string }>;
  readonly cancelPlan: () => Promise<{ success: boolean; error?: string }>;
}

export function useTrainingPlan(): UseTrainingPlanReturn {
  const { user } = useAuth();
  const [plan, setPlan] = useState<TrainingPlanRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function fetchPlan() {
      if (!user?.id || !supabase) {
        setAthleteId(null);
        setPlan(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setAthleteId(null);
      setPlan(null);

      try {
        const athleteResult = await getAthleteByAuthUser(supabase, user.id);
        if (!isCurrent) return;

        if (athleteResult.error) {
          setError(athleteResult.error.message);
          setIsLoading(false);
          return;
        }

        if (!athleteResult.data) {
          setError('No athlete profile found for this user');
          setIsLoading(false);
          return;
        }

        const fetchedAthleteId = athleteResult.data.id;
        setAthleteId(fetchedAthleteId);

        const planResult = await getActiveTrainingPlan(supabase, fetchedAthleteId);
        if (!isCurrent) return;

        if (planResult.error) {
          setError(planResult.error.message);
          setIsLoading(false);
          return;
        }

        setPlan(planResult.data);
      } catch (err) {
        if (!isCurrent) return;
        setError(err instanceof Error ? err.message : 'Failed to load training plan');
        setPlan(null);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void fetchPlan();

    return () => {
      isCurrent = false;
    };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!supabase || !user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      let currentAthleteId = athleteId;
      if (!currentAthleteId) {
        const athleteResult = await getAthleteByAuthUser(supabase, user.id);
        if (athleteResult.error) {
          setError(athleteResult.error.message);
          return;
        }
        if (!athleteResult.data) {
          setError('No athlete profile found for this user');
          return;
        }
        currentAthleteId = athleteResult.data.id;
        setAthleteId(currentAthleteId);
      }

      const planResult = await getActiveTrainingPlan(supabase, currentAthleteId);
      if (planResult.error) {
        setError(planResult.error.message);
        return;
      }

      setPlan(planResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load training plan');
    } finally {
      setIsLoading(false);
    }
  }, [athleteId, user?.id]);

  const pausePlan = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!supabase || !plan) return { success: false, error: 'No active plan' };

    try {
      const { error: err } = await pauseTrainingPlan(supabase, plan.id);
      if (err) return { success: false, error: err.message };
      setPlan(null);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to pause plan',
      };
    }
  }, [plan]);

  const cancelPlan = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!supabase || !plan) return { success: false, error: 'No active plan' };

    try {
      const { error: err } = await cancelTrainingPlan(supabase, plan.id);
      if (err) return { success: false, error: err.message };
      setPlan(null);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to cancel plan',
      };
    }
  }, [plan]);

  return { plan, isLoading, error, refresh, pausePlan, cancelPlan };
}
