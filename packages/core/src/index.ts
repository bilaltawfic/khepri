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

export type {
  ActivityRecord,
  FitnessDataPoint,
  FormStatus,
  FormTrend,
  RaceReadiness,
  RecoveryAssessment,
  WeeklyLoadSummary,
} from './types/index.js';
export { FORM_STATUSES } from './types/index.js';

// ==== Template Types ====
export type {
  DifficultyLevel,
  Exercise,
  MuscleGroup,
  WorkoutCategory,
  WorkoutTemplate,
} from './types/index.js';
export {
  DIFFICULTY_LEVELS,
  MUSCLE_GROUPS,
  WORKOUT_CATEGORIES,
  isDifficultyLevel,
  isMuscleGroup,
  isWorkoutCategory,
} from './types/index.js';

// ==== Season Types ====
export type {
  BlockPhase,
  BlockStatus,
  RaceBlock,
  Season,
  SeasonPreferences,
  SeasonSkeleton,
  SeasonSkeletonPhase,
  SeasonStatus,
} from './types/index.js';
export {
  BLOCK_STATUSES,
  SEASON_STATUSES,
  isBlockStatus,
  isSeasonStatus,
} from './types/index.js';

// ==== Workout Types ====
export type {
  IntervalsTarget,
  Sport,
  SyncStatus,
  Workout,
  WorkoutSection,
  WorkoutStep,
  WorkoutStructure,
  WorkoutType,
} from './types/index.js';
export {
  INTERVALS_TARGETS,
  SPORTS,
  SYNC_STATUSES,
  WORKOUT_TYPES,
  isIntervalsTarget,
  isSport,
  isSyncStatus,
  isWorkoutType,
} from './types/index.js';

// ==== Race Catalog ====
export type {
  RaceCatalogEntry,
  RaceDiscipline,
  TrainingSportRequirement,
} from './types/index.js';
export {
  DISCIPLINE_ICONS,
  DISCIPLINE_LABELS,
  RACE_CATALOG,
  RACE_DISCIPLINES,
  getDistancesForDiscipline,
  getRaceCatalogEntry,
  isRaceDiscipline,
} from './types/index.js';

// ==== Block Planning Types ====
export type { DayPreference, UnavailableDate } from './types/index.js';

// ==== Adaptation Types ====
export type {
  AdaptationStatus,
  AdaptationTrigger,
  ComplianceColor,
  ComplianceResult,
  PlanAdaptation,
  WorkoutSnapshot,
} from './types/index.js';
export {
  ADAPTATION_STATUSES,
  ADAPTATION_TRIGGERS,
  COMPLIANCE_COLORS,
  isAdaptationStatus,
  isAdaptationTrigger,
  isComplianceColor,
} from './types/index.js';

// ==== Templates ====
export {
  GYM_TEMPLATES,
  getGymTemplateById,
  getGymTemplatesByCategory,
  getGymTemplatesByDifficulty,
  TRAVEL_TEMPLATES,
  getTravelTemplateById,
  getTravelTemplatesByCategory,
  getTravelTemplatesByDifficulty,
} from './templates/index.js';

// ==== Workout Templates (Training Plan) ====
export {
  clearTemplates,
  getAllTemplates,
  registerTemplate,
  registerTemplates,
  renderTemplate,
  selectTemplate,
  SWIM_TEMPLATES,
  BIKE_TEMPLATES,
  RUN_TEMPLATES,
} from './templates/index.js';
export type {
  AthleteZones,
  TemplateSelection,
  TrainingTemplate,
} from './templates/index.js';

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

export {
  assessRecovery,
  calculateFormTrend,
  calculateRaceReadiness,
  calculateWeeklyLoads,
  getFormStatus,
} from './utils/index.js';

export {
  calculateCurrentWeek,
  formatFocusName,
  formatPhaseName,
  getCurrentPhase,
  getCurrentWeekInfo,
  getTodayDayIndex,
  WEEK_DAYS,
} from './utils/index.js';
export type {
  DaySlot,
  PeriodizationJson,
  PeriodizationPhaseEntry,
  WeekDay,
  WeeklyTemplateJson,
  WeekOverviewInfo,
} from './utils/index.js';

// ==== DSL ====
export { workoutStructureToDSL } from './utils/index.js';
export { validateDSL } from './utils/index.js';
export type { DSLValidationError, DSLValidationResult } from './utils/index.js';

// ==== Week Assembly ====
export { assembleWeek } from './utils/index.js';
export type {
  DayConstraint,
  DayOfWeek,
  PlannedSession,
  WeekAssemblyInput,
  WeekAssemblyResult,
} from './utils/index.js';

// ==== Compliance ====
export {
  complianceColor,
  computeBlockCompliance,
  computeWeeklyCompliance,
  computeWorkoutCompliance,
} from './utils/index.js';
export type {
  BlockCompliance,
  WeeklyCompliance,
  WorkoutComplianceResult,
} from './utils/index.js';

// ==== Date Ranges ====
export { expandDateRange, groupUnavailableDates } from './utils/index.js';
export type { DateGroup } from './utils/index.js';

// ==== Race Sport Requirements ====
export {
  getMinHoursForRaceList,
  getMinWeeklyHours,
  getRequirementsForRace,
  mergeSportRequirements,
} from './utils/index.js';
export type { SportRequirement } from './utils/index.js';

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
} from './utils/index.js';
export type {
  AdaptationConfidence,
  AdaptationContext,
  AdaptationSuggestion,
  AdaptationType,
  AdaptationWeekSummary,
  CheckInData,
  SwappableContent,
  WellnessData,
} from './utils/index.js';
