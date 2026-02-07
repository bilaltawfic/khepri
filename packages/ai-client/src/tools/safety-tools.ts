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
        enum: ['recovery', 'easy', 'moderate', 'tempo', 'threshold', 'vo2max'],
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
  let score = 100;

  // Sleep analysis
  if (checkIn.sleepHours !== undefined) {
    if (checkIn.sleepHours < 5) {
      score -= 30;
      concerns.push('Very low sleep duration (<5 hours)');
      recommendations.push('Consider rest day or very light activity only');
    } else if (checkIn.sleepHours < 6) {
      score -= 15;
      concerns.push('Low sleep duration (<6 hours)');
      recommendations.push('Reduce workout intensity');
    } else if (checkIn.sleepHours < 7) {
      score -= 5;
    }
  }

  if (checkIn.sleepQuality !== undefined) {
    if (checkIn.sleepQuality <= 4) {
      score -= 20;
      concerns.push('Poor sleep quality');
      recommendations.push('Avoid high-intensity training');
    } else if (checkIn.sleepQuality <= 6) {
      score -= 10;
    }
  }

  // Energy analysis
  if (checkIn.energyLevel !== undefined) {
    if (checkIn.energyLevel <= 3) {
      score -= 25;
      concerns.push('Very low energy');
      recommendations.push('Rest or very light activity recommended');
    } else if (checkIn.energyLevel <= 5) {
      score -= 10;
      concerns.push('Below normal energy');
    }
  }

  // Stress analysis
  if (checkIn.stressLevel !== undefined) {
    if (checkIn.stressLevel >= 9) {
      score -= 25;
      concerns.push('Extremely high stress');
      recommendations.push('Training may add stress - consider rest or light activity');
    } else if (checkIn.stressLevel >= 7) {
      score -= 10;
      concerns.push('Elevated stress level');
    }
  }

  // Soreness analysis
  if (checkIn.overallSoreness !== undefined) {
    if (checkIn.overallSoreness >= 8) {
      score -= 20;
      concerns.push('High muscle soreness');
      recommendations.push('Avoid loading sore muscles - consider recovery day');
    } else if (checkIn.overallSoreness >= 6) {
      score -= 10;
      concerns.push('Moderate soreness');
    }
  }

  // Heart rate analysis
  if (checkIn.restingHr !== undefined && baselineRhr !== undefined) {
    const hrDiff = checkIn.restingHr - baselineRhr;
    if (hrDiff > 10) {
      score -= 25;
      concerns.push(`Resting HR significantly elevated (+${hrDiff} bpm)`);
      recommendations.push('Elevated HR may indicate illness, stress, or overtraining');
    } else if (hrDiff > 5) {
      score -= 10;
      concerns.push(`Resting HR elevated (+${hrDiff} bpm)`);
    }
  }

  // HRV analysis
  if (checkIn.hrvMs !== undefined && baselineHrv !== undefined) {
    const hrvPercentDiff = ((baselineHrv - checkIn.hrvMs) / baselineHrv) * 100;
    if (hrvPercentDiff > 20) {
      score -= 20;
      concerns.push(`HRV significantly below baseline (-${hrvPercentDiff.toFixed(0)}%)`);
      recommendations.push('Low HRV suggests recovery deficit');
    } else if (hrvPercentDiff > 10) {
      score -= 10;
      concerns.push(`HRV below baseline (-${hrvPercentDiff.toFixed(0)}%)`);
    }
  }

  // Determine readiness level
  let readiness: TrainingReadiness;
  if (score >= 70) {
    readiness = 'green';
  } else if (score >= 40) {
    readiness = 'yellow';
    if (recommendations.length === 0) {
      recommendations.push('Consider reduced volume or intensity');
    }
  } else {
    readiness = 'red';
    if (recommendations.length === 0) {
      recommendations.push('Rest day or very light recovery activity only');
    }
  }

  return {
    readiness,
    score: Math.max(0, score),
    concerns,
    recommendations,
  };
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

/**
 * Check if a workout is compatible with active constraints
 */
export function checkConstraintCompatibility(
  workout: {
    sport: 'swim' | 'bike' | 'run' | 'strength';
    durationMinutes: number;
    intensity: string;
  },
  context: CoachingContext
): ConstraintCompatibility {
  const issues: string[] = [];
  const modifications: string[] = [];

  // Check time availability
  if (
    context.checkIn?.availableTimeMinutes !== undefined &&
    workout.durationMinutes > context.checkIn.availableTimeMinutes
  ) {
    issues.push(
      `Workout (${workout.durationMinutes} min) exceeds available time (${context.checkIn.availableTimeMinutes} min)`
    );
    modifications.push(`Reduce workout to ${context.checkIn.availableTimeMinutes} minutes`);
  }

  // Check equipment access
  const equipmentNeeded: Record<string, string[]> = {
    swim: ['pool', 'swim_goggles'],
    bike: ['bike', 'bike_trainer'],
    run: ['running_shoes'],
    strength: ['gym', 'weights'],
  };

  const neededEquipment = equipmentNeeded[workout.sport] ?? [];
  const availableEquipment = context.checkIn?.equipmentAccess ?? [];

  if (neededEquipment.length > 0 && availableEquipment.length > 0) {
    const hasEquipment = neededEquipment.some((eq) =>
      availableEquipment.some((avail) => avail.toLowerCase().includes(eq.toLowerCase()))
    );

    if (!hasEquipment) {
      issues.push(`Required equipment for ${workout.sport} may not be available`);
      modifications.push('Consider alternative sport with available equipment');
    }
  }

  // Check injury constraints
  for (const constraint of context.constraints) {
    if (constraint.constraintType === 'injury' && constraint.status === 'active') {
      const injury = constraint as import('../types.js').InjuryConstraint;

      // Check if sport is restricted
      if (injury.injuryRestrictions?.includes(workout.sport)) {
        issues.push(`${workout.sport} is restricted due to ${injury.title}`);
        modifications.push(`Avoid ${workout.sport} until injury resolves`);
      }

      // Check if high intensity is restricted
      if (
        injury.injuryRestrictions?.includes('high_intensity') &&
        ['threshold', 'vo2max', 'sprint'].includes(workout.intensity)
      ) {
        issues.push(`High intensity restricted due to ${injury.title}`);
        modifications.push('Reduce intensity to moderate or below');
      }

      // Check if impact is restricted (affects running)
      if (injury.injuryRestrictions?.includes('impact') && workout.sport === 'run') {
        issues.push(`Running (impact) restricted due to ${injury.title}`);
        modifications.push('Consider swimming or cycling instead');
      }
    }
  }

  // Check travel constraints
  if (context.checkIn?.travelStatus === 'traveling') {
    if (workout.sport === 'swim' && !availableEquipment.includes('pool')) {
      issues.push('Pool access uncertain while traveling');
      modifications.push('Confirm pool access or choose alternative');
    }

    if (workout.sport === 'bike' && !availableEquipment.includes('bike')) {
      issues.push('Bike access uncertain while traveling');
      modifications.push('Consider running or hotel gym workout');
    }
  }

  return {
    compatible: issues.length === 0,
    issues,
    modifications,
  };
}
