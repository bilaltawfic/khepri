// Maps and validates the Claude API response into WorkoutInsert rows.
// Extracted from index.ts so tests can import without Deno-only dependencies.

import type { ClaudeBlockResponse } from './claude-client.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateRequestForMapper {
  block_id: string;
  athlete_id: string;
  start_date: string;
  end_date: string;
}

export interface WorkoutInsert {
  block_id: string;
  athlete_id: string;
  date: string;
  week_number: number;
  name: string;
  sport: string;
  workout_type: string | null;
  planned_duration_minutes: number;
  structure: Record<string, unknown>;
  description_dsl: string;
  intervals_target: string;
  sync_status: string;
  external_id: string;
}

// =============================================================================
// RESPONSE VALIDATION
// =============================================================================

const VALID_SPORTS = new Set(['swim', 'bike', 'run', 'strength', 'rest']);
const VALID_WORKOUT_TYPES = new Set([
  'endurance',
  'threshold',
  'vo2',
  'tempo',
  'recovery',
  'long',
  'race_pace',
  'technique',
  'rest',
]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DURATION_MINUTES = 600; // 10 hours — reasonable upper bound

export function validateClaudeResponse(
  response: unknown,
  startDate: string,
  endDate: string
): string | null {
  if (typeof response !== 'object' || response == null) {
    return 'Claude response is not an object';
  }
  const r = response as Record<string, unknown>;
  if (!Array.isArray(r.weeks) || r.weeks.length === 0) {
    return 'Claude response has no weeks';
  }

  const seenExternalIds = new Set<string>();

  for (const week of r.weeks) {
    const weekError = validateClaudeWeek(week, startDate, endDate, seenExternalIds);
    if (weekError != null) return weekError;
  }

  return null;
}

function validateClaudeWeek(
  week: unknown,
  startDate: string,
  endDate: string,
  seenExternalIds: Set<string>
): string | null {
  if (typeof week !== 'object' || week == null) {
    return 'Week entry is not an object';
  }
  const w = week as Record<string, unknown>;
  if (typeof w.weekNumber !== 'number' || w.weekNumber < 1) {
    return `Invalid weekNumber: ${String(w.weekNumber)}`;
  }
  const weekNum = w.weekNumber;
  if (!Array.isArray(w.workouts)) {
    return `Week ${weekNum} has no workouts array`;
  }

  for (const workout of w.workouts) {
    const workoutError = validateClaudeWorkout(
      workout,
      startDate,
      endDate,
      weekNum,
      seenExternalIds
    );
    if (workoutError != null) return workoutError;
  }

  return null;
}

function validateClaudeWorkout(
  workout: unknown,
  startDate: string,
  endDate: string,
  weekNumber: number,
  seenExternalIds: Set<string>
): string | null {
  if (typeof workout !== 'object' || workout == null) {
    return `Week ${weekNumber}: workout entry is not an object`;
  }
  const wo = workout as Record<string, unknown>;

  if (typeof wo.date !== 'string' || !ISO_DATE_RE.test(wo.date)) {
    return `Week ${weekNumber}: invalid date format "${String(wo.date)}"`;
  }
  if (wo.date < startDate || wo.date > endDate) {
    return `Week ${weekNumber}: date ${wo.date} outside block range [${startDate}, ${endDate}]`;
  }
  if (typeof wo.sport !== 'string' || !VALID_SPORTS.has(wo.sport)) {
    return `Week ${weekNumber}: invalid sport "${String(wo.sport)}"`;
  }
  if (typeof wo.workoutType !== 'string' || !VALID_WORKOUT_TYPES.has(wo.workoutType)) {
    return `Week ${weekNumber}: invalid workoutType "${String(wo.workoutType)}"`;
  }
  if (
    typeof wo.plannedDurationMinutes !== 'number' ||
    !Number.isInteger(wo.plannedDurationMinutes) ||
    wo.plannedDurationMinutes < 0 ||
    wo.plannedDurationMinutes > MAX_DURATION_MINUTES
  ) {
    return `Week ${weekNumber}: invalid plannedDurationMinutes (must be an integer 0-${MAX_DURATION_MINUTES})`;
  }

  // Validate name (TEXT NOT NULL in DB)
  if (typeof wo.name !== 'string' || wo.name.length === 0) {
    return `Week ${weekNumber}: workout name must be a non-empty string`;
  }

  // Validate structure (JSONB NOT NULL in DB)
  if (typeof wo.structure !== 'object' || wo.structure == null || Array.isArray(wo.structure)) {
    return `Week ${weekNumber}: workout structure must be an object`;
  }

  // Cross-field: rest sport must pair with rest workoutType and 0 duration
  if (wo.sport === 'rest' && wo.workoutType !== 'rest') {
    return `Week ${weekNumber}: sport "rest" must pair with workoutType "rest"`;
  }
  if (wo.workoutType === 'rest' && wo.sport !== 'rest') {
    return `Week ${weekNumber}: workoutType "rest" must pair with sport "rest"`;
  }

  // Detect duplicate workouts for the same sport on the same date (multi-sport
  // days like bike+run are expected in triathlon training).
  const externalId = `w${weekNumber}-${wo.date}-${wo.sport}`;
  if (seenExternalIds.has(externalId)) {
    return `Week ${weekNumber}: duplicate ${wo.sport} workout on ${wo.date}`;
  }
  seenExternalIds.add(externalId);

  return null;
}

// =============================================================================
// RESPONSE MAPPING
// =============================================================================

function intervalsTarget(sport: string): string {
  if (sport === 'bike') return 'POWER';
  if (sport === 'run') return 'PACE';
  return 'AUTO';
}

export function mapClaudeWorkoutsToInserts(
  request: GenerateRequestForMapper,
  response: ClaudeBlockResponse
): WorkoutInsert[] {
  const inserts: WorkoutInsert[] = [];

  for (const week of response.weeks) {
    for (const workout of week.workouts) {
      inserts.push({
        block_id: request.block_id,
        athlete_id: request.athlete_id,
        date: workout.date,
        week_number: week.weekNumber,
        name: workout.name,
        sport: workout.sport,
        workout_type: workout.workoutType === 'rest' ? null : workout.workoutType,
        planned_duration_minutes: workout.plannedDurationMinutes,
        structure: workout.structure as Record<string, unknown>,
        description_dsl: '',
        intervals_target: intervalsTarget(workout.sport),
        sync_status: 'pending',
        external_id: `khepri-${request.block_id}-w${week.weekNumber}-${workout.date}-${workout.sport}`,
      });
    }
  }

  return inserts;
}
