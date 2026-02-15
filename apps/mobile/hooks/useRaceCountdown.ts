import { useCallback, useEffect, useState } from 'react';

import { type FitnessDataPoint, type RaceReadiness, calculateRaceReadiness } from '@khepri/core';
import { type GoalRow, getAthleteByAuthUser, getUpcomingRaceGoals } from '@khepri/supabase-client';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import { type WellnessDataPoint, getWellnessData } from '@/services/intervals';

export type RaceCountdownItem = {
  readonly goal: GoalRow;
  readonly readiness: RaceReadiness | null;
};

export interface UseRaceCountdownReturn {
  readonly races: readonly RaceCountdownItem[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
}

function toFitnessDataPoint(w: WellnessDataPoint): FitnessDataPoint {
  return { date: w.date, ctl: w.ctl, atl: w.atl, tsb: w.tsb };
}

export function useRaceCountdown(): UseRaceCountdownReturn {
  const { user } = useAuth();
  const [races, setRaces] = useState<RaceCountdownItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<RaceCountdownItem[]> => {
    if (!user?.id || !supabase) {
      return [];
    }

    const athleteResult = await getAthleteByAuthUser(supabase, user.id);
    if (athleteResult.error) {
      throw new Error(athleteResult.error.message);
    }
    if (!athleteResult.data) {
      throw new Error('No athlete profile found for this user');
    }

    const goalsResult = await getUpcomingRaceGoals(supabase, athleteResult.data.id);
    if (goalsResult.error) {
      throw new Error(goalsResult.error.message);
    }

    const goals = goalsResult.data ?? [];
    if (goals.length === 0) {
      return [];
    }

    let fitnessData: FitnessDataPoint[] = [];
    try {
      const wellness = await getWellnessData(42);
      fitnessData = wellness.map(toFitnessDataPoint);
    } catch {
      // Wellness data unavailable — readiness will be null for all races
    }

    return goals.map((goal) => ({
      goal,
      readiness:
        goal.target_date != null && fitnessData.length >= 7
          ? calculateRaceReadiness(fitnessData, goal.target_date)
          : null,
    }));
  }, [user?.id]);

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const items = await fetchData();
        if (!isCurrent) return;
        setRaces(items);
      } catch (err) {
        if (!isCurrent) return;
        setError(err instanceof Error ? err.message : 'Failed to load race data');
        setRaces([]);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void load();

    return () => {
      isCurrent = false;
    };
  }, [fetchData]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const items = await fetchData();
      setRaces(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load race data');
      setRaces([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchData]);

  return { races, isLoading, error, refresh };
}
