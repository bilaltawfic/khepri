// Context builder for the AI Orchestrator.
// Fetches and assembles comprehensive athlete context from Supabase,
// enabling auto-context when callers provide only an athlete_id.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { AthleteContext } from './types.ts';

export interface ContextBuilderOptions {
  readonly includeCheckin?: boolean;
}

/**
 * Fetch comprehensive athlete context from the database.
 * All queries run in parallel for performance.
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
      .order('priority'),
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
      goal_type: (g.goal_type as string) ?? undefined,
      target_date: (g.target_date as string) ?? undefined,
      priority: (g.priority as string) ?? undefined,
      race_event_name: (g.race_event_name as string) ?? undefined,
      race_distance: (g.race_distance as string) ?? undefined,
      race_target_time_seconds: (g.race_target_time_seconds as number) ?? undefined,
    })),
    active_constraints: (constraintsResult.data ?? []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      type: (c.constraint_type as string) ?? '',
      description: (c.description as string) ?? '',
      start_date: (c.start_date as string) ?? undefined,
      end_date: (c.end_date as string) ?? undefined,
      injury_body_part: (c.injury_body_part as string) ?? undefined,
      injury_severity: (c.injury_severity as string) ?? undefined,
      injury_restrictions: (c.injury_restrictions as string[]) ?? undefined,
    })),
    recent_checkin:
      checkinResult.data == null
        ? undefined
        : {
            date: checkinResult.data.checkin_date as string,
            energy_level: (checkinResult.data.energy_level as number) ?? undefined,
            sleep_quality: (checkinResult.data.sleep_quality as number) ?? undefined,
            stress_level: (checkinResult.data.stress_level as number) ?? undefined,
            muscle_soreness: (checkinResult.data.muscle_soreness as number) ?? undefined,
            resting_hr: (checkinResult.data.resting_hr as number) ?? undefined,
            hrv_ms: (checkinResult.data.hrv_ms as number) ?? undefined,
          },
  };
}
