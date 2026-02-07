/**
 * Safety Tools
 *
 * Tools for checking training safety and identifying potential risks.
 * These tools help Claude make safer training recommendations.
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { CoachingContext, DailyCheckIn, FitnessMetrics } from '../types.js';

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
 * All safety tools
 */
export const SAFETY_TOOLS: Tool[] = [
  CHECK_TRAINING_READINESS_TOOL,
  CHECK_FATIGUE_LEVEL_TOOL,
  CHECK_CONSTRAINT_COMPATIBILITY_TOOL,
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
    recommendations.push('Mandatory rest or very light recovery only');
    recommendations.push('Risk of overtraining syndrome if continued');
  } else if (metrics.tsb < -25) {
    level = 'high';
    concerns.push('High fatigue (TSB < -25)');
    recommendations.push('Reduce training load');
    recommendations.push('Prioritize recovery activities');
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

const HIGH_INTENSITY_LEVELS = ['threshold', 'vo2max', 'sprint'];

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

  if (
    restrictions.includes('high_intensity') &&
    HIGH_INTENSITY_LEVELS.includes(workout.intensity)
  ) {
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
      const result = checkSingleInjuryConstraint(
        workout,
        constraint as import('../types.js').InjuryConstraint
      );
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
