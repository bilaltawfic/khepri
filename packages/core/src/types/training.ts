/**
 * Training periodization phase types.
 */
export const PERIODIZATION_PHASES = ['base', 'build', 'peak', 'taper', 'recovery'] as const;

export type PeriodizationPhase = (typeof PERIODIZATION_PHASES)[number];

/**
 * Training focus areas for each phase.
 */
export const TRAINING_FOCUS = [
  'aerobic_endurance',
  'threshold_work',
  'vo2max',
  'race_specific',
  'recovery',
  'strength',
] as const;

export type TrainingFocus = (typeof TRAINING_FOCUS)[number];

/**
 * Type guard for PeriodizationPhase.
 */
export function isPeriodizationPhase(value: unknown): value is PeriodizationPhase {
  return typeof value === 'string' && (PERIODIZATION_PHASES as readonly string[]).includes(value);
}

/**
 * Type guard for TrainingFocus.
 */
export function isTrainingFocus(value: unknown): value is TrainingFocus {
  return typeof value === 'string' && (TRAINING_FOCUS as readonly string[]).includes(value);
}

/**
 * Intensity distribution: [Zone1-2%, Zone3-4%, Zone5+%]
 * Must sum to 100.
 */
export type IntensityDistribution = readonly [number, number, number];

/**
 * A single periodization phase configuration.
 */
export interface PeriodizationPhaseConfig {
  readonly phase: PeriodizationPhase;
  readonly weeks: number;
  readonly focus: TrainingFocus;
  readonly intensity_distribution: IntensityDistribution;
}

/**
 * Weekly training volume progression.
 */
export interface WeeklyVolume {
  readonly week: number;
  readonly volume_multiplier: number; // 0.5 = 50% of base, 1.0 = 100%, 1.2 = 120%
  readonly phase: PeriodizationPhase;
}

/**
 * Full periodization plan for a training cycle.
 */
export interface PeriodizationPlan {
  readonly total_weeks: number;
  readonly phases: readonly PeriodizationPhaseConfig[];
  readonly weekly_volumes: readonly WeeklyVolume[];
}
