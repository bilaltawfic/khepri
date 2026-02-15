export type { BodyArea, SorenessAreas, TravelStatus } from './wellness.js';
export { BODY_AREAS, TRAVEL_STATUSES, isBodyArea, isTravelStatus } from './wellness.js';

export type { AvailableTimeMinutes } from './time.js';
export { AVAILABLE_TIME_VALUES, isAvailableTimeMinutes } from './time.js';

export type { DailyConstraintType } from './constraints.js';
export { DAILY_CONSTRAINT_TYPES, isDailyConstraintType } from './constraints.js';

// ==== Training Types ====
export type {
  IntensityDistribution,
  PeriodizationPhase,
  PeriodizationPhaseConfig,
  PeriodizationPlan,
  TrainingFocus,
  WeeklyVolume,
} from './training.js';

export {
  PERIODIZATION_PHASES,
  TRAINING_FOCUS,
  isPeriodizationPhase,
  isTrainingFocus,
} from './training.js';

// ==== Analysis ====
export type {
  ActivityRecord,
  FitnessDataPoint,
  FormStatus,
  FormTrend,
  RaceReadiness,
  RecoveryAssessment,
  WeeklyLoadSummary,
} from './analysis.js';
export { FORM_STATUSES } from './analysis.js';

// ==== Templates ====
export type {
  DifficultyLevel,
  Exercise,
  MuscleGroup,
  WorkoutCategory,
  WorkoutTemplate,
} from './templates.js';
export {
  DIFFICULTY_LEVELS,
  MUSCLE_GROUPS,
  WORKOUT_CATEGORIES,
  isDifficultyLevel,
  isWorkoutCategory,
} from './templates.js';
