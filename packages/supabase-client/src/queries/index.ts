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

// Goal queries
export {
  cancelGoal,
  completeGoal,
  createGoal,
  deleteGoal,
  getActiveGoals,
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
  getConstraintById,
  getConstraintsByType,
  getCurrentTravelConstraints,
  resolveConstraint,
  updateConstraint,
} from './constraints.js';
