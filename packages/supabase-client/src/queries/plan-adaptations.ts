/**
 * Plan adaptation query functions
 *
 * CRUD operations and rollback support for plan adaptations.
 */

import type {
  KhepriSupabaseClient,
  PlanAdaptationInsert,
  PlanAdaptationRow,
  PlanAdaptationUpdate,
  RolledBackBy,
} from '../types.js';
import { type QueryResult, createError } from './athlete.js';

/** Get an adaptation by ID */
export async function getAdaptationById(
  client: KhepriSupabaseClient,
  adaptationId: string
): Promise<QueryResult<PlanAdaptationRow>> {
  const { data, error } = await client
    .from('plan_adaptations')
    .select('*')
    .eq('id', adaptationId)
    .single();

  return { data, error: error ? createError(error) : null };
}

/** Get all adaptations for a block, most recent first */
export async function getBlockAdaptations(
  client: KhepriSupabaseClient,
  blockId: string
): Promise<QueryResult<PlanAdaptationRow[]>> {
  const { data, error } = await client
    .from('plan_adaptations')
    .select('*')
    .eq('block_id', blockId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data ?? [], error: null };
}

/** Get pending (suggested) adaptations for an athlete */
export async function getPendingAdaptations(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<PlanAdaptationRow[]>> {
  const { data, error } = await client
    .from('plan_adaptations')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'suggested')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data ?? [], error: null };
}

/** Create a new adaptation */
export async function createAdaptation(
  client: KhepriSupabaseClient,
  data: PlanAdaptationInsert
): Promise<QueryResult<PlanAdaptationRow>> {
  const { data: adaptation, error } = await client
    .from('plan_adaptations')
    .insert(data as never)
    .select()
    .single();

  return { data: adaptation, error: error ? createError(error) : null };
}

/** Update an adaptation */
async function updateAdaptation(
  client: KhepriSupabaseClient,
  adaptationId: string,
  data: PlanAdaptationUpdate
): Promise<QueryResult<PlanAdaptationRow>> {
  const { data: adaptation, error } = await client
    .from('plan_adaptations')
    .update(data as never)
    .eq('id', adaptationId)
    .select()
    .single();

  return { data: adaptation, error: error ? createError(error) : null };
}

/** Accept an adaptation (sets status='accepted') */
export async function acceptAdaptation(
  client: KhepriSupabaseClient,
  adaptationId: string
): Promise<QueryResult<PlanAdaptationRow>> {
  return updateAdaptation(client, adaptationId, { status: 'accepted' });
}

/** Reject an adaptation (sets status='rejected') */
export async function rejectAdaptation(
  client: KhepriSupabaseClient,
  adaptationId: string
): Promise<QueryResult<PlanAdaptationRow>> {
  return updateAdaptation(client, adaptationId, { status: 'rejected' });
}

/** Roll back an adaptation */
export async function rollbackAdaptation(
  client: KhepriSupabaseClient,
  adaptationId: string,
  rolledBackBy: RolledBackBy
): Promise<QueryResult<PlanAdaptationRow>> {
  return updateAdaptation(client, adaptationId, {
    status: 'rolled_back',
    rolled_back_at: new Date().toISOString(),
    rolled_back_by: rolledBackBy,
  });
}
