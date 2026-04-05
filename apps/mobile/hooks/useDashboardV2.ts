import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type WeeklyCompliance,
  type WorkoutComplianceResult,
  computeWeeklyCompliance,
} from '@khepri/core';
import type {
  GoalRow,
  KhepriSupabaseClient,
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
  getTodayCheckin,
  getWorkoutsByDate,
  getWorkoutsForDateRange,
} from '@khepri/supabase-client';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';

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
  readonly weekRemainingCount: number;
  readonly nextRace: NextRace | null;
  readonly blockWeek: number;
  readonly checkInDone: boolean;
}

export interface UseDashboardV2Return {
  readonly data: DashboardV2Data | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
}

/** Parse "YYYY-MM-DD" into [year, month, day] integers */
function parseDateParts(dateStr: string): [number, number, number] {
  const [y, m, d] = dateStr.split('-').map(Number);
  return [y, m, d];
}

/** UTC day count between two YYYY-MM-DD strings (DST-safe) */
function diffDaysUtc(a: string, b: string): number {
  const [ay, am, ad] = parseDateParts(a);
  const [by, bm, bd] = parseDateParts(b);
  const aUtc = Date.UTC(ay, am - 1, ad);
  const bUtc = Date.UTC(by, bm - 1, bd);
  return Math.floor((bUtc - aUtc) / 86_400_000);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add days to a YYYY-MM-DD string using UTC (DST-safe) */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = parseDateParts(dateStr);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function computeBlockWeek(blockStartDate: string, today: string): number {
  const diffDays = diffDaysUtc(blockStartDate, today);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

function computeNextRace(goal: GoalRow): NextRace | null {
  if (goal.target_date == null) return null;
  const daysUntil = diffDaysUtc(getToday(), goal.target_date);
  if (daysUntil < 0) return null;
  return {
    name: goal.race_event_name ?? goal.title,
    date: goal.target_date,
    daysUntil,
  };
}

function getWeekStartDate(today: string): string {
  const [y, m, d] = parseDateParts(today);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = utcDate.getUTCDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return addDays(today, -diff);
}

function mapRowsToComplianceInput(rows: readonly WorkoutRow[]): ReadonlyArray<{
  readonly compliance: WorkoutComplianceResult | null;
  readonly planned_duration_minutes: number;
  readonly actual_duration_minutes: number | null;
  readonly planned_tss: number | null;
  readonly actual_tss: number | null;
}> {
  return rows.map((r) => {
    const compliance: WorkoutComplianceResult | null = r.compliance as never;
    return {
      compliance,
      planned_duration_minutes: r.planned_duration_minutes,
      actual_duration_minutes: r.actual_duration_minutes,
      planned_tss: r.planned_tss,
      actual_tss: r.actual_tss,
    };
  });
}

/** Collect first error message from multiple query results */
function firstError(
  ...results: ReadonlyArray<{ readonly error: { readonly message: string } | null }>
): string | null {
  for (const r of results) {
    if (r.error != null) return r.error.message;
  }
  return null;
}

async function fetchUpcomingWorkouts(
  client: KhepriSupabaseClient,
  athleteId: string,
  today: string,
  hasActiveBlock: boolean,
  isMounted: () => boolean
): Promise<{ data: WorkoutRow[]; error: string | null }> {
  if (!hasActiveBlock) return { data: [], error: null };
  const upcomingStart = addDays(today, 1);
  const upcomingEnd = addDays(today, 3);
  const result = await getWorkoutsForDateRange(client, athleteId, upcomingStart, upcomingEnd);
  if (!isMounted()) return { data: [], error: null };
  if (result.error != null) return { data: [], error: result.error.message };
  return { data: result.data ?? [], error: null };
}

async function fetchNextRace(
  client: KhepriSupabaseClient,
  goalId: string | null,
  isMounted: () => boolean
): Promise<{ data: NextRace | null; error: string | null }> {
  if (goalId == null) return { data: null, error: null };
  const goalResult = await getGoalById(client, goalId);
  if (!isMounted()) return { data: null, error: null };
  if (goalResult.error != null) return { data: null, error: goalResult.error.message };
  if (goalResult.data == null) return { data: null, error: null };
  return { data: computeNextRace(goalResult.data), error: null };
}

async function fetchDashboardData(
  client: KhepriSupabaseClient,
  athleteId: string,
  isMounted: () => boolean
): Promise<DashboardV2Data | { error: string }> {
  const today = getToday();
  const weekStart = getWeekStartDate(today);
  const weekEnd = addDays(weekStart, 6);

  const [seasonResult, blockResult, todayResult, adaptationsResult, weekResult, checkinResult] =
    await Promise.all([
      getActiveSeason(client, athleteId),
      getActiveBlock(client, athleteId),
      getWorkoutsByDate(client, athleteId, today),
      getPendingAdaptations(client, athleteId),
      getWorkoutsForDateRange(client, athleteId, weekStart, weekEnd),
      getTodayCheckin(client, athleteId),
    ]);

  if (!isMounted()) return { error: '' };

  // Check all query errors — fail fast rather than silently treating failures as empty data
  const queryError = firstError(
    seasonResult,
    blockResult,
    todayResult,
    adaptationsResult,
    weekResult,
    checkinResult
  );
  if (queryError != null) return { error: queryError };

  const activeBlock = blockResult.data ?? null;
  const weekWorkouts = weekResult.data ?? [];

  const upcomingResult = await fetchUpcomingWorkouts(
    client,
    athleteId,
    today,
    activeBlock != null,
    isMounted
  );
  if (upcomingResult.error != null) return { error: upcomingResult.error };

  const nextRaceResult = await fetchNextRace(client, activeBlock?.goal_id ?? null, isMounted);
  if (!isMounted()) return { error: '' };
  if (nextRaceResult.error != null) return { error: nextRaceResult.error };

  // Filter to workouts on or before today so future planned sessions aren't counted as missed
  const pastAndTodayWorkouts = weekWorkouts.filter((w) => w.date <= today);
  const futureWorkouts = weekWorkouts.filter(
    (w) => w.date > today && w.planned_duration_minutes > 0
  );

  const weeklyCompliance =
    pastAndTodayWorkouts.length > 0
      ? computeWeeklyCompliance(mapRowsToComplianceInput(pastAndTodayWorkouts))
      : null;

  const blockWeek = activeBlock == null ? 0 : computeBlockWeek(activeBlock.start_date, today);

  return {
    season: seasonResult.data ?? null,
    activeBlock,
    todayWorkouts: todayResult.data ?? [],
    pendingAdaptations: adaptationsResult.data ?? [],
    upcomingWorkouts: upcomingResult.data,
    weeklyCompliance,
    weekRemainingCount: futureWorkouts.length,
    nextRace: nextRaceResult.data,
    blockWeek,
    checkInDone: checkinResult.data != null,
  };
}

function isErrorResult(result: DashboardV2Data | { error: string }): result is { error: string } {
  return 'error' in result;
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

      const isMounted = () => isMountedRef.current;
      const result = await fetchDashboardData(supabase, athleteResult.data.id, isMounted);
      if (!isMountedRef.current) return;

      if (isErrorResult(result)) {
        if (result.error !== '') {
          setError(result.error);
          setData(null);
        }
        return;
      }

      setData(result);
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
