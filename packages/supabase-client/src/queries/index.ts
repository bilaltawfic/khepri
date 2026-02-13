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
