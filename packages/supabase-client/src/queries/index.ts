/**
 * Query functions barrel export
 */

// Athlete queries
export {
  getAthleteByAuthUser,
  getAthleteById,
  createAthlete,
  updateAthlete,
  getAthleteFitnessNumbers,
  updateIntervalsConnection,
} from './athlete.js';

export type { QueryResult, AthleteFitnessNumbers } from './athlete.js';

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
