/**
 * Intervals.icu Cron Reconciliation Edge Function
 *
 * Invoked every 30 minutes via pg_cron or Supabase scheduled function.
 * Polls activities, events, and wellness for all connected athletes.
 *
 * Environment variables:
 * - SUPABASE_URL: Supabase project URL (auto-provided)
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for DB access
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import {
  computeCompliance,
  diffEventVsWorkout,
  matchActivityToWorkout,
} from '../_shared/intervals-sync-engine.ts';
import type {
  LocalEventState,
  PlannedWorkout,
  RemoteEventState,
  SyncActivity,
} from '../_shared/intervals-sync-engine.ts';
import { getIntervalsCredentials } from '../mcp-gateway/utils/credentials.ts';
import type { IntervalsCredentials } from '../mcp-gateway/utils/credentials.ts';
import { fetchActivities, fetchEvents, fetchWellness } from '../mcp-gateway/utils/intervals-api.ts';

// ====================================================================
// CORS
// ====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ====================================================================
// Date Helpers
// ====================================================================

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

// ====================================================================
// Sync Log Helper
// ====================================================================

type SupabaseServiceClient = ReturnType<typeof createClient>;

async function logSync(
  supabase: SupabaseServiceClient,
  athleteId: string,
  direction: 'push' | 'pull',
  resourceType: 'workout' | 'activity' | 'wellness' | 'event',
  resourceId: string | null,
  action: 'create' | 'update' | 'delete' | 'match',
  status: 'success' | 'failed' | 'conflict',
  details?: Record<string, unknown>
): Promise<void> {
  await supabase.from('sync_log').insert({
    athlete_id: athleteId,
    direction,
    resource_type: resourceType,
    resource_id: resourceId,
    action,
    status,
    details: details ?? null,
  });
}

// ====================================================================
// Per-Athlete Sync
// ====================================================================

interface AthleteRow {
  readonly id: string;
  readonly intervals_icu_athlete_id: string;
}

async function syncActivitiesForAthlete(
  supabase: SupabaseServiceClient,
  credentials: IntervalsCredentials,
  athlete: AthleteRow
): Promise<number> {
  const oldest = daysAgo(2);
  const newest = formatDate(new Date());

  const activities = await fetchActivities(credentials, { oldest, newest });

  // Fetch all workouts for the date range in one query to avoid N+1
  const { data: allWorkouts } = await supabase
    .from('workouts')
    .select(
      'id, date, sport, planned_duration_minutes, planned_tss, planned_distance_meters, name, external_id, block_id, intervals_activity_id'
    )
    .eq('athlete_id', athlete.id)
    .gte('date', oldest)
    .lte('date', newest);

  // Index workouts by date for fast lookup
  const workoutsByDate = new Map<string, PlannedWorkout[]>();
  for (const workout of (allWorkouts ?? []) as PlannedWorkout[]) {
    const dateWorkouts = workoutsByDate.get(workout.date) ?? [];
    dateWorkouts.push(workout);
    workoutsByDate.set(workout.date, dateWorkouts);
  }

  let processedCount = 0;

  for (const activity of activities) {
    const activityDate = activity.start_date_local.slice(0, 10);
    const dateWorkouts = workoutsByDate.get(activityDate);

    if (!dateWorkouts || dateWorkouts.length === 0) continue;

    const match = matchActivityToWorkout(activity as SyncActivity, dateWorkouts);
    if (match == null) continue;

    // Skip if already matched to this activity
    if (match.workout.intervals_activity_id === activity.id) continue;

    const compliance = computeCompliance(
      {
        duration_minutes: match.workout.planned_duration_minutes,
        tss: match.workout.planned_tss,
        distance_meters: match.workout.planned_distance_meters,
      },
      {
        duration_minutes: activity.moving_time / 60,
        tss: activity.icu_training_load,
        distance_meters: activity.distance,
      }
    );

    await supabase
      .from('workouts')
      .update({
        intervals_activity_id: activity.id,
        actual_duration_minutes: Math.round(activity.moving_time / 60),
        actual_tss: activity.icu_training_load ?? null,
        actual_distance_meters: activity.distance == null ? null : Math.round(activity.distance),
        completed_at: activity.start_date_local,
        compliance,
        sync_status: 'synced',
      })
      .eq('id', match.workout.id);

    await logSync(supabase, athlete.id, 'pull', 'activity', activity.id, 'match', 'success', {
      workout_id: match.workout.id,
      confidence: match.confidence,
      source: 'cron',
    });

    processedCount++;
  }

  return processedCount;
}

async function syncEventsForAthlete(
  supabase: SupabaseServiceClient,
  credentials: IntervalsCredentials,
  athlete: AthleteRow
): Promise<number> {
  const oldest = daysAgo(7);
  const newest = daysFromNow(7);

  const events = await fetchEvents(credentials, { oldest, newest });

  // Fetch all workouts with intervals_event_id in one query to avoid N+1
  const eventIds = events.map((event) => String(event.id));
  const workoutsByEventId = new Map<
    string,
    {
      id: string;
      name: string;
      description_dsl: string;
      planned_duration_minutes: number;
      date: string;
      block_id: string;
    }
  >();

  if (eventIds.length > 0) {
    const { data: workouts } = await supabase
      .from('workouts')
      .select(
        'id, name, description_dsl, planned_duration_minutes, date, block_id, intervals_event_id'
      )
      .eq('athlete_id', athlete.id)
      .in('intervals_event_id', eventIds);

    for (const workout of workouts ?? []) {
      if (workout.intervals_event_id) {
        workoutsByEventId.set(workout.intervals_event_id, workout);
      }
    }
  }

  let changesDetected = 0;

  for (const event of events) {
    const workout = workoutsByEventId.get(String(event.id));

    if (!workout) continue;

    const local: LocalEventState = {
      name: workout.name,
      description_dsl: workout.description_dsl,
      planned_duration_minutes: workout.planned_duration_minutes,
      date: workout.date,
    };

    const diff = diffEventVsWorkout(event as RemoteEventState, local);
    if (!diff.changed) continue;

    // Apply last-write-wins
    const updates: Record<string, unknown> = { sync_status: 'synced' };
    if (diff.fields.includes('name')) updates.name = event.name;
    if (diff.fields.includes('description')) updates.description_dsl = event.description ?? '';
    if (diff.fields.includes('duration') && event.moving_time != null) {
      updates.planned_duration_minutes = Math.round(event.moving_time / 60);
    }
    if (diff.fields.includes('date')) updates.date = event.start_date_local.slice(0, 10);

    await supabase.from('workouts').update(updates).eq('id', workout.id);

    // Audit trail
    await supabase.from('plan_adaptations').insert({
      block_id: workout.block_id,
      athlete_id: athlete.id,
      trigger: 'external_sync',
      status: 'accepted',
      affected_workouts: [
        {
          workoutId: workout.id,
          before: {
            name: workout.name,
            description_dsl: workout.description_dsl,
            planned_duration_minutes: workout.planned_duration_minutes,
            date: workout.date,
          },
          after: { ...workout, ...updates },
          changeType: 'modified',
        },
      ],
      reason: `Cron reconciliation: ${diff.fields.join(', ')} changed externally`,
    });

    await logSync(supabase, athlete.id, 'pull', 'event', String(event.id), 'update', 'success', {
      workout_id: workout.id,
      changed_fields: diff.fields,
      source: 'cron',
    });

    changesDetected++;
  }

  return changesDetected;
}

async function syncWellnessForAthlete(
  supabase: SupabaseServiceClient,
  credentials: IntervalsCredentials,
  athlete: AthleteRow
): Promise<number> {
  const oldest = daysAgo(2);
  const newest = formatDate(new Date());

  const wellness = await fetchWellness(credentials, { oldest, newest });
  let updatedCount = 0;

  for (const w of wellness) {
    // Upsert into daily_checkins using the wellness date
    const { error } = await supabase.from('daily_checkins').upsert(
      {
        athlete_id: athlete.id,
        checkin_date: w.id, // Wellness ID is the date (YYYY-MM-DD)
        resting_hr: w.restingHR ?? null,
        hrv_ms: w.hrv ?? null,
        sleep_hours: w.sleepSecs == null ? null : Math.round((w.sleepSecs / 3600) * 10) / 10,
        sleep_quality: w.sleepQuality ?? null,
        overall_soreness: w.soreness ?? null,
        stress_level: w.stress ?? null,
      },
      { onConflict: 'athlete_id,checkin_date' }
    );

    if (!error) {
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    await logSync(supabase, athlete.id, 'pull', 'wellness', null, 'update', 'success', {
      records_updated: updatedCount,
      source: 'cron',
    });
  }

  return updatedCount;
}

// ====================================================================
// Main Handler
// ====================================================================

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Require cron secret to prevent unauthorized triggering
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase configuration' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Get all athletes with active Intervals.icu connection
  const { data: athletes, error } = await supabase
    .from('athletes')
    .select('id, intervals_icu_athlete_id')
    .not('intervals_icu_athlete_id', 'is', null)
    .eq('intervals_icu_connected', true);

  if (error) {
    return jsonResponse({ error: 'Failed to fetch athletes', details: error.message }, 500);
  }

  if (!athletes || athletes.length === 0) {
    return jsonResponse({ message: 'No connected athletes', synced: 0 });
  }

  const results: Array<{
    athlete_id: string;
    activities: number;
    events: number;
    wellness: number;
    error?: string;
  }> = [];

  for (const athlete of athletes) {
    try {
      const credentials = await getIntervalsCredentials(supabase, athlete.id);
      if (!credentials) {
        results.push({
          athlete_id: athlete.id,
          activities: 0,
          events: 0,
          wellness: 0,
          error: 'no_credentials',
        });
        continue;
      }

      // Safe: the query filters for non-null intervals_icu_athlete_id
      const athleteId = athlete.intervals_icu_athlete_id as string;
      const typedAthlete: AthleteRow = {
        id: athlete.id,
        intervals_icu_athlete_id: athleteId,
      };

      const activitiesProcessed = await syncActivitiesForAthlete(
        supabase,
        credentials,
        typedAthlete
      );
      const eventsChanged = await syncEventsForAthlete(supabase, credentials, typedAthlete);
      const wellnessUpdated = await syncWellnessForAthlete(supabase, credentials, typedAthlete);

      // Update last synced timestamps
      const now = new Date().toISOString();
      await supabase
        .from('athletes')
        .update({
          intervals_last_synced_activities: now,
          intervals_last_synced_events: now,
          intervals_last_synced_wellness: now,
        })
        .eq('id', athlete.id);

      results.push({
        athlete_id: athlete.id,
        activities: activitiesProcessed,
        events: eventsChanged,
        wellness: wellnessUpdated,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        athlete_id: athlete.id,
        activities: 0,
        events: 0,
        wellness: 0,
        error: errorMsg,
      });

      await logSync(supabase, athlete.id, 'pull', 'activity', null, 'update', 'failed', {
        error: errorMsg,
        source: 'cron',
      });
    }
  }

  return jsonResponse({
    synced: results.length,
    results,
  });
});
