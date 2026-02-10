/**
 * Constraint query functions (injuries, travel, availability)
 *
 * CRUD operations and specialized queries for athlete constraints.
 */

import type {
  ConstraintInsert,
  ConstraintRow,
  ConstraintType,
  ConstraintUpdate,
  KhepriSupabaseClient,
} from '../types.js';
import { type QueryResult, createError } from './athlete.js';

/**
 * Get all constraints for an athlete (both active and resolved).
 * Returns constraints ordered by status ascending (active first, then resolved, then NULLs last)
 * and then by start_date descending. Uses nullsFirst: false so NULL statuses appear after
 * all non-NULL values. Consumers should treat NULL status as 'resolved' for UI grouping.
 */
export async function getAllConstraints(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<ConstraintRow[]>> {
  const { data, error } = await client
    .from('constraints')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('status', { ascending: true, nullsFirst: false })
    .order('start_date', { ascending: false });

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data ?? [], error: null };
}

/**
 * Get all active constraints for an athlete
 * Active = status is 'active' AND (end_date is null OR end_date >= today)
 * Uses UTC date for consistency.
 */
export async function getActiveConstraints(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<ConstraintRow[]>> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await client
    .from('constraints')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('start_date', { ascending: true });

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data ?? [], error: null };
}

/**
 * Get constraints by type (injury, travel, availability)
 */
export async function getConstraintsByType(
  client: KhepriSupabaseClient,
  athleteId: string,
  constraintType: ConstraintType
): Promise<QueryResult<ConstraintRow[]>> {
  const { data, error } = await client
    .from('constraints')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('constraint_type', constraintType)
    .order('start_date', { ascending: true });

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data ?? [], error: null };
}

/**
 * Get active injuries only
 * Active = status is 'active' AND (end_date is null OR end_date >= today)
 * Uses UTC date for consistency.
 */
export async function getActiveInjuries(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<ConstraintRow[]>> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await client
    .from('constraints')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('constraint_type', 'injury')
    .eq('status', 'active')
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('start_date', { ascending: true });

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data ?? [], error: null };
}

/**
 * Get current travel constraints (overlapping with today)
 * Returns active travel constraints where start_date <= today AND (end_date is null OR end_date >= today)
 * Uses UTC date for consistency.
 */
export async function getCurrentTravelConstraints(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<ConstraintRow[]>> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await client
    .from('constraints')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('constraint_type', 'travel')
    .eq('status', 'active')
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('start_date', { ascending: true });

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data ?? [], error: null };
}

/**
 * Get a single constraint by ID
 */
export async function getConstraintById(
  client: KhepriSupabaseClient,
  constraintId: string
): Promise<QueryResult<ConstraintRow>> {
  const { data, error } = await client
    .from('constraints')
    .select('*')
    .eq('id', constraintId)
    .single();

  return {
    data,
    error: error ? createError(error) : null,
  };
}

/**
 * Create a new constraint
 */
export async function createConstraint(
  client: KhepriSupabaseClient,
  data: ConstraintInsert
): Promise<QueryResult<ConstraintRow>> {
  const { data: createdConstraint, error } = await client
    .from('constraints')
    .insert(data)
    .select()
    .single();

  return {
    data: createdConstraint,
    error: error ? createError(error) : null,
  };
}

/**
 * Update an existing constraint
 */
export async function updateConstraint(
  client: KhepriSupabaseClient,
  constraintId: string,
  data: ConstraintUpdate
): Promise<QueryResult<ConstraintRow>> {
  const { data: updatedConstraint, error } = await client
    .from('constraints')
    .update(data)
    .eq('id', constraintId)
    .select()
    .single();

  return {
    data: updatedConstraint,
    error: error ? createError(error) : null,
  };
}

/**
 * Mark a constraint as resolved
 */
export async function resolveConstraint(
  client: KhepriSupabaseClient,
  constraintId: string
): Promise<QueryResult<ConstraintRow>> {
  return updateConstraint(client, constraintId, { status: 'resolved' });
}

/**
 * Delete a constraint (hard delete)
 */
export async function deleteConstraint(
  client: KhepriSupabaseClient,
  constraintId: string
): Promise<QueryResult<null>> {
  const { error } = await client.from('constraints').delete().eq('id', constraintId);

  return {
    data: null,
    error: error ? createError(error) : null,
  };
}
