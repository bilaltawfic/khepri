/**
 * Goal query functions
 *
 * CRUD operations and specialized queries for athlete goals.
 */

import type { GoalInsert, GoalRow, GoalType, GoalUpdate, KhepriSupabaseClient } from '../types.js';
import { type QueryResult, createError } from './athlete.js';

/**
 * Get all active goals for an athlete
 * Active = status is 'active' (not completed or cancelled)
 * Results ordered by priority (A first, then B, then C)
 */
export async function getActiveGoals(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<GoalRow[]>> {
  const { data, error } = await client
    .from('goals')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .order('priority', { ascending: true });

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data ?? [], error: null };
}

/**
 * Get goals by type (race, performance, fitness, health)
 */
export async function getGoalsByType(
  client: KhepriSupabaseClient,
  athleteId: string,
  goalType: GoalType
): Promise<QueryResult<GoalRow[]>> {
  const { data, error } = await client
    .from('goals')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('goal_type', goalType)
    .order('priority', { ascending: true });

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data ?? [], error: null };
}

/**
 * Get a single goal by ID
 */
export async function getGoalById(
  client: KhepriSupabaseClient,
  goalId: string
): Promise<QueryResult<GoalRow>> {
  const { data, error } = await client.from('goals').select('*').eq('id', goalId).single();

  return {
    data,
    error: error ? createError(error) : null,
  };
}

/**
 * Get upcoming race goals (target_date in future, ordered by date)
 * Only returns active race goals with a target date >= today
 */
export async function getUpcomingRaceGoals(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<GoalRow[]>> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await client
    .from('goals')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('goal_type', 'race')
    .eq('status', 'active')
    .gte('target_date', today)
    .order('target_date', { ascending: true });

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data ?? [], error: null };
}

/**
 * Create a new goal
 */
export async function createGoal(
  client: KhepriSupabaseClient,
  data: GoalInsert
): Promise<QueryResult<GoalRow>> {
  const { data: createdGoal, error } = await client.from('goals').insert(data).select().single();

  return {
    data: createdGoal,
    error: error ? createError(error) : null,
  };
}

/**
 * Update an existing goal
 */
export async function updateGoal(
  client: KhepriSupabaseClient,
  goalId: string,
  data: GoalUpdate
): Promise<QueryResult<GoalRow>> {
  const { data: updatedGoal, error } = await client
    .from('goals')
    .update(data)
    .eq('id', goalId)
    .select()
    .single();

  return {
    data: updatedGoal,
    error: error ? createError(error) : null,
  };
}

/**
 * Mark a goal as completed
 */
export async function completeGoal(
  client: KhepriSupabaseClient,
  goalId: string
): Promise<QueryResult<GoalRow>> {
  return updateGoal(client, goalId, { status: 'completed' });
}

/**
 * Cancel a goal
 */
export async function cancelGoal(
  client: KhepriSupabaseClient,
  goalId: string
): Promise<QueryResult<GoalRow>> {
  return updateGoal(client, goalId, { status: 'cancelled' });
}

/**
 * Delete a goal (hard delete)
 */
export async function deleteGoal(
  client: KhepriSupabaseClient,
  goalId: string
): Promise<QueryResult<null>> {
  const { error } = await client.from('goals').delete().eq('id', goalId);

  return {
    data: null,
    error: error ? createError(error) : null,
  };
}
