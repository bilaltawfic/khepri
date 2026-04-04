/**
 * Intervals.icu Push Module — outbound sync.
 *
 * Converts Khepri workouts to Intervals.icu events and bulk upserts.
 * Handles races, availability events, and DSL validation fallback.
 */

import { mapSportToIntervalsType } from './intervals-sync-engine.ts';

// ====================================================================
// Types
// ====================================================================

/** A Khepri workout to push to Intervals.icu */
export interface PushWorkout {
  readonly external_id: string;
  readonly name: string;
  readonly date: string; // YYYY-MM-DD
  readonly sport: string; // swim, bike, run, strength, rest
  readonly workout_type: string | null;
  readonly planned_duration_minutes: number;
  readonly planned_tss: number | null;
  readonly planned_distance_meters: number | null;
  readonly description_dsl: string;
  readonly intervals_target: string; // POWER, PACE, HR, AUTO
}

/** A race event to push */
export interface PushRaceEvent {
  readonly external_id: string;
  readonly name: string;
  readonly date: string;
  readonly sport: string;
  readonly priority: 'A' | 'B' | 'C';
  readonly distance_meters: number | null;
}

/** An availability event (rest, travel, sick, injured) */
export interface PushAvailabilityEvent {
  readonly external_id: string;
  readonly name: string;
  readonly date: string;
  readonly event_type: 'rest' | 'travel' | 'sick' | 'injured';
}

export interface PushResult {
  readonly success: boolean;
  readonly pushed_count: number;
  readonly failed_count: number;
  readonly failures: readonly PushFailure[];
}

export interface PushFailure {
  readonly external_id: string;
  readonly error: string;
}

/** Shape expected by the Intervals.icu create/update event API */
export interface IntervalsEventPayload {
  readonly name: string;
  readonly start_date_local: string;
  readonly type: string;
  readonly category?: string;
  readonly description?: string;
  readonly moving_time?: number; // seconds
  readonly icu_training_load?: number;
  readonly distance?: number; // meters
  readonly color?: string;
  readonly target?: string; // POWER, PACE, HR
  readonly event_priority?: string;
}

/** Credentials for the Intervals.icu API */
export interface IntervalsCredentials {
  readonly intervalsAthleteId: string;
  readonly apiKey: string;
}

/** A function that creates or updates an event (injected for testability) */
export type UpsertEventFn = (
  credentials: IntervalsCredentials,
  event: IntervalsEventPayload,
  externalId: string
) => Promise<{ id: number }>;

// ====================================================================
// DSL Validation (lightweight)
// ====================================================================

/**
 * Basic DSL validation: checks that the description contains recognisable
 * workout steps. This is a lightweight heuristic, not a full parser.
 *
 * Returns true if the DSL looks valid enough to push.
 */
export function isValidDsl(dsl: string): boolean {
  if (dsl.trim().length === 0) return false;

  const lines = dsl
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  // Must have at least one step line (starts with -)
  const hasSteps = lines.some((l) => l.startsWith('-'));
  // Must have at least one section header (no - prefix, no special chars)
  const hasHeaders = lines.some((l) => !l.startsWith('-') && /^[\w\s]+/.test(l));

  return hasSteps && hasHeaders;
}

/**
 * Generate a simplified fallback description when DSL validation fails.
 */
export function buildFallbackDescription(workout: PushWorkout): string {
  const parts = [workout.name];
  if (workout.planned_duration_minutes > 0) {
    parts.push(`${workout.planned_duration_minutes}min`);
  }
  if (workout.workout_type != null) {
    parts.push(workout.workout_type);
  }
  return parts.join(' - ');
}

// ====================================================================
// Event Construction
// ====================================================================

// Intervals.icu uses type 'RACE' with event_priority 'A'/'B'/'C'

const AVAILABILITY_TYPE_MAP: Record<string, { type: string; color?: string }> = {
  rest: { type: 'REST_DAY', color: '#808080' },
  travel: { type: 'TRAVEL' },
  sick: { type: 'NOTE' },
  injured: { type: 'NOTE' },
};

/**
 * Convert a Khepri workout to an Intervals.icu event payload.
 */
export function buildWorkoutPayload(
  workout: PushWorkout,
  validateDsl = true
): { payload: IntervalsEventPayload; dslValid: boolean } {
  let description = workout.description_dsl;
  let dslValid = true;

  if (validateDsl && !isValidDsl(description)) {
    description = buildFallbackDescription(workout);
    dslValid = false;
  }

  const target = workout.intervals_target === 'AUTO' ? undefined : workout.intervals_target;

  const payload: IntervalsEventPayload = {
    name: workout.name,
    start_date_local: workout.date,
    type: workout.sport === 'rest' ? 'NOTE' : 'WORKOUT',
    category: workout.sport === 'rest' ? undefined : mapSportToIntervalsType(workout.sport),
    description,
    moving_time:
      workout.planned_duration_minutes > 0 ? workout.planned_duration_minutes * 60 : undefined,
    icu_training_load: workout.planned_tss ?? undefined,
    distance: workout.planned_distance_meters ?? undefined,
    target,
    color: workout.sport === 'rest' ? '#808080' : undefined,
  };

  return { payload, dslValid };
}

/**
 * Convert a race event to an Intervals.icu event payload.
 */
export function buildRacePayload(race: PushRaceEvent): IntervalsEventPayload {
  return {
    name: race.name,
    start_date_local: race.date,
    type: 'RACE',
    category: mapSportToIntervalsType(race.sport),
    distance: race.distance_meters ?? undefined,
    color: race.priority === 'A' ? '#FF0000' : undefined,
    event_priority: race.priority,
  };
}

/**
 * Convert an availability event to an Intervals.icu event payload.
 */
export function buildAvailabilityPayload(event: PushAvailabilityEvent): IntervalsEventPayload {
  const mapping = AVAILABILITY_TYPE_MAP[event.event_type] ?? { type: 'NOTE' };
  return {
    name: event.name,
    start_date_local: event.date,
    type: mapping.type,
    color: mapping.color,
  };
}

// ====================================================================
// Bulk Push
// ====================================================================

const BATCH_SIZE = 50;

/**
 * Push workouts, races, and availability events to Intervals.icu.
 *
 * Events are pushed sequentially in batches of 50 to respect rate limits.
 * Each event uses its external_id for idempotent upsert.
 */
export async function pushBlockToIntervals(
  credentials: IntervalsCredentials,
  upsertEvent: UpsertEventFn,
  workouts: readonly PushWorkout[],
  raceEvents: readonly PushRaceEvent[],
  availabilityEvents: readonly PushAvailabilityEvent[]
): Promise<PushResult> {
  const allItems: Array<{
    payload: IntervalsEventPayload;
    externalId: string;
    dslValid?: boolean;
  }> = [];

  // Build workout payloads
  for (const w of workouts) {
    const { payload, dslValid } = buildWorkoutPayload(w);
    allItems.push({ payload, externalId: w.external_id, dslValid });
  }

  // Build race payloads
  for (const r of raceEvents) {
    allItems.push({ payload: buildRacePayload(r), externalId: r.external_id });
  }

  // Build availability payloads
  for (const a of availabilityEvents) {
    allItems.push({ payload: buildAvailabilityPayload(a), externalId: a.external_id });
  }

  let pushedCount = 0;
  const failures: PushFailure[] = [];

  // Process in batches
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);

    for (const item of batch) {
      try {
        await upsertEvent(credentials, item.payload, item.externalId);
        pushedCount++;
      } catch (err) {
        failures.push({
          external_id: item.externalId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return {
    success: failures.length === 0,
    pushed_count: pushedCount,
    failed_count: failures.length,
    failures,
  };
}
