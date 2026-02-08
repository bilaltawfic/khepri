/**
 * @khepri/supabase-client
 *
 * Supabase database client and types for Khepri, providing type-safe
 * access to athletes, check-ins, goals, constraints, and training plans.
 *
 * @example
 * ```typescript
 * import {
 *   createSupabaseClientFromEnv,
 *   isSupabaseConfigured,
 * } from '@khepri/supabase-client';
 *
 * // Check if configured (with anon key) and query athletes table
 * async function getAthlete(userId: string) {
 *   // isSupabaseConfigured() checks for URL + anon key by default
 *   // Use isSupabaseConfigured(true) to check for service role key instead
 *   if (!isSupabaseConfigured()) {
 *     return null;
 *   }
 *
 *   const client = createSupabaseClientFromEnv();
 *
 *   // Query athletes table with full type safety
 *   const { data, error } = await client
 *     .from('athletes')
 *     .select('*')
 *     .eq('auth_user_id', userId)
 *     .single();
 *   return data;
 * }
 * ```
 */

// =============================================================================
// CLIENT
// =============================================================================

export {
  createSupabaseClient,
  createSupabaseClientFromEnv,
  getSupabaseConfigStatus,
  isSupabaseConfigured,
  ENV_VARS,
} from './client.js';

export type { SupabaseClientConfig } from './client.js';

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Database schema
  Database,
  KhepriSupabaseClient,
  Json,
  // Athlete types
  AthleteRow,
  AthleteInsert,
  AthleteUpdate,
  PreferredUnits,
  // Goal types
  GoalRow,
  GoalInsert,
  GoalUpdate,
  GoalType,
  GoalPriority,
  GoalStatus,
  // Constraint types
  ConstraintRow,
  ConstraintInsert,
  ConstraintUpdate,
  ConstraintType,
  ConstraintStatus,
  InjurySeverity,
  // Daily check-in types
  DailyCheckinRow,
  DailyCheckinInsert,
  DailyCheckinUpdate,
  TravelStatus,
  UserResponse,
  SorenessAreas,
  // Training plan types
  TrainingPlanRow,
  TrainingPlanInsert,
  TrainingPlanUpdate,
  PlanStatus,
  TrainingPhase,
  WeeklyTemplate,
  DayTemplate,
  PlanAdjustment,
} from './types.js';
