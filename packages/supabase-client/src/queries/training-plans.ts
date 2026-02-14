/**
 * Training plan query functions
 *
 * CRUD operations and specialized queries for athlete training plans.
 */

import type {
  Json,
  KhepriSupabaseClient,
  PlanAdjustment,
  PlanStatus,
  TrainingPlanInsert,
  TrainingPlanRow,
  TrainingPlanUpdate,
} from '../types.js';
import { type QueryResult, createError } from './athlete.js';

/**
 * Get a single training plan by ID
 */
export async function getTrainingPlanById(
  client: KhepriSupabaseClient,
  planId: string
): Promise<QueryResult<TrainingPlanRow>> {
  const { data, error } = await client.from('training_plans').select('*').eq('id', planId).single();

  return {
    data,
    error: error ? createError(error) : null,
  };
}

/**
 * Get all training plans for an athlete, most recent first.
 * Optionally filter by status.
 */
export async function getAthleteTrainingPlans(
  client: KhepriSupabaseClient,
  athleteId: string,
  options?: { status?: PlanStatus }
): Promise<QueryResult<TrainingPlanRow[]>> {
  let query = client
    .from('training_plans')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('start_date', { ascending: false });

  if (options?.status != null) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data ?? [], error: null };
}

/**
 * Get the active training plan for an athlete.
 * Returns null (not an error) when no active plan exists.
 * Uses limit(1) instead of single() to avoid errors when zero rows match.
 */
export async function getActiveTrainingPlan(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<TrainingPlanRow | null>> {
  const { data, error } = await client
    .from('training_plans')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1);

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data?.[0] ?? null, error: null };
}

/**
 * Get all training plans linked to a specific goal
 */
export async function getTrainingPlansForGoal(
  client: KhepriSupabaseClient,
  goalId: string
): Promise<QueryResult<TrainingPlanRow[]>> {
  const { data, error } = await client
    .from('training_plans')
    .select('*')
    .eq('goal_id', goalId)
    .order('start_date', { ascending: false });

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data ?? [], error: null };
}

/**
 * Create a new training plan
 */
export async function createTrainingPlan(
  client: KhepriSupabaseClient,
  data: TrainingPlanInsert
): Promise<QueryResult<TrainingPlanRow>> {
  const { data: plan, error } = await client
    .from('training_plans')
    .insert(data as never)
    .select()
    .single();

  return {
    data: plan,
    error: error ? createError(error) : null,
  };
}

/**
 * Update an existing training plan
 */
export async function updateTrainingPlan(
  client: KhepriSupabaseClient,
  planId: string,
  data: TrainingPlanUpdate
): Promise<QueryResult<TrainingPlanRow>> {
  const { data: plan, error } = await client
    .from('training_plans')
    .update(data as never)
    .eq('id', planId)
    .select()
    .single();

  return {
    data: plan,
    error: error ? createError(error) : null,
  };
}

/** Pause an active training plan */
export async function pauseTrainingPlan(
  client: KhepriSupabaseClient,
  planId: string
): Promise<QueryResult<TrainingPlanRow>> {
  return updateTrainingPlan(client, planId, { status: 'paused' });
}

/** Mark a training plan as completed */
export async function completeTrainingPlan(
  client: KhepriSupabaseClient,
  planId: string
): Promise<QueryResult<TrainingPlanRow>> {
  return updateTrainingPlan(client, planId, { status: 'completed' });
}

/** Cancel a training plan */
export async function cancelTrainingPlan(
  client: KhepriSupabaseClient,
  planId: string
): Promise<QueryResult<TrainingPlanRow>> {
  return updateTrainingPlan(client, planId, { status: 'cancelled' });
}

/**
 * Add an adaptation record to a training plan.
 *
 * Fetches the current adaptations array, appends the new entry,
 * and writes back the full array. Uses a read-then-write pattern
 * because Supabase JS client does not support jsonb_array_append.
 */
export async function addPlanAdaptation(
  client: KhepriSupabaseClient,
  planId: string,
  adaptation: PlanAdjustment
): Promise<QueryResult<TrainingPlanRow>> {
  // 1. Fetch current adaptations
  const { data: current, error: fetchError } = await client
    .from('training_plans')
    .select('adaptations')
    .eq('id', planId)
    .single();

  if (fetchError) {
    return { data: null, error: createError(fetchError) };
  }

  // 2. Append new adaptation
  const existing = Array.isArray(current?.adaptations) ? current.adaptations : [];
  const updated = [...existing, adaptation];

  // 3. Write back
  const { data: plan, error: updateError } = await client
    .from('training_plans')
    .update({ adaptations: updated as unknown as Json } as never)
    .eq('id', planId)
    .select()
    .single();

  return {
    data: plan,
    error: updateError ? createError(updateError) : null,
  };
}

/**
 * Delete a training plan (hard delete)
 */
export async function deleteTrainingPlan(
  client: KhepriSupabaseClient,
  planId: string
): Promise<QueryResult<null>> {
  const { error } = await client.from('training_plans').delete().eq('id', planId);

  return {
    data: null,
    error: error ? createError(error) : null,
  };
}
