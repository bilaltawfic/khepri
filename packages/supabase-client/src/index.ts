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
// QUERIES
// =============================================================================

// Athlete queries
export {
  createAthlete,
  getAthleteByAuthUser,
  getAthleteById,
  getAthleteFitnessNumbers,
  updateAthlete,
  updateIntervalsConnection,
} from './queries/index.js';

// Check-in queries
export {
  getTodayCheckin,
  getCheckinByDate,
  getRecentCheckins,
  createCheckin,
  updateCheckin,
  updateCheckinRecommendation,
  updateCheckinUserResponse,
  getPendingRecommendations,
} from './queries/index.js';

// Goal queries
export {
  cancelGoal,
  completeGoal,
  createGoal,
  deleteGoal,
  getActiveGoals,
  getAllGoals,
  getGoalById,
  getGoalsByType,
  getUpcomingRaceGoals,
  updateGoal,
} from './queries/index.js';

// Constraint queries
export {
  createConstraint,
  deleteConstraint,
  getActiveConstraints,
  getActiveInjuries,
  getAllConstraints,
  getConstraintById,
  getConstraintsByType,
  getCurrentTravelConstraints,
  resolveConstraint,
  updateConstraint,
} from './queries/index.js';

// Conversation queries
export {
  addMessage,
  archiveConversation,
  createConversation,
  deleteConversation,
  getConversation,
  getConversations,
  getMessages,
  getMostRecentConversation,
  isValidMessageRole,
  unarchiveConversation,
  updateConversation,
} from './queries/index.js';

// Embedding queries
export {
  deleteEmbeddingsBySource,
  EMBEDDING_CONTENT_TYPES,
  EMBEDDING_DIMENSIONS,
  insertEmbedding,
  isValidContentType,
  searchEmbeddings,
} from './queries/index.js';

// Training plan queries
export {
  addPlanAdaptation,
  cancelTrainingPlan,
  completeTrainingPlan,
  createTrainingPlan,
  deleteTrainingPlan,
  getActiveTrainingPlan,
  getAthleteTrainingPlans,
  getTrainingPlanById,
  getTrainingPlansForGoal,
  pauseTrainingPlan,
  updateTrainingPlan,
} from './queries/index.js';

export type {
  AthleteFitnessNumbers,
  EmbeddingContentType,
  EmbeddingInsert,
  EmbeddingMatch,
  EmbeddingRecord,
  QueryResult,
} from './queries/index.js';

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Supabase auth types
  Session,
  User,
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
  // Conversation types
  ConversationRow,
  ConversationInsert,
  ConversationUpdate,
  MessageRow,
  MessageInsert,
  MessageUpdate,
  MessageRole,
} from './types.js';
