/**
 * @khepri/core
 *
 * Shared types, utilities, and constants used across the Khepri monorepo.
 */

// =============================================================================
// TYPES
// =============================================================================

export type { BodyArea, SorenessAreas, TravelStatus } from './types/index.js';
export { BODY_AREAS, TRAVEL_STATUSES, isBodyArea, isTravelStatus } from './types/index.js';

export type { AvailableTimeMinutes } from './types/index.js';
export { AVAILABLE_TIME_VALUES, isAvailableTimeMinutes } from './types/index.js';

export type { DailyConstraintType } from './types/index.js';
export { DAILY_CONSTRAINT_TYPES, isDailyConstraintType } from './types/index.js';

export type {
  IntensityDistribution,
  PeriodizationPhase,
  PeriodizationPhaseConfig,
  PeriodizationPlan,
  TrainingFocus,
  WeeklyVolume,
} from './types/index.js';
export {
  PERIODIZATION_PHASES,
  TRAINING_FOCUS,
  isPeriodizationPhase,
  isTrainingFocus,
} from './types/index.js';

// =============================================================================
// UTILITIES
// =============================================================================

export {
  formatDate,
  formatDateLocal,
  formatDateRange,
  formatDuration,
  formatMinutes,
  getToday,
  parseDateOnly,
} from './utils/index.js';

export { isInRange, isValidISODate, isValidWellnessMetric } from './utils/index.js';

export {
  calculatePhaseBreakdown,
  calculateWeeklyVolumes,
  generatePeriodizationPlan,
  getIntensityDistribution,
  getTrainingFocus,
} from './utils/index.js';
