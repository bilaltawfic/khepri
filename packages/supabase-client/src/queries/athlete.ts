/**
 * Athlete profile query functions
 *
 * Provides type-safe database operations for the athletes table.
 */

import type { AthleteInsert, AthleteRow, AthleteUpdate, KhepriSupabaseClient } from '../types.js';

// =============================================================================
// QUERY RESULT TYPE
// =============================================================================

/**
 * Standardized query result type for consistency across all queries.
 * Mirrors the Supabase response pattern but with a simpler interface.
 */
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Creates an Error from a Supabase/Postgrest error, preserving the original
 * error as the cause for debugging (includes code, details, hint fields).
 */
export function createError(supabaseError: { message: string }): Error {
  return new Error(supabaseError.message, { cause: supabaseError });
}

// =============================================================================
// ATHLETE FITNESS NUMBERS
// =============================================================================

/**
 * Subset of AthleteRow containing fitness metrics.
 * Used for quick access to training zone calculations.
 */
export type AthleteFitnessNumbers = Pick<
  AthleteRow,
  | 'ftp_watts'
  | 'running_threshold_pace_sec_per_km'
  | 'css_sec_per_100m'
  | 'resting_heart_rate'
  | 'max_heart_rate'
  | 'lthr'
>;

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get athlete profile by Supabase auth user ID.
 * This is the primary lookup method after user authentication.
 *
 * @param client - Khepri Supabase client
 * @param authUserId - Supabase auth.users.id
 * @returns Athlete profile, or error if not found (uses .single())
 */
export async function getAthleteByAuthUser(
  client: KhepriSupabaseClient,
  authUserId: string
): Promise<QueryResult<AthleteRow>> {
  const { data, error } = await client
    .from('athletes')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  return {
    data,
    error: error ? createError(error) : null,
  };
}

/**
 * Get athlete profile by athlete ID.
 *
 * @param client - Khepri Supabase client
 * @param athleteId - Athlete table primary key (UUID)
 * @returns Athlete profile, or error if not found (uses .single())
 */
export async function getAthleteById(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<AthleteRow>> {
  const { data, error } = await client.from('athletes').select('*').eq('id', athleteId).single();

  return {
    data,
    error: error ? createError(error) : null,
  };
}

/**
 * Create a new athlete profile.
 * Typically called after user registration.
 *
 * @param client - Khepri Supabase client
 * @param data - Athlete data (auth_user_id required, rest optional)
 * @returns Created athlete profile
 */
export async function createAthlete(
  client: KhepriSupabaseClient,
  data: AthleteInsert
): Promise<QueryResult<AthleteRow>> {
  const { data: athlete, error } = await client.from('athletes').insert(data).select().single();

  return {
    data: athlete,
    error: error ? createError(error) : null,
  };
}

/**
 * Update an athlete profile.
 *
 * @param client - Khepri Supabase client
 * @param athleteId - Athlete table primary key (UUID)
 * @param data - Fields to update
 * @returns Updated athlete profile
 */
export async function updateAthlete(
  client: KhepriSupabaseClient,
  athleteId: string,
  data: AthleteUpdate
): Promise<QueryResult<AthleteRow>> {
  const { data: athlete, error } = await client
    .from('athletes')
    .update(data)
    .eq('id', athleteId)
    .select()
    .single();

  return {
    data: athlete,
    error: error ? createError(error) : null,
  };
}

/**
 * Get athlete's current fitness numbers (FTP, threshold pace, CSS, HR zones).
 * Used for training zone calculations without fetching the full profile.
 *
 * @param client - Khepri Supabase client
 * @param athleteId - Athlete table primary key (UUID)
 * @returns Fitness metrics subset
 */
export async function getAthleteFitnessNumbers(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<AthleteFitnessNumbers>> {
  const { data, error } = await client
    .from('athletes')
    .select(
      'ftp_watts, running_threshold_pace_sec_per_km, css_sec_per_100m, resting_heart_rate, max_heart_rate, lthr'
    )
    .eq('id', athleteId)
    .single();

  return {
    data,
    error: error ? createError(error) : null,
  };
}

/**
 * Update athlete's Intervals.icu connection status.
 * Called after OAuth flow or when disconnecting.
 *
 * @param client - Khepri Supabase client
 * @param athleteId - Athlete table primary key (UUID)
 * @param connected - Whether the connection is active
 * @param intervalsAthleteId - Intervals.icu athlete ID (required when connecting)
 * @returns Updated athlete profile
 */
export async function updateIntervalsConnection(
  client: KhepriSupabaseClient,
  athleteId: string,
  connected: boolean,
  intervalsAthleteId?: string
): Promise<QueryResult<AthleteRow>> {
  // Validate: intervalsAthleteId is required when connecting
  if (connected && intervalsAthleteId === undefined) {
    return {
      data: null,
      error: new Error('intervalsAthleteId is required when connecting'),
    };
  }

  const updateData: AthleteUpdate = {
    intervals_icu_connected: connected,
    // Set athlete ID when connecting, clear when disconnecting
    intervals_icu_athlete_id: connected ? intervalsAthleteId : null,
  };

  const { data, error } = await client
    .from('athletes')
    .update(updateData)
    .eq('id', athleteId)
    .select()
    .single();

  return {
    data,
    error: error ? createError(error) : null,
  };
}
