/**
 * Query functions barrel export
 */

// Athlete queries
export {
  createAthlete,
  getAthleteByAuthUser,
  getAthleteById,
  getAthleteFitnessNumbers,
  updateAthlete,
  updateIntervalsConnection,
} from './athlete.js';

export type { AthleteFitnessNumbers, QueryResult } from './athlete.js';

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
} from './checkins.js';

// Goal queries
export {
  cancelGoal,
  completeGoal,
  createGoal,
  deleteActiveGoals,
  deleteGoal,
  getActiveGoals,
  getAllGoals,
  getGoalById,
  getGoalsByType,
  getUpcomingRaceGoals,
  updateGoal,
} from './goals.js';

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
} from './constraints.js';

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
} from './conversations.js';

// Embedding queries
export {
  deleteEmbeddingsBySource,
  EMBEDDING_CONTENT_TYPES,
  EMBEDDING_DIMENSIONS,
  insertEmbedding,
  isValidContentType,
  searchEmbeddings,
} from './embeddings.js';

export type {
  EmbeddingContentType,
  EmbeddingInsert,
  EmbeddingMatch,
  EmbeddingRecord,
} from './embeddings.js';

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
  updateTrainingPlan,
} from './training-plans.js';

// Season queries
export {
  archiveSeasonRecord,
  completeSeasonRecord,
  createSeason,
  getActiveSeason,
  getAthleteSeasons,
  getSeasonById,
  updateSeason,
} from './seasons.js';

// Race block queries
export {
  cancelBlock,
  completeBlock,
  createRaceBlock,
  getActiveBlock,
  getRaceBlockById,
  getSeasonRaceBlocks,
  lockBlock,
  startBlock,
  updateRaceBlock,
} from './race-blocks.js';

// Workout queries
export {
  bulkInsertWorkouts,
  createWorkout,
  deleteBlockWorkouts,
  getBlockWorkouts,
  getWorkoutByExternalId,
  getWorkoutById,
  getWorkoutsByDate,
  getWorkoutsForDateRange,
  updateWorkout,
  updateWorkoutActuals,
  updateWorkoutCompliance,
  updateWorkoutSyncStatus,
} from './workouts.js';

// Plan adaptation queries
export {
  acceptAdaptation,
  createAdaptation,
  getAdaptationById,
  getBlockAdaptations,
  getPendingAdaptations,
  rejectAdaptation,
  rollbackAdaptation,
} from './plan-adaptations.js';
