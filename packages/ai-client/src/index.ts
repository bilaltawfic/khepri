/**
 * @khepri/ai-client
 *
 * AI-powered triathlon coaching client using Claude.
 * Provides context building, system prompts, and API integration
 * for personalized training recommendations.
 *
 * @example
 * ```typescript
 * import {
 *   CoachingClient,
 *   buildCoachingContext,
 *   checkTrainingReadiness,
 * } from '@khepri/ai-client';
 *
 * // Build context from athlete data
 * const context = buildCoachingContext({
 *   athlete: athleteProfile,
 *   goals: athleteGoals,
 *   checkIn: todaysCheckIn,
 *   recentActivities: activities,
 * });
 *
 * // Check training readiness
 * const readiness = checkTrainingReadiness(todaysCheckIn);
 *
 * // Get coaching recommendation
 * const client = new CoachingClient();
 * const response = await client.getCoachingResponse({
 *   scenario: 'daily-checkin',
 *   context,
 * });
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Athlete types
  AthleteProfile,
  // Goal types
  Goal,
  GoalType,
  GoalPriority,
  GoalStatus,
  RaceGoal,
  PerformanceGoal,
  FitnessGoal,
  HealthGoal,
  // Constraint types
  Constraint,
  ConstraintType,
  ConstraintStatus,
  InjuryConstraint,
  TravelConstraint,
  AvailabilityConstraint,
  InjurySeverity,
  // Check-in types
  DailyCheckIn,
  SorenessAreas,
  TravelStatus,
  UserResponse,
  // Training plan types
  TrainingPlan,
  TrainingPhase,
  WeeklyTemplate,
  DayTemplate,
  PlanAdjustment,
  PlanStatus,
  // Activity types
  Activity,
  ActivityType,
  WellnessData,
  FitnessMetrics,
  // Coaching types
  CoachingContext,
  CoachingRequestOptions,
  CoachingResponse,
  CoachingStreamChunk,
  CoachingScenario,
  // Workout types
  WorkoutRecommendation,
  WorkoutSegment,
  WorkoutSport,
  WorkoutIntensity,
  // Training load validation types
  OvertrainingRisk,
  TrainingLoadValidation,
  LoadMetrics,
  LoadWarning,
  ProposedWorkout,
  TrainingHistory,
  TrainingDayISODate,
} from './types.js';

// Type guards
export {
  isRaceGoal,
  isPerformanceGoal,
  isFitnessGoal,
  isHealthGoal,
  isInjuryConstraint,
  isTravelConstraint,
  isAvailabilityConstraint,
} from './types.js';

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

export {
  buildCoachingContext,
  serializeContextForPrompt,
} from './context-builder.js';

export type { BuildCoachingContextParams } from './context-builder.js';

// =============================================================================
// PROMPTS
// =============================================================================

export {
  // System prompts
  COACHING_SYSTEM_PROMPT,
  getCoachingSystemPrompt,
  // Daily check-in
  DAILY_CHECKIN_PROMPT,
  buildDailyCheckinPrompt,
  buildCheckinFollowupPrompt,
  // Workout recommendation
  WORKOUT_RECOMMENDATION_PROMPT,
  buildWorkoutRecommendationPrompt,
  buildWorkoutAlternativesPrompt,
  // Plan adjustment
  PLAN_ADJUSTMENT_PROMPT,
  buildPlanAdjustmentPrompt,
  buildPlanProgressReviewPrompt,
  buildPostRaceReviewPrompt,
} from './prompts/index.js';

export type {
  WorkoutRecommendationOptions,
  AdjustmentReason,
  PlanAdjustmentOptions,
} from './prompts/index.js';

// =============================================================================
// CLIENT
// =============================================================================

export {
  CoachingClient,
  createCoachingClient,
  isConfigured,
} from './client.js';

export type { CoachingClientConfig } from './client.js';

// =============================================================================
// TOOLS
// =============================================================================

export {
  // Intervals.icu tools
  INTERVALS_TOOLS,
  GET_ACTIVITIES_TOOL,
  GET_ACTIVITY_DETAILS_TOOL,
  GET_ACTIVITY_INTERVALS_TOOL,
  GET_WELLNESS_DATA_TOOL,
  GET_EVENTS_TOOL,
  GET_EVENT_BY_ID_TOOL,
  getIntervalsToolsForScenario,
  // Safety tools
  SAFETY_TOOLS,
  CHECK_TRAINING_READINESS_TOOL,
  CHECK_FATIGUE_LEVEL_TOOL,
  CHECK_CONSTRAINT_COMPATIBILITY_TOOL,
  VALIDATE_TRAINING_LOAD_TOOL,
  checkTrainingReadiness,
  checkFatigueLevel,
  checkConstraintCompatibility,
  validateTrainingLoad,
} from './tools/index.js';

export type {
  TrainingReadiness,
  ReadinessAssessment,
  FatigueAssessment,
  ConstraintCompatibility,
} from './tools/index.js';
