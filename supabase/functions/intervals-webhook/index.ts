/**
 * Intervals.icu Webhook Edge Function
 *
 * Receives POST from Intervals.icu when activities, events, or wellness change.
 * Delegates to the shared sync engine for processing.
 *
 * Environment variables:
 * - SUPABASE_URL: Supabase project URL (auto-provided)
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for DB access
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import {
  computeCompliance,
  diffEventVsWorkout,
  mapIntervalsTypeToSport,
  matchActivityToWorkout,
} from '../_shared/intervals-sync-engine.ts';
import type {
  LocalEventState,
  PlannedWorkout,
  RemoteEventState,
  SyncActivity,
} from '../_shared/intervals-sync-engine.ts';
import { getIntervalsCredentials } from '../mcp-gateway/utils/credentials.ts';
import { fetchActivities, fetchEvents } from '../mcp-gateway/utils/intervals-api.ts';

// ====================================================================
// CORS
// ====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function corsResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ====================================================================
// Webhook Payload
// ====================================================================

interface WebhookPayload {
  readonly event_type: string;
  readonly athlete_id: string; // Intervals.icu athlete ID
  readonly resource_id: string;
  readonly timestamp?: string;
}

const SUPPORTED_EVENTS = new Set([
  'activity.create',
  'activity.update',
  'event.update',
  'event.delete',
  'wellness.update',
]);

function isValidPayload(body: unknown): body is WebhookPayload {
  if (typeof body !== 'object' || body == null) return false;
  const obj = body as Record<string, unknown>;
  return (
    typeof obj.event_type === 'string' &&
    typeof obj.athlete_id === 'string' &&
    typeof obj.resource_id === 'string'
  );
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
// Activity Processing
// ====================================================================

async function processActivity(
  supabase: SupabaseServiceClient,
  khepriAthleteId: string,
  activity: SyncActivity
): Promise<void> {
  // Find planned workouts for this date
  const activityDate = activity.start_date_local.slice(0, 10);
  const { data: workouts } = await supabase
    .from('workouts')
    .select(
      'id, date, sport, planned_duration_minutes, planned_tss, planned_distance_meters, name, external_id, block_id, intervals_activity_id'
    )
    .eq('athlete_id', khepriAthleteId)
    .eq('date', activityDate);

  if (!workouts || workouts.length === 0) {
    await logSync(supabase, khepriAthleteId, 'pull', 'activity', activity.id, 'match', 'success', {
      result: 'no_planned_workouts',
    });
    return;
  }

  const match = matchActivityToWorkout(activity, workouts as PlannedWorkout[]);

  if (match == null) {
    await logSync(supabase, khepriAthleteId, 'pull', 'activity', activity.id, 'match', 'success', {
      result: 'unplanned_session',
      sport: mapIntervalsTypeToSport(activity.type),
    });
    return;
  }

  // Compute compliance
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

  // Update workout with actual data
  await supabase
    .from('workouts')
    .update({
      intervals_activity_id: activity.id,
      actual_duration_minutes: Math.round(activity.moving_time / 60),
      actual_tss: activity.icu_training_load ?? null,
      actual_distance_meters: activity.distance == null ? null : Math.round(activity.distance),
      actual_avg_power: activity.average_watts ?? null,
      actual_avg_hr: activity.average_heartrate ?? null,
      completed_at: activity.start_date_local,
      compliance,
      sync_status: 'synced',
    })
    .eq('id', match.workout.id);

  await logSync(supabase, khepriAthleteId, 'pull', 'activity', activity.id, 'match', 'success', {
    workout_id: match.workout.id,
    confidence: match.confidence,
    compliance_score: compliance.score,
    compliance_color: compliance.color,
  });
}

// ====================================================================
// Event Processing
// ====================================================================

async function processEventUpdate(
  supabase: SupabaseServiceClient,
  khepriAthleteId: string,
  event: RemoteEventState
): Promise<void> {
  // Find local workout by intervals_event_id
  const { data: workout } = await supabase
    .from('workouts')
    .select('id, name, description_dsl, planned_duration_minutes, date, block_id')
    .eq('athlete_id', khepriAthleteId)
    .eq('intervals_event_id', String(event.id))
    .single();

  if (!workout) {
    await logSync(
      supabase,
      khepriAthleteId,
      'pull',
      'event',
      String(event.id),
      'update',
      'success',
      {
        result: 'no_matching_workout',
      }
    );
    return;
  }

  const local: LocalEventState = {
    name: workout.name,
    description_dsl: workout.description_dsl,
    planned_duration_minutes: workout.planned_duration_minutes,
    date: workout.date,
  };

  const diff = diffEventVsWorkout(event, local);

  if (!diff.changed) {
    return;
  }

  // Capture before snapshot for audit trail
  const beforeSnapshot = {
    name: workout.name,
    description_dsl: workout.description_dsl,
    planned_duration_minutes: workout.planned_duration_minutes,
    date: workout.date,
  };

  // Apply last-write-wins: update local workout from remote
  const updates: Record<string, unknown> = { sync_status: 'synced' };
  if (diff.fields.includes('name')) updates.name = event.name;
  if (diff.fields.includes('description')) updates.description_dsl = event.description ?? '';
  if (diff.fields.includes('duration') && event.moving_time != null) {
    updates.planned_duration_minutes = Math.round(event.moving_time / 60);
  }
  if (diff.fields.includes('date')) updates.date = event.start_date_local.slice(0, 10);

  await supabase.from('workouts').update(updates).eq('id', workout.id);

  // Log adaptation for audit trail
  const afterSnapshot = { ...beforeSnapshot, ...updates };
  await supabase.from('plan_adaptations').insert({
    block_id: workout.block_id,
    athlete_id: khepriAthleteId,
    trigger: 'external_sync',
    status: 'accepted',
    affected_workouts: [
      {
        workoutId: workout.id,
        before: beforeSnapshot,
        after: afterSnapshot,
        changeType: 'modified',
      },
    ],
    reason: `External modification detected in Intervals.icu: ${diff.fields.join(', ')} changed`,
  });

  await logSync(supabase, khepriAthleteId, 'pull', 'event', String(event.id), 'update', 'success', {
    workout_id: workout.id,
    changed_fields: diff.fields,
  });
}

async function processEventDelete(
  supabase: SupabaseServiceClient,
  khepriAthleteId: string,
  eventId: string
): Promise<void> {
  // Mark workout as conflicted — don't delete
  const { data: workout } = await supabase
    .from('workouts')
    .select('id')
    .eq('athlete_id', khepriAthleteId)
    .eq('intervals_event_id', eventId)
    .single();

  if (workout) {
    await supabase.from('workouts').update({ sync_status: 'conflict' }).eq('id', workout.id);

    await logSync(supabase, khepriAthleteId, 'pull', 'event', eventId, 'delete', 'conflict', {
      workout_id: workout.id,
      action: 'marked_conflict',
    });
  }
}

// ====================================================================
// Main Handler
// ====================================================================

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Verify webhook secret to prevent unauthorized access
  const webhookSecret = Deno.env.get('INTERVALS_WEBHOOK_SECRET');
  if (webhookSecret) {
    const authHeader = req.headers.get('x-webhook-secret');
    if (authHeader !== webhookSecret) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!isValidPayload(body)) {
    return jsonResponse({ error: 'Invalid webhook payload' }, 400);
  }

  if (!SUPPORTED_EVENTS.has(body.event_type)) {
    return jsonResponse({ received: true, skipped: true });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase configuration' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Look up Khepri athlete by Intervals.icu athlete ID
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id')
    .eq('intervals_icu_athlete_id', body.athlete_id)
    .single();

  if (!athlete) {
    return jsonResponse({ error: 'Unknown athlete' }, 404);
  }

  const khepriAthleteId = athlete.id;

  // Determine resource type for error logging (before try/catch so catch can use it)
  const resourceType = body.event_type.startsWith('activity')
    ? 'activity'
    : body.event_type.startsWith('event')
      ? 'event'
      : 'wellness';

  try {
    // Get credentials for API calls
    const credentials = await getIntervalsCredentials(supabase, khepriAthleteId);
    if (!credentials) {
      return jsonResponse({ error: 'No Intervals.icu credentials' }, 400);
    }

    switch (body.event_type) {
      case 'activity.create':
      case 'activity.update': {
        // Fetch recent activities (last 2 days) and find by ID
        const today = new Date().toISOString().slice(0, 10);
        const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
        const activities = await fetchActivities(credentials, {
          oldest: twoDaysAgo,
          newest: today,
        });
        const activity = activities.find((a) => a.id === body.resource_id);
        if (activity) {
          await processActivity(supabase, khepriAthleteId, activity as SyncActivity);
        }
        break;
      }

      case 'event.update': {
        // Fetch events for ±7 days and find by ID
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        const events = await fetchEvents(credentials, {
          oldest: sevenDaysAgo,
          newest: sevenDaysFromNow,
        });
        const event = events.find((e) => String(e.id) === body.resource_id);
        if (event) {
          await processEventUpdate(supabase, khepriAthleteId, event as RemoteEventState);
        }
        break;
      }

      case 'event.delete': {
        await processEventDelete(supabase, khepriAthleteId, body.resource_id);
        break;
      }

      case 'wellness.update': {
        // Wellness updates are handled by cron for simplicity.
        // Webhook just logs that an update was received.
        await logSync(
          supabase,
          khepriAthleteId,
          'pull',
          'wellness',
          body.resource_id,
          'update',
          'success',
          {
            note: 'Deferred to cron reconciliation',
          }
        );
        break;
      }
    }
  } catch (err) {
    await logSync(
      supabase,
      khepriAthleteId,
      'pull',
      resourceType as 'activity' | 'event' | 'wellness',
      body.resource_id,
      'update',
      'failed',
      {
        event_type: body.event_type,
        error: err instanceof Error ? err.message : String(err),
      }
    );
    // Return 200 to prevent webhook retries on transient errors
    return jsonResponse({ received: true, error: 'Processing failed' });
  }

  return jsonResponse({ received: true });
});
