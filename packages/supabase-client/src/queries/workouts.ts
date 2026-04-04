/**
 * Workout query functions
 *
 * CRUD operations, bulk insert, compliance updates, and sync status for workouts.
 */

import type {
  Json,
  KhepriSupabaseClient,
  WorkoutInsert,
  WorkoutRow,
  WorkoutSyncStatus,
  WorkoutUpdate,
} from '../types.js';
import { type QueryResult, createError } from './athlete.js';

/** Get a workout by ID */
export async function getWorkoutById(
  client: KhepriSupabaseClient,
  workoutId: string
): Promise<QueryResult<WorkoutRow>> {
  const { data, error } = await client.from('workouts').select('*').eq('id', workoutId).single();

  return { data, error: error ? createError(error) : null };
}

/** Get all workouts for a block, ordered by date */
export async function getBlockWorkouts(
  client: KhepriSupabaseClient,
  blockId: string
): Promise<QueryResult<WorkoutRow[]>> {
  const { data, error } = await client
    .from('workouts')
    .select('*')
    .eq('block_id', blockId)
    .order('date', { ascending: true });

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data ?? [], error: null };
}

/** Get workouts for an athlete on a specific date */
export async function getWorkoutsByDate(
  client: KhepriSupabaseClient,
  athleteId: string,
  date: string
): Promise<QueryResult<WorkoutRow[]>> {
  const { data, error } = await client
    .from('workouts')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data ?? [], error: null };
}

/** Get workouts for an athlete in a date range */
export async function getWorkoutsForDateRange(
  client: KhepriSupabaseClient,
  athleteId: string,
  startDate: string,
  endDate: string
): Promise<QueryResult<WorkoutRow[]>> {
  const { data, error } = await client
    .from('workouts')
    .select('*')
    .eq('athlete_id', athleteId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data ?? [], error: null };
}

/** Get a workout by its external_id (unique workout identifier for Intervals.icu sync) */
export async function getWorkoutByExternalId(
  client: KhepriSupabaseClient,
  externalId: string
): Promise<QueryResult<WorkoutRow | null>> {
  const { data, error } = await client
    .from('workouts')
    .select('*')
    .eq('external_id', externalId)
    .limit(1);

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data?.[0] ?? null, error: null };
}

/** Create a single workout */
export async function createWorkout(
  client: KhepriSupabaseClient,
  data: WorkoutInsert
): Promise<QueryResult<WorkoutRow>> {
  const { data: workout, error } = await client
    .from('workouts')
    .insert(data as never)
    .select()
    .single();

  return { data: workout, error: error ? createError(error) : null };
}

/** Bulk insert workouts (for block generation) */
export async function bulkInsertWorkouts(
  client: KhepriSupabaseClient,
  workouts: readonly WorkoutInsert[]
): Promise<QueryResult<WorkoutRow[]>> {
  const { data, error } = await client
    .from('workouts')
    .insert(workouts as never[])
    .select();

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data ?? [], error: null };
}

/** Update a workout */
export async function updateWorkout(
  client: KhepriSupabaseClient,
  workoutId: string,
  data: WorkoutUpdate
): Promise<QueryResult<WorkoutRow>> {
  const { data: workout, error } = await client
    .from('workouts')
    .update(data as never)
    .eq('id', workoutId)
    .select()
    .single();

  return { data: workout, error: error ? createError(error) : null };
}

/** Update workout actual values and completed_at */
export async function updateWorkoutActuals(
  client: KhepriSupabaseClient,
  workoutId: string,
  actuals: {
    readonly actual_duration_minutes?: number | null;
    readonly actual_tss?: number | null;
    readonly actual_distance_meters?: number | null;
    readonly actual_avg_power?: number | null;
    readonly actual_avg_pace_sec_per_km?: number | null;
    readonly actual_avg_hr?: number | null;
    readonly completed_at?: string | null;
    readonly intervals_activity_id?: string | null;
  }
): Promise<QueryResult<WorkoutRow>> {
  return updateWorkout(client, workoutId, actuals);
}

/** Update workout compliance JSONB */
export async function updateWorkoutCompliance(
  client: KhepriSupabaseClient,
  workoutId: string,
  compliance: Json
): Promise<QueryResult<WorkoutRow>> {
  return updateWorkout(client, workoutId, { compliance });
}

/** Update workout sync status and optional intervals_event_id */
export async function updateWorkoutSyncStatus(
  client: KhepriSupabaseClient,
  workoutId: string,
  syncStatus: WorkoutSyncStatus,
  intervalsEventId?: string
): Promise<QueryResult<WorkoutRow>> {
  const updates: WorkoutUpdate =
    intervalsEventId != null
      ? { sync_status: syncStatus, intervals_event_id: intervalsEventId }
      : { sync_status: syncStatus };
  return updateWorkout(client, workoutId, updates);
}

/** Delete all workouts for a block (for regeneration) */
export async function deleteBlockWorkouts(
  client: KhepriSupabaseClient,
  blockId: string
): Promise<QueryResult<null>> {
  const { error } = await client.from('workouts').delete().eq('block_id', blockId);

  return { data: null, error: error ? createError(error) : null };
}
