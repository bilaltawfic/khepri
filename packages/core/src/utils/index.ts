export {
  formatDate,
  formatDateLocal,
  formatDateRange,
  formatDuration,
  formatMinutes,
  getToday,
  parseDateOnly,
} from './formatters.js';
export { isInRange, isValidISODate, isValidWellnessMetric } from './validators.js';

// ==== Periodization ====
export {
  calculatePhaseBreakdown,
  calculateWeeklyVolumes,
  generatePeriodizationPlan,
  getIntensityDistribution,
  getTrainingFocus,
} from './periodization.js';

// ==== Week Overview ====
export {
  calculateCurrentWeek,
  formatFocusName,
  formatPhaseName,
  getCurrentPhase,
  getCurrentWeekInfo,
  getTodayDayIndex,
  WEEK_DAYS,
} from './week-overview.js';
export type {
  DaySlot,
  PeriodizationJson,
  PeriodizationPhaseEntry,
  WeekDay,
  WeeklyTemplateJson,
  WeekOverviewInfo,
} from './week-overview.js';

// ==== Analysis ====
export {
  assessRecovery,
  calculateFormTrend,
  calculateRaceReadiness,
  calculateWeeklyLoads,
  getFormStatus,
} from './analysis.js';

// ==== DSL ====
export { workoutStructureToDSL } from './dsl-serializer.js';
export { validateDSL } from './dsl-validator.js';
export type { DSLValidationError, DSLValidationResult } from './dsl-validator.js';

// ==== Week Assembly ====
export { assembleWeek } from './week-assembler.js';
export type {
  DayConstraint,
  DayOfWeek,
  PlannedSession,
  WeekAssemblyInput,
  WeekAssemblyResult,
} from './week-assembler.js';

// ==== Compliance ====
export {
  complianceColor,
  computeBlockCompliance,
  computeWeeklyCompliance,
  computeWorkoutCompliance,
} from './compliance.js';
export type {
  BlockCompliance,
  WeeklyCompliance,
  WorkoutComplianceResult,
} from './compliance.js';

// ==== Date Ranges ====
export { expandDateRange, groupUnavailableDates } from './date-ranges.js';
export type { DateGroup } from './date-ranges.js';

// ==== Race Sport Requirements ====
export { getSportRequirements, mergeSportRequirements } from './race-sport-requirements.js';
export type { SportRequirement } from './race-sport-requirements.js';

// ==== Adaptation Engine ====
export {
  ADAPTATION_TYPES,
  ADAPTATION_CONFIDENCES,
  buildAdaptationPrompt,
  buildAfterSnapshot,
  extractSwappableContent,
  isAdaptationConfidence,
  isAdaptationType,
  parseAdaptationResponse,
  screenAdaptation,
  snapshotWorkout,
} from './adaptation-engine.js';
export type {
  AdaptationConfidence,
  AdaptationContext,
  AdaptationSuggestion,
  AdaptationType,
  AdaptationWeekSummary,
  CheckInData,
  SwappableContent,
  WellnessData,
} from './adaptation-engine.js';
