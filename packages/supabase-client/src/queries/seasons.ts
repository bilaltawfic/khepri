/**
 * Season query functions
 *
 * CRUD operations for athlete seasons (season-based planning).
 */

import type { KhepriSupabaseClient, SeasonInsert, SeasonRow, SeasonUpdate } from '../types.js';
import { type QueryResult, createError } from './athlete.js';

/** Get the active season for an athlete (at most one due to DB constraint) */
export async function getActiveSeason(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<SeasonRow | null>> {
  const { data, error } = await client
    .from('seasons')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .limit(1);

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data?.[0] ?? null, error: null };
}

/** Get a season by ID */
export async function getSeasonById(
  client: KhepriSupabaseClient,
  seasonId: string
): Promise<QueryResult<SeasonRow>> {
  const { data, error } = await client.from('seasons').select('*').eq('id', seasonId).single();

  return { data, error: error ? createError(error) : null };
}

/** Get all seasons for an athlete, most recent first */
export async function getAthleteSeasons(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<SeasonRow[]>> {
  const { data, error } = await client
    .from('seasons')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('start_date', { ascending: false });

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data ?? [], error: null };
}

/** Create a new season */
export async function createSeason(
  client: KhepriSupabaseClient,
  data: SeasonInsert
): Promise<QueryResult<SeasonRow>> {
  const { data: season, error } = await client
    .from('seasons')
    .insert(data as never)
    .select()
    .single();

  return { data: season, error: error ? createError(error) : null };
}

/** Update a season */
export async function updateSeason(
  client: KhepriSupabaseClient,
  seasonId: string,
  data: SeasonUpdate
): Promise<QueryResult<SeasonRow>> {
  const { data: season, error } = await client
    .from('seasons')
    .update(data as never)
    .eq('id', seasonId)
    .select()
    .single();

  return { data: season, error: error ? createError(error) : null };
}

/** Archive a season (sets status to 'archived') */
export async function archiveSeasonRecord(
  client: KhepriSupabaseClient,
  seasonId: string
): Promise<QueryResult<SeasonRow>> {
  return updateSeason(client, seasonId, { status: 'archived' });
}

/** Complete a season (sets status to 'completed') */
export async function completeSeasonRecord(
  client: KhepriSupabaseClient,
  seasonId: string
): Promise<QueryResult<SeasonRow>> {
  return updateSeason(client, seasonId, { status: 'completed' });
}
