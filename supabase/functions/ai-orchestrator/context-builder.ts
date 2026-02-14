// Context builder for the AI Orchestrator.
// Fetches and assembles comprehensive athlete context from Supabase,
// enabling auto-context when callers provide only an athlete_id.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { AthleteContext } from './types.ts';

export interface ContextBuilderOptions {
  readonly includeCheckin?: boolean;
}

const VALID_PRIORITIES = new Set(['A', 'B', 'C']);
const VALID_SEVERITIES = new Set(['mild', 'moderate', 'severe']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fetch comprehensive athlete context from the database.
 * All queries run in parallel for performance.
 *
 * Note: "today" is determined in UTC. Check-in and constraint date
 * comparisons use UTC date, which may differ from the athlete's
 * local date near midnight.
 *
 * @throws Error if the athlete is not found or the athlete query fails.
 */
export async function fetchAthleteContext(
  supabase: SupabaseClient,
  athleteId: string,
  options?: ContextBuilderOptions
): Promise<AthleteContext> {
  const includeCheckin = options?.includeCheckin !== false;
  const today = new Date().toISOString().split('T')[0];

  if (!DATE_PATTERN.test(today)) {
    throw new Error(`Unexpected date format: ${today}`);
  }

  const [athleteResult, goalsResult, constraintsResult, checkinResult] = await Promise.all([
    supabase
      .from('athletes')
      .select(
        'id, display_name, ftp_watts, weight_kg, running_threshold_pace_sec_per_km, css_sec_per_100m, max_heart_rate, lthr'
      )
      .eq('id', athleteId)
      .single(),
    supabase
      .from('goals')
      .select(
        'id, title, goal_type, target_date, priority, race_event_name, race_distance, race_target_time_seconds'
      )
      .eq('athlete_id', athleteId)
      .eq('status', 'active')
      .order('priority', { ascending: true }),
    supabase
      .from('constraints')
      .select(
        'id, constraint_type, description, start_date, end_date, injury_body_part, injury_severity, injury_restrictions'
      )
      .eq('athlete_id', athleteId)
      .eq('status', 'active')
      .or(`end_date.is.null,end_date.gte.${today}`),
    includeCheckin
      ? supabase
          .from('daily_checkins')
          .select(
            'checkin_date, energy_level, sleep_quality, stress_level, muscle_soreness, resting_hr, hrv_ms'
          )
          .eq('athlete_id', athleteId)
          .eq('checkin_date', today)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (athleteResult.error != null) {
    throw new Error(`Failed to fetch athlete: ${athleteResult.error.message}`);
  }

  if (athleteResult.data == null) {
    throw new Error(`Athlete not found: ${athleteId}`);
  }

  if (goalsResult.error != null) {
    console.error('Failed to fetch goals:', goalsResult.error);
  }

  if (constraintsResult.error != null) {
    console.error('Failed to fetch constraints:', constraintsResult.error);
  }

  const athlete = athleteResult.data;

  return {
    athlete_id: athleteId,
    display_name: athlete.display_name ?? undefined,
    ftp_watts: athlete.ftp_watts ?? undefined,
    weight_kg: athlete.weight_kg ?? undefined,
    running_threshold_pace_sec_per_km: athlete.running_threshold_pace_sec_per_km ?? undefined,
    css_sec_per_100m: athlete.css_sec_per_100m ?? undefined,
    max_heart_rate: athlete.max_heart_rate ?? undefined,
    lthr: athlete.lthr ?? undefined,
    active_goals: (goalsResult.data ?? []).map((g: Record<string, unknown>) => ({
      id: g.id as string,
      title: g.title as string,
      goal_type: g.goal_type ?? undefined,
      target_date: g.target_date ?? undefined,
      priority: VALID_PRIORITIES.has(g.priority as string)
        ? (g.priority as 'A' | 'B' | 'C')
        : undefined,
      race_event_name: g.race_event_name ?? undefined,
      race_distance: g.race_distance ?? undefined,
      race_target_time_seconds:
        g.race_target_time_seconds == null ? undefined : (g.race_target_time_seconds as number),
    })),
    active_constraints: (constraintsResult.data ?? []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      type: typeof c.constraint_type === 'string' ? c.constraint_type : '',
      description: typeof c.description === 'string' ? c.description : '',
      start_date: c.start_date ?? undefined,
      end_date: c.end_date ?? undefined,
      injury_body_part: c.injury_body_part ?? undefined,
      injury_severity: VALID_SEVERITIES.has(c.injury_severity as string)
        ? (c.injury_severity as 'mild' | 'moderate' | 'severe')
        : undefined,
      injury_restrictions: Array.isArray(c.injury_restrictions)
        ? (c.injury_restrictions as unknown[]).filter((x): x is string => typeof x === 'string')
        : undefined,
    })),
    recent_checkin:
      checkinResult.data == null
        ? undefined
        : {
            date: checkinResult.data.checkin_date as string,
            energy_level: checkinResult.data.energy_level ?? undefined,
            sleep_quality: checkinResult.data.sleep_quality ?? undefined,
            stress_level: checkinResult.data.stress_level ?? undefined,
            muscle_soreness: checkinResult.data.muscle_soreness ?? undefined,
            resting_hr: checkinResult.data.resting_hr ?? undefined,
            hrv_ms: checkinResult.data.hrv_ms ?? undefined,
          },
  };
}
