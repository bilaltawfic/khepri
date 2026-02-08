/**
 * Query functions barrel export
 */

export {
  getAthleteByAuthUser,
  getAthleteById,
  createAthlete,
  updateAthlete,
  getAthleteFitnessNumbers,
  updateIntervalsConnection,
} from './athlete.js';

export type { QueryResult, AthleteFitnessNumbers } from './athlete.js';
