import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import { type ActivityData, getRecentActivities, getWellnessSummary } from '@/services/intervals';
import {
  type GoalRow,
  getActiveGoals,
  getAthleteByAuthUser,
  getTodayCheckin,
} from '@khepri/supabase-client';

export type TodayRecommendation = {
  workoutSuggestion: string;
  intensityLevel: 'recovery' | 'easy' | 'moderate' | 'threshold' | 'hard';
  duration: number;
  summary: string;
};

export type FitnessMetrics = {
  ftp: number | null;
  weight: number | null;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
};

export type UpcomingEvent = {
  id: string;
  title: string;
  type: 'goal' | 'constraint' | 'workout';
  date: string;
  priority?: 'A' | 'B' | 'C';
};

export type RecentActivity = {
  id: string;
  name: string;
  type: string;
  date: string;
  duration: number; // in minutes
  load?: number;
};

export type DashboardData = {
  greeting: string;
  athleteName: string | null;
  todayRecommendation: TodayRecommendation | null;
  hasCompletedCheckinToday: boolean;
  fitnessMetrics: FitnessMetrics;
  upcomingEvents: UpcomingEvent[];
  recentActivities: RecentActivity[];
  warnings: string[];
};

export type UseDashboardReturn = {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const VALID_INTENSITIES = ['recovery', 'easy', 'moderate', 'threshold', 'hard'] as const;

function getGreeting(firstName?: string | null): string {
  const hour = new Date().getHours();
  const name = firstName ? `, ${firstName}` : '';

  if (hour < 12) return `Good morning${name}!`;
  if (hour < 17) return `Good afternoon${name}!`;
  return `Good evening${name}!`;
}

function getFirstName(displayName: string | null): string | null {
  if (!displayName) return null;
  return displayName.split(' ')[0] ?? null;
}

function parseRecommendation(json: unknown): TodayRecommendation | null {
  if (!json || typeof json !== 'object') return null;
  const rec = json as Record<string, unknown>;

  if (typeof rec.workoutSuggestion !== 'string') return null;
  if (typeof rec.summary !== 'string') return null;

  const intensity = VALID_INTENSITIES.includes(
    rec.intensityLevel as (typeof VALID_INTENSITIES)[number]
  )
    ? (rec.intensityLevel as (typeof VALID_INTENSITIES)[number])
    : 'moderate';

  return {
    workoutSuggestion: rec.workoutSuggestion,
    intensityLevel: intensity,
    duration: typeof rec.duration === 'number' ? rec.duration : 60,
    summary: rec.summary,
  };
}

function activityToDisplay(activity: ActivityData): RecentActivity {
  return {
    id: activity.id,
    name: activity.name,
    type: activity.type,
    date: activity.start_date,
    duration: Math.round(activity.duration / 60),
    load: activity.tss,
  };
}

function goalsToEvents(goals: GoalRow[]): UpcomingEvent[] {
  return goals
    .filter(
      (g): g is GoalRow & { target_date: string } => g.target_date != null && g.status === 'active'
    )
    .map((g) => ({
      id: g.id,
      title: g.title,
      type: 'goal' as const,
      date: g.target_date,
      priority: ['A', 'B', 'C'].includes(g.priority ?? '')
        ? (g.priority as 'A' | 'B' | 'C')
        : undefined,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
}

export function useDashboard(): UseDashboardReturn {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id || !supabase) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [athleteResult, wellness] = await Promise.all([
        getAthleteByAuthUser(supabase, user.id),
        getWellnessSummary().catch(() => null),
      ]);

      if (athleteResult.error) {
        setError(athleteResult.error.message);
        setData(null);
        return;
      }

      if (!athleteResult.data) {
        setError('No athlete profile found');
        setData(null);
        return;
      }

      const athlete = athleteResult.data;
      const firstName = getFirstName(athlete.display_name);

      const [goalsResult, checkinResult, activities] = await Promise.all([
        getActiveGoals(supabase, athlete.id),
        getTodayCheckin(supabase, athlete.id),
        getRecentActivities(7).catch(() => [] as ActivityData[]),
      ]);

      const warnings: string[] = [];

      if (goalsResult.error) {
        warnings.push('Unable to load goals');
      }
      if (checkinResult.error) {
        warnings.push('Unable to load check-in');
      }

      const goals = goalsResult.data ?? [];
      const upcomingEvents = goalsToEvents(goals);

      const todayCheckin = checkinResult.data;
      const hasCompletedCheckinToday = todayCheckin != null;
      const todayRecommendation = todayCheckin?.ai_recommendation
        ? parseRecommendation(todayCheckin.ai_recommendation)
        : null;

      setData({
        greeting: getGreeting(firstName),
        athleteName: firstName,
        todayRecommendation,
        hasCompletedCheckinToday,
        fitnessMetrics: {
          ftp: athlete.ftp_watts ?? null,
          weight: athlete.weight_kg == null ? null : Number(athlete.weight_kg),
          ctl: wellness?.ctl ?? null,
          atl: wellness?.atl ?? null,
          tsb: wellness?.tsb ?? null,
        },
        upcomingEvents,
        recentActivities: activities.slice(0, 5).map(activityToDisplay),
        warnings,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const refresh = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, isLoading, error, refresh };
}
