/**
 * Daily check-in query functions
 *
 * Provides type-safe database operations for the daily_checkins table.
 *
 * Note on type assertions: We use `as never` for insert/update calls because
 * Supabase's generic type inference doesn't correctly resolve our custom
 * Database type's Insert/Update shapes. Type safety is maintained at the
 * function boundary (typed parameters) - the assertion only bypasses
 * Supabase's internal generic resolution.
 */

import type {
  DailyCheckinInsert,
  DailyCheckinRow,
  DailyCheckinUpdate,
  Json,
  KhepriSupabaseClient,
  UserResponse,
} from '../types.js';

/**
 * Standardized query result type for consistency across all queries.
 * Mirrors the Supabase response pattern but with a simpler interface.
 */
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Get today's check-in for an athlete
 * Uses UTC date for consistency
 */
export async function getTodayCheckin(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<DailyCheckinRow>> {
  // Extract YYYY-MM-DD from ISO string (always has 'T' separator)
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await client
    .from('daily_checkins')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('checkin_date', today)
    .single();

  return {
    data,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get check-in for a specific date
 */
export async function getCheckinByDate(
  client: KhepriSupabaseClient,
  athleteId: string,
  date: string // YYYY-MM-DD format
): Promise<QueryResult<DailyCheckinRow>> {
  const { data, error } = await client
    .from('daily_checkins')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('checkin_date', date)
    .single();

  return {
    data,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get recent check-ins for an athlete (last N days)
 * Ordered by date descending (most recent first)
 * Note: days=7 returns check-ins from 7 days ago through today (up to 8 days)
 */
export async function getRecentCheckins(
  client: KhepriSupabaseClient,
  athleteId: string,
  days = 7
): Promise<QueryResult<DailyCheckinRow[]>> {
  // Calculate start date (days ago from today) using UTC calendar math
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - days);
  const startDateStr = startDate.toISOString().slice(0, 10);

  const { data, error } = await client
    .from('daily_checkins')
    .select('*')
    .eq('athlete_id', athleteId)
    .gte('checkin_date', startDateStr)
    .order('checkin_date', { ascending: false });

  return {
    data,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Create a new daily check-in
 * Note: UNIQUE constraint on (athlete_id, checkin_date) prevents duplicates
 */
export async function createCheckin(
  client: KhepriSupabaseClient,
  data: DailyCheckinInsert
): Promise<QueryResult<DailyCheckinRow>> {
  const { data: checkin, error } = await client
    .from('daily_checkins')
    .insert(data as never)
    .select()
    .single();

  return {
    data: checkin,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Update an existing check-in
 */
export async function updateCheckin(
  client: KhepriSupabaseClient,
  checkinId: string,
  data: DailyCheckinUpdate
): Promise<QueryResult<DailyCheckinRow>> {
  const { data: checkin, error } = await client
    .from('daily_checkins')
    .update(data as never)
    .eq('id', checkinId)
    .select()
    .single();

  return {
    data: checkin,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Save AI recommendation to a check-in
 * Pass null to clear the recommendation and its timestamp
 */
export async function updateCheckinRecommendation(
  client: KhepriSupabaseClient,
  checkinId: string,
  recommendation: Json
): Promise<QueryResult<DailyCheckinRow>> {
  const updateData: DailyCheckinUpdate = {
    ai_recommendation: recommendation,
  };

  if (recommendation != null) {
    updateData.ai_recommendation_generated_at = new Date().toISOString();
  } else {
    // Clear the generated-at timestamp when clearing the recommendation
    updateData.ai_recommendation_generated_at = null;
  }

  const { data: checkin, error } = await client
    .from('daily_checkins')
    .update(updateData as never)
    .eq('id', checkinId)
    .select()
    .single();

  return {
    data: checkin,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Record user's response to AI recommendation
 * @param notes - Pass null to clear notes, undefined to leave unchanged
 */
export async function updateCheckinUserResponse(
  client: KhepriSupabaseClient,
  checkinId: string,
  response: UserResponse,
  notes?: string | null
): Promise<QueryResult<DailyCheckinRow>> {
  const updateData: DailyCheckinUpdate = {
    user_response: response,
  };

  if (notes !== undefined) {
    updateData.user_response_notes = notes;
  }

  const { data: checkin, error } = await client
    .from('daily_checkins')
    .update(updateData as never)
    .eq('id', checkinId)
    .select()
    .single();

  return {
    data: checkin,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get check-ins with AI recommendations that haven't been responded to
 */
export async function getPendingRecommendations(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<DailyCheckinRow[]>> {
  const { data, error } = await client
    .from('daily_checkins')
    .select('*')
    .eq('athlete_id', athleteId)
    .not('ai_recommendation', 'is', null)
    .is('user_response', null)
    .order('checkin_date', { ascending: false });

  return {
    data,
    error: error ? new Error(error.message) : null,
  };
}
