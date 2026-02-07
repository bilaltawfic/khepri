/**
 * System Prompts Index
 *
 * Export all system prompts and prompt builders for coaching scenarios.
 */

// Main coaching system prompt
export {
  COACHING_SYSTEM_PROMPT,
  getCoachingSystemPrompt,
} from './coaching-system.js';

// Daily check-in prompts
export {
  DAILY_CHECKIN_PROMPT,
  buildDailyCheckinPrompt,
  buildCheckinFollowupPrompt,
} from './daily-checkin.js';

// Workout recommendation prompts
export {
  WORKOUT_RECOMMENDATION_PROMPT,
  buildWorkoutRecommendationPrompt,
  buildWorkoutAlternativesPrompt,
} from './workout-recommendation.js';
export type { WorkoutRecommendationOptions } from './workout-recommendation.js';

// Plan adjustment prompts
export {
  PLAN_ADJUSTMENT_PROMPT,
  buildPlanAdjustmentPrompt,
  buildPlanProgressReviewPrompt,
  buildPostRaceReviewPrompt,
} from './plan-adjustment.js';
export type {
  AdjustmentReason,
  PlanAdjustmentOptions,
} from './plan-adjustment.js';
