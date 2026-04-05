import { useCallback, useEffect, useRef, useState } from 'react';

import { type WeeklyCompliance, computeWeeklyCompliance } from '@khepri/core';
import type {
  GoalRow,
  PlanAdaptationRow,
  RaceBlockRow,
  SeasonRow,
  WorkoutRow,
} from '@khepri/supabase-client';
import {
  getActiveBlock,
  getActiveSeason,
  getAthleteByAuthUser,
  getGoalById,
  getPendingAdaptations,
  getWorkoutsByDate,
  getWorkoutsForDateRange,
} from '@khepri/supabase-client';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import { type ActivityData, getRecentActivities } from '@/services/intervals';
import { getTodayCheckin } from '@khepri/supabase-client';

export interface NextRace {
  readonly name: string;
  readonly date: string;
  readonly daysUntil: number;
}

export interface DashboardV2Data {
  readonly season: SeasonRow | null;
  readonly activeBlock: RaceBlockRow | null;
  readonly todayWorkouts: readonly WorkoutRow[];
  readonly pendingAdaptations: readonly PlanAdaptationRow[];
  readonly upcomingWorkouts: readonly WorkoutRow[];
  readonly weeklyCompliance: WeeklyCompliance | null;
  readonly nextRace: NextRace | null;
  readonly blockWeek: number;
  readonly checkInDone: boolean;
  readonly recentActivities: readonly ActivityData[];
}

export interface UseDashboardV2Return {
  readonly data: DashboardV2Data | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
}

function getToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function computeBlockWeek(blockStartDate: string, today: string): number {
  const start = new Date(`${blockStartDate}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

function computeNextRace(goal: GoalRow): NextRace | null {
  if (goal.target_date == null) return null;
  const today = getToday();
  const raceDate = new Date(`${goal.target_date}T00:00:00`);
  const todayDate = new Date(`${today}T00:00:00`);
  const diffMs = raceDate.getTime() - todayDate.getTime();
  const daysUntil = Math.ceil(diffMs / 86_400_000);
  return {
    name: goal.race_event_name ?? goal.title,
    date: goal.target_date,
    daysUntil,
  };
}

function getWeekStartDate(today: string): string {
  const d = new Date(`${today}T00:00:00`);
  const dayOfWeek = d.getDay();
  // Monday as week start (0=Sun, 1=Mon, ...)
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function mapRowsToComplianceInput(rows: readonly WorkoutRow[]): ReadonlyArray<{
  readonly compliance: import('@khepri/core').WorkoutComplianceResult | null;
  readonly planned_duration_minutes: number;
  readonly actual_duration_minutes: number | null;
  readonly planned_tss: number | null;
  readonly actual_tss: number | null;
}> {
  return rows.map((r) => ({
    compliance: r.compliance as import('@khepri/core').WorkoutComplianceResult | null,
    planned_duration_minutes: r.planned_duration_minutes,
    actual_duration_minutes: r.actual_duration_minutes,
    planned_tss: r.planned_tss,
    actual_tss: r.actual_tss,
  }));
}

export function useDashboardV2(): UseDashboardV2Return {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardV2Data | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id || !supabase) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const athleteResult = await getAthleteByAuthUser(supabase, user.id);
      if (!isMountedRef.current) return;

      if (athleteResult.error || !athleteResult.data) {
        setError(athleteResult.error?.message ?? 'No athlete profile found');
        setData(null);
        return;
      }

      const athleteId = athleteResult.data.id;
      const today = getToday();
      const weekStart = getWeekStartDate(today);
      const weekEnd = addDays(weekStart, 6);

      const [
        seasonResult,
        blockResult,
        todayResult,
        adaptationsResult,
        weekResult,
        checkinResult,
        activities,
      ] = await Promise.all([
        getActiveSeason(supabase, athleteId),
        getActiveBlock(supabase, athleteId),
        getWorkoutsByDate(supabase, athleteId, today),
        getPendingAdaptations(supabase, athleteId),
        getWorkoutsForDateRange(supabase, athleteId, weekStart, weekEnd),
        getTodayCheckin(supabase, athleteId),
        getRecentActivities(7).catch(() => [] as ActivityData[]),
      ]);

      if (!isMountedRef.current) return;

      const season = seasonResult.data ?? null;
      const activeBlock = blockResult.data ?? null;
      const todayWorkouts = todayResult.data ?? [];
      const pendingAdaptations = adaptationsResult.data ?? [];
      const weekWorkouts = weekResult.data ?? [];

      // Upcoming: next 3 days after today
      const upcomingStart = addDays(today, 1);
      const upcomingEnd = addDays(today, 3);
      let upcomingWorkouts: WorkoutRow[] = [];
      if (activeBlock != null) {
        const upcomingResult = await getWorkoutsForDateRange(
          supabase,
          athleteId,
          upcomingStart,
          upcomingEnd
        );
        if (isMountedRef.current) {
          upcomingWorkouts = upcomingResult.data ?? [];
        }
      }

      // Weekly compliance from this week's workouts
      const weeklyCompliance =
        weekWorkouts.length > 0
          ? computeWeeklyCompliance(mapRowsToComplianceInput(weekWorkouts))
          : null;

      // Block week
      const blockWeek = activeBlock != null ? computeBlockWeek(activeBlock.start_date, today) : 0;

      // Next race from block's goal
      let nextRace: NextRace | null = null;
      if (activeBlock?.goal_id != null) {
        const goalResult = await getGoalById(supabase, activeBlock.goal_id);
        if (isMountedRef.current && goalResult.data != null) {
          nextRace = computeNextRace(goalResult.data);
        }
      }

      if (!isMountedRef.current) return;

      setData({
        season,
        activeBlock,
        todayWorkouts,
        pendingAdaptations,
        upcomingWorkouts,
        weeklyCompliance,
        nextRace,
        blockWeek,
        checkInDone: checkinResult.data != null,
        recentActivities: activities.slice(0, 5),
      });
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        setData(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh };
}
