/**
 * Safety Tools
 *
 * Tools for checking training safety and identifying potential risks.
 * These tools help Claude make safer training recommendations.
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type {
  CoachingContext,
  Constraint,
  DailyCheckIn,
  FitnessMetrics,
  LoadMetrics,
  LoadWarning,
  ModificationReason,
  ModificationWarning,
  OvertrainingRisk,
  ProposedWorkout,
  TrainingHistory,
  TrainingLoadValidation,
  WorkoutModificationValidation,
} from '../types.js';
import { INTENSITY_ORDER, WORKOUT_INTENSITIES, isWorkoutIntensity } from '../types.js';

// =============================================================================
// SAFETY TOOL DEFINITIONS
// =============================================================================

/**
 * Tool for checking training readiness based on wellness data
 */
export const CHECK_TRAINING_READINESS_TOOL: Tool = {
  name: 'check_training_readiness',
  description: `Analyze the athlete's current wellness data and determine training readiness.
Returns a readiness score and any safety concerns that should influence today's training.
Use this before making workout recommendations to ensure safety.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      sleep_quality: {
        type: 'number',
        description: 'Sleep quality rating 1-10',
      },
      sleep_hours: {
        type: 'number',
        description: 'Hours of sleep',
      },
      energy_level: {
        type: 'number',
        description: 'Energy level rating 1-10',
      },
      stress_level: {
        type: 'number',
        description: 'Stress level rating 1-10',
      },
      soreness: {
        type: 'number',
        description: 'Overall soreness rating 1-10',
      },
      resting_hr: {
        type: 'number',
        description: 'Resting heart rate in bpm',
      },
      hrv: {
        type: 'number',
        description: 'Heart rate variability in ms',
      },
      baseline_rhr: {
        type: 'number',
        description: "Athlete's baseline resting heart rate",
      },
      baseline_hrv: {
        type: 'number',
        description: "Athlete's baseline HRV",
      },
    },
    required: [],
  },
};

/**
 * Tool for checking fatigue level from fitness metrics
 */
export const CHECK_FATIGUE_LEVEL_TOOL: Tool = {
  name: 'check_fatigue_level',
  description: `Analyze the athlete's current training load and fatigue level.
Uses CTL/ATL/TSB metrics to determine if the athlete is in a safe training zone.
Returns fatigue assessment and recommended training adjustments.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      ctl: {
        type: 'number',
        description: 'Chronic Training Load (fitness)',
      },
      atl: {
        type: 'number',
        description: 'Acute Training Load (fatigue)',
      },
      tsb: {
        type: 'number',
        description: 'Training Stress Balance (form)',
      },
      ramp_rate: {
        type: 'number',
        description: 'Weekly CTL increase rate',
      },
    },
    required: ['ctl', 'atl', 'tsb'],
  },
};

/**
 * Tool for checking constraint compatibility with workout
 */
export const CHECK_CONSTRAINT_COMPATIBILITY_TOOL: Tool = {
  name: 'check_constraint_compatibility',
  description: `Check if a proposed workout is compatible with the athlete's active constraints.
Evaluates injuries, travel limitations, and availability restrictions.
Returns compatibility assessment and suggested modifications.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      workout_sport: {
        type: 'string',
        enum: ['swim', 'bike', 'run', 'strength'],
        description: 'The sport of the proposed workout',
      },
      workout_duration_minutes: {
        type: 'number',
        description: 'Duration of the proposed workout',
      },
      workout_intensity: {
        type: 'string',
        enum: ['recovery', 'easy', 'moderate', 'tempo', 'threshold', 'vo2max', 'sprint'],
        description: 'Intensity level of the proposed workout',
      },
      injury_restrictions: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of injury-related restrictions',
      },
      available_equipment: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of available equipment',
      },
      available_time_minutes: {
        type: 'number',
        description: 'Available time for training today',
      },
    },
    required: ['workout_sport'],
  },
};

/**
 * Tool for validating proposed workout against training load.
 *
 * NOTE: This is a simplified schema for Claude tool-use with pre-aggregated
 * metrics. For full monotony/strain analysis from daily activity data, call
 * `validateTrainingLoad()` directly with a `TrainingHistory` object.
 */
export const VALIDATE_TRAINING_LOAD_TOOL: Tool = {
  name: 'validate_training_load',
  description: `Validate a proposed workout against the athlete's current training load and recovery state.
Returns whether the workout is safe, risk level, and any warnings about overtraining.
MUST be called before recommending any workout to ensure athlete safety.
Note: This tool uses pre-aggregated metrics. For full monotony/strain analysis, the orchestrator should call validateTrainingLoad() directly with historical activity data.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      proposed_tss: {
        type: 'number',
        description: 'Estimated Training Stress Score of proposed workout',
      },
      proposed_intensity: {
        type: 'string',
        enum: ['recovery', 'easy', 'moderate', 'tempo', 'threshold', 'vo2max', 'sprint'],
        description: 'Intensity level of proposed workout',
      },
      current_ctl: {
        type: 'number',
        description: 'Current Chronic Training Load (fitness)',
      },
      current_atl: {
        type: 'number',
        description: 'Current Acute Training Load (fatigue)',
      },
      current_tsb: {
        type: 'number',
        description: 'Current Training Stress Balance (form)',
      },
      weekly_tss: {
        type: 'number',
        description: 'TSS accumulated so far this week',
      },
      consecutive_hard_days: {
        type: 'number',
        description: 'Number of consecutive high-intensity days',
      },
    },
    required: ['proposed_tss', 'current_ctl', 'current_atl', 'current_tsb'],
  },
};

/**
 * Tool for validating proposed modifications to an existing workout
 */
export const VALIDATE_WORKOUT_MODIFICATION_TOOL: Tool = {
  name: 'validate_workout_modification',
  description: `Validate proposed modifications to an existing workout for safety.
Compares the original planned workout with the athlete's requested changes.
Checks intensity jumps, load increases, constraint violations, and fatigue state.
MUST be called before accepting any athlete-requested workout modification.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      original_workout: {
        type: 'object',
        description: 'The original planned workout',
        properties: {
          sport: { type: 'string', description: 'Sport type (e.g., run, bike, swim)' },
          duration_minutes: { type: 'number', description: 'Planned duration in minutes' },
          intensity: {
            type: 'string',
            description:
              'Intensity level: recovery, easy, moderate, tempo, threshold, vo2max, sprint',
          },
          estimated_tss: { type: 'number', description: 'Estimated Training Stress Score' },
        },
        required: ['sport', 'duration_minutes', 'intensity', 'estimated_tss'],
      },
      modified_workout: {
        type: 'object',
        description: 'The proposed modified workout',
        properties: {
          sport: { type: 'string' },
          duration_minutes: { type: 'number' },
          intensity: { type: 'string' },
          estimated_tss: { type: 'number' },
        },
        required: ['sport', 'duration_minutes', 'intensity', 'estimated_tss'],
      },
      modification_reason: {
        type: 'string',
        description:
          'Why the athlete wants to modify: feeling_good, feeling_bad, time_constraint, equipment_unavailable, weather, other',
      },
    },
    required: ['original_workout', 'modified_workout'],
  },
};

/**
 * All safety tools
 */
export const SAFETY_TOOLS: Tool[] = [
  CHECK_TRAINING_READINESS_TOOL,
  CHECK_FATIGUE_LEVEL_TOOL,
  CHECK_CONSTRAINT_COMPATIBILITY_TOOL,
  VALIDATE_TRAINING_LOAD_TOOL,
  VALIDATE_WORKOUT_MODIFICATION_TOOL,
];

// =============================================================================
// SAFETY CHECK IMPLEMENTATIONS
// =============================================================================

export type TrainingReadiness = 'green' | 'yellow' | 'red';

export interface ReadinessAssessment {
  readiness: TrainingReadiness;
  score: number; // 0-100
  concerns: string[];
  recommendations: string[];
}

// Helper type for metric analysis results
interface MetricAnalysis {
  scorePenalty: number;
  concern?: string;
  recommendation?: string;
}

// Sleep duration analysis
function analyzeSleepDuration(hours: number | undefined): MetricAnalysis {
  if (hours === undefined) return { scorePenalty: 0 };
  if (hours < 5) {
    return {
      scorePenalty: 30,
      concern: 'Very low sleep duration (<5 hours)',
      recommendation: 'Consider rest day or very light activity only',
    };
  }
  if (hours < 6) {
    return {
      scorePenalty: 15,
      concern: 'Low sleep duration (<6 hours)',
      recommendation: 'Reduce workout intensity',
    };
  }
  if (hours < 7) return { scorePenalty: 5 };
  return { scorePenalty: 0 };
}

// Sleep quality analysis
function analyzeSleepQuality(quality: number | undefined): MetricAnalysis {
  if (quality === undefined) return { scorePenalty: 0 };
  if (quality <= 4) {
    return {
      scorePenalty: 20,
      concern: 'Poor sleep quality',
      recommendation: 'Avoid high-intensity training',
    };
  }
  if (quality <= 6) return { scorePenalty: 10 };
  return { scorePenalty: 0 };
}

// Energy level analysis
function analyzeEnergy(level: number | undefined): MetricAnalysis {
  if (level === undefined) return { scorePenalty: 0 };
  if (level <= 3) {
    return {
      scorePenalty: 25,
      concern: 'Very low energy',
      recommendation: 'Rest or very light activity recommended',
    };
  }
  if (level <= 5) return { scorePenalty: 10, concern: 'Below normal energy' };
  return { scorePenalty: 0 };
}

// Stress level analysis
function analyzeStress(level: number | undefined): MetricAnalysis {
  if (level === undefined) return { scorePenalty: 0 };
  if (level >= 9) {
    return {
      scorePenalty: 25,
      concern: 'Extremely high stress',
      recommendation: 'Training may add stress - consider rest or light activity',
    };
  }
  if (level >= 7) return { scorePenalty: 10, concern: 'Elevated stress level' };
  return { scorePenalty: 0 };
}

// Soreness analysis
function analyzeSoreness(level: number | undefined): MetricAnalysis {
  if (level === undefined) return { scorePenalty: 0 };
  if (level >= 8) {
    return {
      scorePenalty: 20,
      concern: 'High muscle soreness',
      recommendation: 'Avoid loading sore muscles - consider recovery day',
    };
  }
  if (level >= 6) return { scorePenalty: 10, concern: 'Moderate soreness' };
  return { scorePenalty: 0 };
}

// Heart rate analysis
function analyzeHeartRate(
  current: number | undefined,
  baseline: number | undefined
): MetricAnalysis {
  if (current === undefined || baseline === undefined) return { scorePenalty: 0 };
  const hrDiff = current - baseline;
  if (hrDiff > 10) {
    return {
      scorePenalty: 25,
      concern: `Resting HR significantly elevated (+${hrDiff} bpm)`,
      recommendation: 'Elevated HR may indicate illness, stress, or overtraining',
    };
  }
  if (hrDiff > 5) return { scorePenalty: 10, concern: `Resting HR elevated (+${hrDiff} bpm)` };
  return { scorePenalty: 0 };
}

// HRV analysis
function analyzeHrv(current: number | undefined, baseline: number | undefined): MetricAnalysis {
  if (current === undefined || baseline === undefined) return { scorePenalty: 0 };
  const hrvPercentDiff = ((baseline - current) / baseline) * 100;
  if (hrvPercentDiff > 20) {
    return {
      scorePenalty: 20,
      concern: `HRV significantly below baseline (-${hrvPercentDiff.toFixed(0)}%)`,
      recommendation: 'Low HRV suggests recovery deficit',
    };
  }
  if (hrvPercentDiff > 10) {
    return { scorePenalty: 10, concern: `HRV below baseline (-${hrvPercentDiff.toFixed(0)}%)` };
  }
  return { scorePenalty: 0 };
}

// Apply metric analysis to assessment
function applyAnalysis(
  analysis: MetricAnalysis,
  score: { value: number },
  concerns: string[],
  recommendations: string[]
): void {
  score.value -= analysis.scorePenalty;
  if (analysis.concern) concerns.push(analysis.concern);
  if (analysis.recommendation) recommendations.push(analysis.recommendation);
}

/**
 * Check training readiness based on wellness metrics
 */
export function checkTrainingReadiness(
  checkIn: DailyCheckIn,
  baselineRhr?: number,
  baselineHrv?: number
): ReadinessAssessment {
  const concerns: string[] = [];
  const recommendations: string[] = [];
  const score = { value: 100 };

  // Analyze each metric
  applyAnalysis(analyzeSleepDuration(checkIn.sleepHours), score, concerns, recommendations);
  applyAnalysis(analyzeSleepQuality(checkIn.sleepQuality), score, concerns, recommendations);
  applyAnalysis(analyzeEnergy(checkIn.energyLevel), score, concerns, recommendations);
  applyAnalysis(analyzeStress(checkIn.stressLevel), score, concerns, recommendations);
  applyAnalysis(analyzeSoreness(checkIn.overallSoreness), score, concerns, recommendations);
  applyAnalysis(analyzeHeartRate(checkIn.restingHr, baselineRhr), score, concerns, recommendations);
  applyAnalysis(analyzeHrv(checkIn.hrvMs, baselineHrv), score, concerns, recommendations);

  // Determine readiness level
  const readiness = determineReadinessLevel(score.value, recommendations);

  return {
    readiness,
    score: Math.max(0, score.value),
    concerns,
    recommendations,
  };
}

function determineReadinessLevel(score: number, recommendations: string[]): TrainingReadiness {
  if (score >= 70) return 'green';
  if (score >= 40) {
    if (recommendations.length === 0) {
      recommendations.push('Consider reduced volume or intensity');
    }
    return 'yellow';
  }
  if (recommendations.length === 0) {
    recommendations.push('Rest day or very light recovery activity only');
  }
  return 'red';
}

export interface FatigueAssessment {
  level: 'low' | 'moderate' | 'high' | 'critical';
  tsb: number;
  concerns: string[];
  recommendations: string[];
}

/**
 * Check fatigue level from fitness metrics
 */
export function checkFatigueLevel(metrics: FitnessMetrics): FatigueAssessment {
  const concerns: string[] = [];
  const recommendations: string[] = [];

  let level: FatigueAssessment['level'];

  if (metrics.tsb < -40) {
    level = 'critical';
    concerns.push('Extremely high fatigue (TSB < -40)');
    recommendations.push(
      'Mandatory rest or very light recovery only',
      'Risk of overtraining syndrome if continued'
    );
  } else if (metrics.tsb < -25) {
    level = 'high';
    concerns.push('High fatigue (TSB < -25)');
    recommendations.push('Reduce training load', 'Prioritize recovery activities');
  } else if (metrics.tsb < -10) {
    level = 'moderate';
    // This is the normal productive training zone
    recommendations.push('Good training zone - maintain current approach');
  } else {
    level = 'low';
    if (metrics.tsb > 10) {
      concerns.push('Very fresh but may be losing fitness');
      recommendations.push('Can increase training load if desired');
    }
  }

  // Check ramp rate if available
  if (metrics.rampRate !== undefined) {
    if (metrics.rampRate > 8) {
      concerns.push(`Ramp rate too high (${metrics.rampRate.toFixed(1)} TSS/week)`);
      recommendations.push('Slow down fitness build to avoid injury');
    } else if (metrics.rampRate > 5 && level !== 'low') {
      concerns.push(`Elevated ramp rate (${metrics.rampRate.toFixed(1)} TSS/week)`);
    }
  }

  return {
    level,
    tsb: metrics.tsb,
    concerns,
    recommendations,
  };
}

export interface ConstraintCompatibility {
  compatible: boolean;
  issues: string[];
  modifications: string[];
}

type WorkoutInfo = {
  sport: 'swim' | 'bike' | 'run' | 'strength';
  durationMinutes: number;
  intensity: string;
};

type CompatibilityResult = { issues: string[]; modifications: string[] };

// Equipment requirements by sport
const EQUIPMENT_BY_SPORT: Record<string, string[]> = {
  swim: ['pool', 'swim_goggles'],
  bike: ['bike', 'bike_trainer'],
  run: ['running_shoes'],
  strength: ['gym', 'weights'],
};

const HIGH_INTENSITY_LEVELS = new Set(['threshold', 'vo2max', 'sprint']);

// Check time availability
function checkTimeAvailability(workout: WorkoutInfo, availableTime?: number): CompatibilityResult {
  const issues: string[] = [];
  const modifications: string[] = [];

  if (availableTime !== undefined && workout.durationMinutes > availableTime) {
    issues.push(
      `Workout (${workout.durationMinutes} min) exceeds available time (${availableTime} min)`
    );
    modifications.push(`Reduce workout to ${availableTime} minutes`);
  }

  return { issues, modifications };
}

// Check equipment access
function checkEquipmentAccess(sport: string, available: string[]): CompatibilityResult {
  const issues: string[] = [];
  const modifications: string[] = [];

  const needed = EQUIPMENT_BY_SPORT[sport] ?? [];
  if (needed.length === 0 || available.length === 0) return { issues, modifications };

  const hasEquipment = needed.some((eq) =>
    available.some((avail) => avail.toLowerCase().includes(eq.toLowerCase()))
  );

  if (!hasEquipment) {
    issues.push(`Required equipment for ${sport} may not be available`);
    modifications.push('Consider alternative sport with available equipment');
  }

  return { issues, modifications };
}

// Check a single injury constraint
function checkSingleInjuryConstraint(
  workout: WorkoutInfo,
  injury: import('../types.js').InjuryConstraint
): CompatibilityResult {
  const issues: string[] = [];
  const modifications: string[] = [];
  const restrictions = injury.injuryRestrictions ?? [];

  if (restrictions.includes(workout.sport)) {
    issues.push(`${workout.sport} is restricted due to ${injury.title}`);
    modifications.push(`Avoid ${workout.sport} until injury resolves`);
  }

  if (restrictions.includes('high_intensity') && HIGH_INTENSITY_LEVELS.has(workout.intensity)) {
    issues.push(`High intensity restricted due to ${injury.title}`);
    modifications.push('Reduce intensity to moderate or below');
  }

  if (restrictions.includes('impact') && workout.sport === 'run') {
    issues.push(`Running (impact) restricted due to ${injury.title}`);
    modifications.push('Consider swimming or cycling instead');
  }

  return { issues, modifications };
}

// Check all injury constraints
function checkInjuryConstraints(
  workout: WorkoutInfo,
  constraints: CoachingContext['constraints']
): CompatibilityResult {
  const issues: string[] = [];
  const modifications: string[] = [];

  for (const constraint of constraints) {
    if (constraint.constraintType === 'injury' && constraint.status === 'active') {
      const result = checkSingleInjuryConstraint(workout, constraint);
      issues.push(...result.issues);
      modifications.push(...result.modifications);
    }
  }

  return { issues, modifications };
}

// Check travel constraints
function checkTravelConstraints(sport: string, availableEquipment: string[]): CompatibilityResult {
  const issues: string[] = [];
  const modifications: string[] = [];

  const hasPool = availableEquipment.some((eq) => eq.toLowerCase().includes('pool'));
  const hasBike = availableEquipment.some((eq) => eq.toLowerCase().includes('bike'));

  if (sport === 'swim' && !hasPool) {
    issues.push('Pool access uncertain while traveling');
    modifications.push('Confirm pool access or choose alternative');
  }

  if (sport === 'bike' && !hasBike) {
    issues.push('Bike access uncertain while traveling');
    modifications.push('Consider running or hotel gym workout');
  }

  return { issues, modifications };
}

// Merge compatibility results
function mergeResults(results: CompatibilityResult[]): CompatibilityResult {
  return {
    issues: results.flatMap((r) => r.issues),
    modifications: results.flatMap((r) => r.modifications),
  };
}

/**
 * Check if a workout is compatible with active constraints
 */
export function checkConstraintCompatibility(
  workout: WorkoutInfo,
  context: CoachingContext
): ConstraintCompatibility {
  const availableEquipment = context.checkIn?.equipmentAccess ?? [];
  const isTraveling = context.checkIn?.travelStatus === 'traveling';

  const results: CompatibilityResult[] = [
    checkTimeAvailability(workout, context.checkIn?.availableTimeMinutes),
    checkEquipmentAccess(workout.sport, availableEquipment),
    checkInjuryConstraints(workout, context.constraints),
  ];

  if (isTraveling) {
    results.push(checkTravelConstraints(workout.sport, availableEquipment));
  }

  const merged = mergeResults(results);

  return {
    compatible: merged.issues.length === 0,
    issues: merged.issues,
    modifications: merged.modifications,
  };
}

// =============================================================================
// TRAINING LOAD VALIDATION
// =============================================================================

/**
 * Safe training load thresholds based on sports science research
 */
const LOAD_THRESHOLDS = {
  // TSB (form) thresholds
  TSB_CRITICAL: -40,
  TSB_OVERREACHING: -30,

  // Ramp rate (CTL change per week)
  RAMP_RATE_AGGRESSIVE: 8,
  RAMP_RATE_DANGEROUS: 10,

  // Monotony (lack of training variability)
  MONOTONY_HIGH: 2,

  // Strain (monotony * weekly load)
  STRAIN_HIGH: 1500,
  STRAIN_CRITICAL: 2000,

  // Consecutive hard days
  MAX_CONSECUTIVE_HARD_DAYS: 2,
} as const;

// TSS estimates by intensity when not provided (per 60 min)
const TSS_ESTIMATES: Record<string, number> = {
  recovery: 20,
  easy: 40,
  moderate: 60,
  tempo: 80,
  threshold: 100,
  vo2max: 120,
  sprint: 140,
};

/**
 * Calculate monotony score (lack of variability in training).
 * Lower is better - high monotony increases injury/illness risk.
 */
function calculateMonotony(dailyTssValues: readonly number[]): number {
  if (dailyTssValues.length < 2) return 0;

  const mean = dailyTssValues.reduce((a, b) => a + b, 0) / dailyTssValues.length;
  if (mean === 0) return 0;

  const variance =
    dailyTssValues.reduce((sum, val) => sum + (val - mean) ** 2, 0) / dailyTssValues.length;
  const stdDev = Math.sqrt(variance);

  return stdDev === 0 ? 3 : mean / stdDev;
}

/**
 * Estimate TSS for a workout based on intensity and duration
 */
function estimateTSS(workout: ProposedWorkout): number {
  if (workout.estimatedTSS != null) return workout.estimatedTSS;

  const baseTSS = TSS_ESTIMATES[workout.intensity] ?? 60;
  return Math.round((baseTSS * workout.durationMinutes) / 60);
}

/**
 * Check for specific warning conditions
 */
function checkLoadWarnings(
  current: LoadMetrics,
  projected: LoadMetrics,
  consecutiveHardDays: number
): LoadWarning[] {
  const warnings: LoadWarning[] = [];

  // Check TSB (form)
  if (projected.tsb < LOAD_THRESHOLDS.TSB_CRITICAL) {
    warnings.push({
      type: 'overreaching',
      severity: 'danger',
      message: 'Projected form (TSB) critically low - high injury/illness risk',
      metric: 'TSB',
      threshold: LOAD_THRESHOLDS.TSB_CRITICAL,
      actual: projected.tsb,
    });
  } else if (projected.tsb < LOAD_THRESHOLDS.TSB_OVERREACHING) {
    warnings.push({
      type: 'overreaching',
      severity: 'warning',
      message: 'Projected form (TSB) indicates overreaching zone',
      metric: 'TSB',
      threshold: LOAD_THRESHOLDS.TSB_OVERREACHING,
      actual: projected.tsb,
    });
  }

  // Check ramp rate
  if (current.rampRate > LOAD_THRESHOLDS.RAMP_RATE_DANGEROUS) {
    warnings.push({
      type: 'ramp_rate',
      severity: 'danger',
      message: `Fitness building too fast (${current.rampRate.toFixed(1)} TSS/week)`,
      metric: 'Ramp Rate',
      threshold: LOAD_THRESHOLDS.RAMP_RATE_DANGEROUS,
      actual: current.rampRate,
    });
  } else if (current.rampRate > LOAD_THRESHOLDS.RAMP_RATE_AGGRESSIVE) {
    warnings.push({
      type: 'ramp_rate',
      severity: 'warning',
      message: `Fitness building aggressively (${current.rampRate.toFixed(1)} TSS/week)`,
      metric: 'Ramp Rate',
      threshold: LOAD_THRESHOLDS.RAMP_RATE_AGGRESSIVE,
      actual: current.rampRate,
    });
  }

  // Check monotony (use worst of current vs projected)
  const effectiveMonotony = Math.max(current.monotony ?? 0, projected.monotony ?? 0);
  if (effectiveMonotony > LOAD_THRESHOLDS.MONOTONY_HIGH) {
    warnings.push({
      type: 'monotony',
      severity: 'warning',
      message: 'Training lacks variability - increase rest day variety',
      metric: 'Monotony',
      threshold: LOAD_THRESHOLDS.MONOTONY_HIGH,
      actual: effectiveMonotony,
    });
  }

  // Check strain (use worst of current vs projected)
  const effectiveStrain = Math.max(current.strain ?? 0, projected.strain ?? 0);
  if (effectiveStrain > LOAD_THRESHOLDS.STRAIN_CRITICAL) {
    warnings.push({
      type: 'strain',
      severity: 'danger',
      message: 'Training strain critically high - mandatory rest recommended',
      metric: 'Strain',
      threshold: LOAD_THRESHOLDS.STRAIN_CRITICAL,
      actual: effectiveStrain,
    });
  } else if (effectiveStrain > LOAD_THRESHOLDS.STRAIN_HIGH) {
    warnings.push({
      type: 'strain',
      severity: 'warning',
      message: 'Training strain elevated - consider lighter week',
      metric: 'Strain',
      threshold: LOAD_THRESHOLDS.STRAIN_HIGH,
      actual: effectiveStrain,
    });
  }

  // Check consecutive hard days
  if (consecutiveHardDays >= LOAD_THRESHOLDS.MAX_CONSECUTIVE_HARD_DAYS) {
    warnings.push({
      type: 'consecutive_hard',
      severity: 'warning',
      message: `${consecutiveHardDays} consecutive high-intensity days - recovery recommended`,
      metric: 'Consecutive Hard Days',
      threshold: LOAD_THRESHOLDS.MAX_CONSECUTIVE_HARD_DAYS,
      actual: consecutiveHardDays,
    });
  }

  return warnings;
}

/**
 * Determine overall risk level from warnings
 */
function determineOvertrainingRisk(warnings: readonly LoadWarning[]): OvertrainingRisk {
  const hasDanger = warnings.some((w) => w.severity === 'danger');
  const warningCount = warnings.filter((w) => w.severity === 'warning').length;

  if (hasDanger) return 'critical';
  if (warningCount >= 3) return 'high';
  if (warningCount >= 1) return 'moderate';
  return 'low';
}

/**
 * Generate recommendations based on warnings
 */
function generateLoadRecommendations(
  warnings: readonly LoadWarning[],
  risk: OvertrainingRisk
): string[] {
  const recommendations: string[] = [];

  if (risk === 'critical') {
    recommendations.push(
      'Take a full rest day or very light recovery activity only',
      'Review training load over the past 2 weeks'
    );
  }

  if (warnings.some((w) => w.type === 'ramp_rate')) {
    recommendations.push(
      'Reduce weekly training volume by 10-15%',
      'Add an extra recovery day this week'
    );
  }

  if (warnings.some((w) => w.type === 'monotony')) {
    recommendations.push(
      'Vary workout intensities more throughout the week',
      'Include both easy and hard days rather than all moderate'
    );
  }

  if (warnings.some((w) => w.type === 'strain')) {
    recommendations.push('Consider a recovery week with reduced volume and intensity');
  }

  if (warnings.some((w) => w.type === 'overreaching')) {
    recommendations.push('Prioritize recovery and reduce training load until form improves');
  }

  if (warnings.some((w) => w.type === 'consecutive_hard')) {
    recommendations.push('Schedule an easy or rest day before next hard session');
  }

  if (risk === 'low' && recommendations.length === 0) {
    recommendations.push('Training load is within safe parameters');
  }

  return recommendations;
}

/**
 * Validate a proposed workout against current training load.
 * Returns risk level, warnings, and recommendations for athlete safety.
 */
export function validateTrainingLoad(
  proposed: ProposedWorkout,
  history: TrainingHistory,
  consecutiveHardDays = 0
): TrainingLoadValidation {
  const proposedTSS = estimateTSS(proposed);
  const metrics = history.fitnessMetrics;

  // Calculate current load metrics from last 7 calendar days [today-6, today].
  // Normalize dates to YYYY-MM-DD to handle callers passing ISO datetimes.
  // Aggregate multiple activities per day into per-day TSS totals.
  const toDateStr = (d: Date): string => d.toISOString().slice(0, 10);
  const now = new Date();
  const today = toDateStr(now);
  const sixDaysAgoDate = new Date(now);
  sixDaysAgoDate.setDate(sixDaysAgoDate.getDate() - 6);
  const sixDaysAgoStr = toDateStr(sixDaysAgoDate);

  // Aggregate activities into per-day TSS totals
  const dailyTssMap = new Map<string, number>();
  for (const a of history.activities) {
    const day = a.date.slice(0, 10);
    if (day >= sixDaysAgoStr && day <= today) {
      dailyTssMap.set(day, (dailyTssMap.get(day) ?? 0) + a.tss);
    }
  }
  const last7Days = [...dailyTssMap.values()];

  const weeklyTSS = last7Days.reduce((sum, tss) => sum + tss, 0);
  const monotony = calculateMonotony(last7Days);
  const strain = monotony * weeklyTSS;

  const currentLoad: LoadMetrics = {
    weeklyTSS,
    ctl: metrics.ctl,
    atl: metrics.atl,
    tsb: metrics.tsb,
    rampRate: metrics.rampRate ?? 0,
    monotony,
    strain,
  };

  // Project load after proposed workout, recalculating monotony and strain.
  // Use 1/7 factor for 7-day exponentially weighted moving average of ATL.
  const projectedATL = metrics.atl + proposedTSS / 7;
  const projectedTSB = metrics.ctl - projectedATL;
  const projectedWeeklyTSS = weeklyTSS + proposedTSS;
  // Maintain 7-day rolling window: drop oldest day, add proposed workout
  const projectedDailyValues =
    last7Days.length >= 7 ? [...last7Days.slice(1), proposedTSS] : [...last7Days, proposedTSS];
  const projectedMonotony = calculateMonotony(projectedDailyValues);
  const projectedStrain = projectedMonotony * projectedWeeklyTSS;

  const projectedLoad: LoadMetrics = {
    weeklyTSS: projectedWeeklyTSS,
    ctl: metrics.ctl,
    atl: projectedATL,
    tsb: projectedTSB,
    rampRate: metrics.rampRate ?? 0,
    monotony: projectedMonotony,
    strain: projectedStrain,
  };

  // Check warnings against both current and projected load
  const warnings = checkLoadWarnings(currentLoad, projectedLoad, consecutiveHardDays);
  const risk = determineOvertrainingRisk(warnings);
  const recommendations = generateLoadRecommendations(warnings, risk);

  return {
    isValid: risk !== 'critical',
    risk,
    currentLoad,
    projectedLoad,
    warnings,
    recommendations,
  };
}

// =============================================================================
// WORKOUT MODIFICATION VALIDATION
// =============================================================================

/**
 * Context for workout modification validation
 */
export interface ModificationContext {
  readonly readiness?: ReadinessAssessment;
  readonly fatigue?: FatigueAssessment;
  readonly constraints?: readonly Constraint[];
  readonly recentActivities?: ReadonlyArray<{ readonly date: string; readonly intensity: string }>;
  readonly modificationReason?: ModificationReason;
}

/**
 * Count consecutive hard days (intensity at threshold or above) from most recent.
 */
function countConsecutiveHardDays(
  activities: ReadonlyArray<{ readonly date: string; readonly intensity: string }>
): number {
  // Sort by date descending (most recent first)
  const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date));

  let count = 0;
  for (const activity of sorted) {
    if (
      isWorkoutIntensity(activity.intensity) &&
      INTENSITY_ORDER[activity.intensity] >= INTENSITY_ORDER.threshold
    ) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Determine overall risk from modification warnings
 */
function determineModificationRisk(
  warnings: readonly ModificationWarning[]
): 'low' | 'moderate' | 'high' | 'critical' {
  const dangerCount = warnings.filter((w) => w.severity === 'danger').length;
  const warningCount = warnings.filter((w) => w.severity === 'warning').length;

  if (dangerCount >= 2) return 'critical';
  if (dangerCount >= 1) return 'high';
  if (warningCount >= 1) return 'moderate';
  return 'low';
}

/**
 * Build a safer alternative workout when the proposed modification is risky
 */
function buildSafeAlternative(
  original: ProposedWorkout,
  modified: ProposedWorkout,
  context: { readonly constraints?: readonly Constraint[] }
): ProposedWorkout {
  const originalLevel = INTENSITY_ORDER[original.intensity];

  // Step up one intensity level max from original, capped at threshold
  const safeIntensityLevel = Math.min(originalLevel + 1, INTENSITY_ORDER.threshold);
  const safeIntensity = WORKOUT_INTENSITIES[safeIntensityLevel] ?? original.intensity;

  // Cap duration increase at 25%
  const safeDuration = Math.min(
    modified.durationMinutes,
    Math.round(original.durationMinutes * 1.25)
  );

  // Keep original sport if modified sport has constraint issues
  let safeSport = modified.sport;
  if (context.constraints != null) {
    for (const c of context.constraints) {
      if (c.constraintType === 'injury' && c.injuryRestrictions?.includes(modified.sport)) {
        safeSport = original.sport;
        break;
      }
    }
  }

  // Estimate TSS proportionally, guarding against zero duration
  const safeTss =
    original.durationMinutes > 0
      ? Math.round(
          (original.estimatedTSS ?? 0) *
            (safeDuration / original.durationMinutes) *
            (1 + (safeIntensityLevel - originalLevel) * 0.15)
        )
      : modified.estimatedTSS;

  return {
    sport: safeSport,
    durationMinutes: safeDuration,
    intensity: safeIntensity,
    estimatedTSS: safeTss,
  };
}

// Check for intensity jump warnings
function checkIntensityJump(
  original: ProposedWorkout,
  modified: ProposedWorkout
): { warnings: ModificationWarning[]; recommendations: string[] } {
  const warnings: ModificationWarning[] = [];
  const recommendations: string[] = [];

  const originalLevel = INTENSITY_ORDER[original.intensity];
  const modifiedLevel = INTENSITY_ORDER[modified.intensity];
  const intensityJump = modifiedLevel - originalLevel;

  if (intensityJump >= 2) {
    warnings.push({
      type: 'intensity_jump',
      severity: intensityJump >= 3 ? 'danger' : 'warning',
      message: `Intensity jump from ${original.intensity} to ${modified.intensity} (${intensityJump} levels)`,
    });
    const suggestedIntensity = WORKOUT_INTENSITIES[originalLevel + 1] ?? modified.intensity;
    recommendations.push(`Consider stepping up gradually: try ${suggestedIntensity} instead`);
  }

  return { warnings, recommendations };
}

// Check for TSS load increase warnings
function checkTssIncrease(
  original: ProposedWorkout,
  modified: ProposedWorkout
): { warnings: ModificationWarning[] } {
  const warnings: ModificationWarning[] = [];

  const originalTss = original.estimatedTSS ?? 0;
  const modifiedTss = modified.estimatedTSS ?? 0;
  const tssIncrease = modifiedTss - originalTss;
  const tssIncreasePercent = originalTss > 0 ? (tssIncrease / originalTss) * 100 : 0;

  if (tssIncreasePercent > 50) {
    warnings.push({
      type: 'load_increase',
      severity: tssIncreasePercent > 100 ? 'danger' : 'warning',
      message: `TSS increase of ${Math.round(tssIncreasePercent)}% (${originalTss} → ${modifiedTss})`,
    });
  }

  return { warnings };
}

// Check for duration increase warnings
function checkDurationIncrease(
  original: ProposedWorkout,
  modified: ProposedWorkout
): { warnings: ModificationWarning[] } {
  const warnings: ModificationWarning[] = [];

  const durationIncreasePercent =
    original.durationMinutes > 0
      ? ((modified.durationMinutes - original.durationMinutes) / original.durationMinutes) * 100
      : 0;

  if (durationIncreasePercent > 50) {
    warnings.push({
      type: 'duration_increase',
      severity: durationIncreasePercent > 100 ? 'danger' : 'warning',
      message: `Duration increase of ${Math.round(durationIncreasePercent)}% (${original.durationMinutes} → ${modified.durationMinutes} min)`,
    });
  }

  return { warnings };
}

// Check readiness state interactions
function checkReadinessInteraction(
  original: ProposedWorkout,
  modified: ProposedWorkout,
  readiness: ReadinessAssessment
): { warnings: ModificationWarning[]; recommendations: string[] } {
  const warnings: ModificationWarning[] = [];
  const recommendations: string[] = [];

  const originalLevel = INTENSITY_ORDER[original.intensity];
  const modifiedLevel = INTENSITY_ORDER[modified.intensity];
  const intensityJump = modifiedLevel - originalLevel;

  if (readiness.readiness === 'red' && modifiedLevel > originalLevel) {
    warnings.push({
      type: 'fatigue_risk',
      severity: 'danger',
      message: 'Increasing intensity while readiness is RED (not ready to train hard)',
    });
    recommendations.push('Current readiness suggests rest or easy recovery session');
  } else if (readiness.readiness === 'yellow' && intensityJump >= 1) {
    warnings.push({
      type: 'fatigue_risk',
      severity: 'warning',
      message: 'Increasing intensity while readiness is YELLOW (limited capacity)',
    });
  }

  return { warnings, recommendations };
}

// Check fatigue level interactions
function checkFatigueInteraction(
  original: ProposedWorkout,
  modified: ProposedWorkout,
  fatigue: FatigueAssessment
): { warnings: ModificationWarning[]; recommendations: string[] } {
  const warnings: ModificationWarning[] = [];
  const recommendations: string[] = [];

  const originalTss = original.estimatedTSS ?? 0;
  const modifiedTss = modified.estimatedTSS ?? 0;
  const tssIncreasePercent =
    originalTss > 0 ? ((modifiedTss - originalTss) / originalTss) * 100 : 0;

  if (fatigue.level === 'critical' && modifiedTss > originalTss) {
    warnings.push({
      type: 'fatigue_risk',
      severity: 'danger',
      message: 'Increasing load with CRITICAL fatigue level',
    });
    recommendations.push('Take a rest day or do a very easy recovery session');
  } else if (fatigue.level === 'high' && tssIncreasePercent > 25) {
    warnings.push({
      type: 'fatigue_risk',
      severity: 'warning',
      message: 'Significant load increase with HIGH fatigue',
    });
  }

  return { warnings, recommendations };
}

// Check a single injury constraint for sport/intensity violations
function checkInjuryConstraintForModification(
  constraint: Constraint,
  modifiedSport: string,
  modifiedLevel: number
): ModificationWarning[] {
  if (constraint.constraintType !== 'injury' || constraint.injuryRestrictions == null) {
    return [];
  }

  const warnings: ModificationWarning[] = [];

  if (constraint.injuryRestrictions.includes(modifiedSport)) {
    warnings.push({
      type: 'constraint_violation',
      severity: 'danger',
      message: `${modifiedSport} is restricted due to ${constraint.injuryBodyPart ?? 'injury'} injury`,
    });
  }

  if (
    constraint.injuryRestrictions.includes('high_intensity') &&
    modifiedLevel >= INTENSITY_ORDER.threshold
  ) {
    warnings.push({
      type: 'constraint_violation',
      severity: constraint.injurySeverity === 'severe' ? 'danger' : 'warning',
      message:
        `High intensity restricted due to ${constraint.injurySeverity ?? ''} ${constraint.injuryBodyPart ?? ''} injury`.trim(),
    });
  }

  return warnings;
}

// Check constraint violations for sport changes
function checkConstraintViolations(
  original: ProposedWorkout,
  modified: ProposedWorkout,
  constraints: readonly Constraint[]
): { warnings: ModificationWarning[] } {
  if (original.sport === modified.sport) {
    return { warnings: [] };
  }

  const modifiedLevel = INTENSITY_ORDER[modified.intensity];
  const warnings = constraints.flatMap((c) =>
    checkInjuryConstraintForModification(c, modified.sport, modifiedLevel)
  );

  return { warnings };
}

// Check consecutive hard days
function checkConsecutiveHardDaysForModification(
  modified: ProposedWorkout,
  recentActivities: ReadonlyArray<{ readonly date: string; readonly intensity: string }>
): { warnings: ModificationWarning[]; recommendations: string[] } {
  const warnings: ModificationWarning[] = [];
  const recommendations: string[] = [];

  const modifiedLevel = INTENSITY_ORDER[modified.intensity];

  if (modifiedLevel >= INTENSITY_ORDER.threshold) {
    const recentHardDays = countConsecutiveHardDays(recentActivities);
    if (recentHardDays >= LOAD_THRESHOLDS.MAX_CONSECUTIVE_HARD_DAYS) {
      warnings.push({
        type: 'consecutive_hard_days',
        severity: 'danger',
        message: `${recentHardDays} consecutive hard days already — adding another high-intensity session`,
      });
      recommendations.push('Insert a recovery day before the next hard session');
    }
  }

  return { warnings, recommendations };
}

/**
 * Validate proposed modifications to an existing workout for safety.
 * Compares original vs. modified workout considering the athlete's
 * readiness, fatigue, injuries, and recent training history.
 */
export function validateWorkoutModification(
  original: ProposedWorkout,
  modified: ProposedWorkout,
  context: ModificationContext = {}
): WorkoutModificationValidation {
  const warnings: ModificationWarning[] = [];
  const recommendations: string[] = [];

  // 1. Intensity jump
  const intensityResult = checkIntensityJump(original, modified);
  warnings.push(...intensityResult.warnings);
  recommendations.push(...intensityResult.recommendations);

  // 2. TSS increase
  const tssResult = checkTssIncrease(original, modified);
  warnings.push(...tssResult.warnings);

  // 3. Duration increase
  const durationResult = checkDurationIncrease(original, modified);
  warnings.push(...durationResult.warnings);

  // 4. Readiness interaction
  if (context.readiness != null) {
    const readinessResult = checkReadinessInteraction(original, modified, context.readiness);
    warnings.push(...readinessResult.warnings);
    recommendations.push(...readinessResult.recommendations);
  }

  // 5. Fatigue interaction
  if (context.fatigue != null) {
    const fatigueResult = checkFatigueInteraction(original, modified, context.fatigue);
    warnings.push(...fatigueResult.warnings);
    recommendations.push(...fatigueResult.recommendations);
  }

  // 6. Constraint violations for sport change
  if (context.constraints != null) {
    const constraintResult = checkConstraintViolations(original, modified, context.constraints);
    warnings.push(...constraintResult.warnings);
  }

  // 7. Consecutive hard days
  if (context.recentActivities != null) {
    const hardDaysResult = checkConsecutiveHardDaysForModification(
      modified,
      context.recentActivities
    );
    warnings.push(...hardDaysResult.warnings);
    recommendations.push(...hardDaysResult.recommendations);
  }

  // Determine overall risk
  const risk = determineModificationRisk(warnings);
  const isValid = risk !== 'critical';

  // Suggest safe alternative if risky
  let suggestedModification: ProposedWorkout | undefined;
  if (risk === 'high' || risk === 'critical') {
    suggestedModification = buildSafeAlternative(original, modified, context);
  }

  return { isValid, risk, warnings, recommendations, suggestedModification };
}
