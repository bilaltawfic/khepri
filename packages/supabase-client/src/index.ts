/**
 * @khepri/supabase-client
 *
 * Supabase database client for Khepri with typed queries for
 * athletes, check-ins, goals, constraints, and training plans.
 *
 * @example
 * ```typescript
 * import {
 *   createSupabaseClient,
 *   createSupabaseClientFromEnv,
 *   isSupabaseConfigured,
 * } from '@khepri/supabase-client';
 *
 * // Check if configured and query athletes table
 * async function getAthlete(userId: string) {
 *   if (isSupabaseConfigured()) {
 *     const client = createSupabaseClientFromEnv();
 *
 *     // Query athletes table with full type safety
 *     const { data, error } = await client
 *       .from('athletes')
 *       .select('*')
 *       .eq('auth_user_id', userId)
 *       .single();
 *     return data;
 *   }
 *   return null;
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
