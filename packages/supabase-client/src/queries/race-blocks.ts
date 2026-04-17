/**
 * Race block query functions
 *
 * CRUD operations and lifecycle transitions for race blocks.
 */

import type {
  KhepriSupabaseClient,
  RaceBlockInsert,
  RaceBlockRow,
  RaceBlockUpdate,
} from '../types.js';
import { type QueryResult, createError } from './athlete.js';

/** Get a race block by ID */
export async function getRaceBlockById(
  client: KhepriSupabaseClient,
  blockId: string
): Promise<QueryResult<RaceBlockRow>> {
  const { data, error } = await client.from('race_blocks').select('*').eq('id', blockId).single();

  return { data, error: error ? createError(error) : null };
}

/** Get all race blocks for a season, ordered by start_date */
export async function getSeasonRaceBlocks(
  client: KhepriSupabaseClient,
  seasonId: string
): Promise<QueryResult<RaceBlockRow[]>> {
  const { data, error } = await client
    .from('race_blocks')
    .select('*')
    .eq('season_id', seasonId)
    .order('start_date', { ascending: true });

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data ?? [], error: null };
}

/** Get the active block for an athlete (locked or in_progress) */
export async function getActiveBlock(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<RaceBlockRow | null>> {
  const { data, error } = await client
    .from('race_blocks')
    .select('*')
    .eq('athlete_id', athleteId)
    .in('status', ['locked', 'in_progress'])
    .order('start_date', { ascending: false })
    .limit(1);

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data?.[0] ?? null, error: null };
}

/** Create a new race block */
export async function createRaceBlock(
  client: KhepriSupabaseClient,
  data: RaceBlockInsert
): Promise<QueryResult<RaceBlockRow>> {
  const { data: block, error } = await client
    .from('race_blocks')
    .insert(data as never)
    .select()
    .single();

  return { data: block, error: error ? createError(error) : null };
}

/** Update a race block */
export async function updateRaceBlock(
  client: KhepriSupabaseClient,
  blockId: string,
  data: RaceBlockUpdate
): Promise<QueryResult<RaceBlockRow>> {
  const { data: block, error } = await client
    .from('race_blocks')
    .update(data as never)
    .eq('id', blockId)
    .select()
    .single();

  return { data: block, error: error ? createError(error) : null };
}

/** Lock a block (sets status='locked', locked_at=now()) */
export async function lockBlock(
  client: KhepriSupabaseClient,
  blockId: string
): Promise<QueryResult<RaceBlockRow>> {
  return updateRaceBlock(client, blockId, {
    status: 'locked',
    locked_at: new Date().toISOString(),
  });
}

/** Start a block (sets status='in_progress') */
export async function startBlock(
  client: KhepriSupabaseClient,
  blockId: string
): Promise<QueryResult<RaceBlockRow>> {
  return updateRaceBlock(client, blockId, { status: 'in_progress' });
}

/** Complete a block (sets status='completed') */
export async function completeBlock(
  client: KhepriSupabaseClient,
  blockId: string
): Promise<QueryResult<RaceBlockRow>> {
  return updateRaceBlock(client, blockId, { status: 'completed' });
}

/** Cancel a block (sets status='cancelled') */
export async function cancelBlock(
  client: KhepriSupabaseClient,
  blockId: string
): Promise<QueryResult<RaceBlockRow>> {
  return updateRaceBlock(client, blockId, { status: 'cancelled' });
}
