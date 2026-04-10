// Maps and validates the Claude API response into WorkoutInsert rows.
// Extracted from index.ts so tests can import without Deno-only dependencies.

import type { ClaudeBlockResponse, ClaudeWeek, ClaudeWorkout } from './claude-client.ts';

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

export function validateClaudeResponse(
  response: ClaudeBlockResponse,
  startDate: string,
  endDate: string
): string | null {
  if (!Array.isArray(response.weeks) || response.weeks.length === 0) {
    return 'Claude response has no weeks';
  }

  for (const week of response.weeks) {
    const weekError = validateClaudeWeek(week, startDate, endDate);
    if (weekError != null) return weekError;
  }

  return null;
}

function validateClaudeWeek(week: ClaudeWeek, startDate: string, endDate: string): string | null {
  if (typeof week.weekNumber !== 'number' || week.weekNumber < 1) {
    return `Invalid weekNumber: ${String(week.weekNumber)}`;
  }
  if (!Array.isArray(week.workouts)) {
    return `Week ${week.weekNumber} has no workouts array`;
  }

  for (const workout of week.workouts) {
    const workoutError = validateClaudeWorkout(workout, startDate, endDate, week.weekNumber);
    if (workoutError != null) return workoutError;
  }

  return null;
}

function validateClaudeWorkout(
  workout: ClaudeWorkout,
  startDate: string,
  endDate: string,
  weekNumber: number
): string | null {
  if (workout.date < startDate || workout.date > endDate) {
    return `Week ${weekNumber}: date ${workout.date} outside block range [${startDate}, ${endDate}]`;
  }
  if (!VALID_SPORTS.has(workout.sport)) {
    return `Week ${weekNumber}: invalid sport "${workout.sport}"`;
  }
  if (!VALID_WORKOUT_TYPES.has(workout.workoutType)) {
    return `Week ${weekNumber}: invalid workoutType "${workout.workoutType}"`;
  }
  if (typeof workout.plannedDurationMinutes !== 'number' || workout.plannedDurationMinutes < 0) {
    return `Week ${weekNumber}: invalid plannedDurationMinutes`;
  }
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
        external_id: `khepri-${request.block_id}-w${week.weekNumber}-${workout.date}`,
      });
    }
  }

  return inserts;
}
