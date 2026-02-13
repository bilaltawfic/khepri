# P4-B-01: Implement Training Load Validation

## Goal

Enhance the existing safety tools in `@khepri/ai-client` to implement comprehensive training load validation. This will flag overtraining risks before they happen by analyzing:
- Proposed workout load vs. current fatigue state
- Historical training load trends
- Recovery signals from wellness data
- Constraint violations

The validator will be used by the AI orchestrator to proactively check recommendations before presenting them to athletes.

## Dependencies

None - builds on existing `@khepri/ai-client` safety-tools.ts

## Files to Create/Modify

### Modified Files
- `packages/ai-client/src/tools/safety-tools.ts` - Add training load validation
- `packages/ai-client/src/types.ts` - Add new types for validation results
- `packages/ai-client/src/tools/index.ts` - Export new functions
- `packages/ai-client/src/__tests__/safety-tools.test.ts` - Add comprehensive tests

## Implementation Steps

### Step 1: Add Types for Training Load Validation

Add to `packages/ai-client/src/types.ts`:

```typescript
// =============================================================================
// TRAINING LOAD VALIDATION TYPES
// =============================================================================

export type OvertrainingRisk = 'low' | 'moderate' | 'high' | 'critical';

/**
 * Result of training load validation
 */
export interface TrainingLoadValidation {
  isValid: boolean;
  risk: OvertrainingRisk;
  currentLoad: LoadMetrics;
  projectedLoad?: LoadMetrics;
  warnings: LoadWarning[];
  recommendations: string[];
}

export interface LoadMetrics {
  weeklyTSS: number;
  ctl: number;
  atl: number;
  tsb: number;
  rampRate: number;
  monotony?: number; // training variability score
  strain?: number; // monotony * weekly load
}

export interface LoadWarning {
  type: 'overreaching' | 'ramp_rate' | 'monotony' | 'strain' | 'consecutive_hard';
  severity: 'info' | 'warning' | 'danger';
  message: string;
  metric?: string;
  threshold?: number;
  actual?: number;
}

/**
 * Input for validating a proposed workout
 */
export interface ProposedWorkout {
  sport: Exclude<WorkoutSport, 'rest'>;
  durationMinutes: number;
  intensity: WorkoutIntensity;
  estimatedTSS?: number;
}

/**
 * Historical training data for validation context
 */
export interface TrainingHistory {
  /**
   * Daily aggregated training load.
   * - `date` must be in `YYYY-MM-DD` format (no time/timezone).
   * - Each entry represents the total TSS for that calendar day.
   * - At most one entry per date.
   */
  activities: ReadonlyArray<{
    date: string;
    tss: number;
    intensity: string;
  }>;
  fitnessMetrics: FitnessMetrics;
  wellnessData?: WellnessData[];
}
```

### Step 2: Implement Training Load Validator

Add to `packages/ai-client/src/tools/safety-tools.ts`:

```typescript
import type {
  LoadMetrics,
  LoadWarning,
  OvertrainingRisk,
  ProposedWorkout,
  TrainingHistory,
  TrainingLoadValidation,
} from '../types.js';

// =============================================================================
// TRAINING LOAD VALIDATION CONSTANTS
// =============================================================================

/**
 * Safe training load thresholds based on sports science research
 */
const LOAD_THRESHOLDS = {
  // TSB (form) thresholds
  TSB_CRITICAL: -40,
  TSB_HIGH_FATIGUE: -25,
  TSB_OVERREACHING: -30,

  // Ramp rate (CTL change per week)
  RAMP_RATE_SAFE: 5,
  RAMP_RATE_AGGRESSIVE: 8,
  RAMP_RATE_DANGEROUS: 10,

  // Weekly TSS relative to CTL
  WEEKLY_TSS_SAFE_MULTIPLIER: 1.2, // Weekly TSS should be < CTL * 7 * 1.2
  WEEKLY_TSS_HIGH_MULTIPLIER: 1.4,

  // Monotony (lack of training variability)
  MONOTONY_SAFE: 1.5,
  MONOTONY_HIGH: 2.0,

  // Strain (monotony * weekly load)
  STRAIN_SAFE: 1000,
  STRAIN_HIGH: 1500,
  STRAIN_CRITICAL: 2000,

  // Consecutive hard days
  MAX_CONSECUTIVE_HARD_DAYS: 2,
} as const;

// TSS estimates by intensity when not provided
const TSS_ESTIMATES: Record<string, number> = {
  recovery: 20,
  easy: 40,
  moderate: 60,
  tempo: 80,
  threshold: 100,
  vo2max: 120,
  sprint: 140,
};

// =============================================================================
// TRAINING LOAD VALIDATION TOOL
// =============================================================================

export const VALIDATE_TRAINING_LOAD_TOOL: Tool = {
  name: 'validate_training_load',
  description: `Validate a proposed workout against the athlete's current training load and recovery state.
Returns whether the workout is safe, risk level, and any warnings about overtraining.
MUST be called before recommending any workout to ensure athlete safety.`,
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
    required: ['current_ctl', 'current_atl', 'current_tsb'],
  },
};

// =============================================================================
// VALIDATION IMPLEMENTATION
// =============================================================================

/**
 * Calculate monotony score (lack of variability in training)
 * Lower is better - high monotony increases injury/illness risk
 */
function calculateMonotony(dailyTssValues: number[]): number {
  if (dailyTssValues.length < 2) return 0;

  const mean = dailyTssValues.reduce((a, b) => a + b, 0) / dailyTssValues.length;
  if (mean === 0) return 0;

  const variance =
    dailyTssValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    dailyTssValues.length;
  const stdDev = Math.sqrt(variance);

  // Monotony = mean / stdDev
  // If stdDev is 0 (all same values), return high monotony
  return stdDev === 0 ? 3.0 : mean / stdDev;
}

/**
 * Estimate TSS for a workout based on intensity and duration
 */
function estimateTSS(workout: ProposedWorkout): number {
  if (workout.estimatedTSS != null) return workout.estimatedTSS;

  const baseTSS = TSS_ESTIMATES[workout.intensity] ?? 60;
  // Scale by duration (base estimates are for 60 min)
  return Math.round((baseTSS * workout.durationMinutes) / 60);
}

/**
 * Check for specific warning conditions
 */
function checkWarnings(
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

  // Check monotony
  if (current.monotony != null && current.monotony > LOAD_THRESHOLDS.MONOTONY_HIGH) {
    warnings.push({
      type: 'monotony',
      severity: 'warning',
      message: 'Training lacks variability - increase rest day variety',
      metric: 'Monotony',
      threshold: LOAD_THRESHOLDS.MONOTONY_HIGH,
      actual: current.monotony,
    });
  }

  // Check strain
  if (current.strain != null && current.strain > LOAD_THRESHOLDS.STRAIN_CRITICAL) {
    warnings.push({
      type: 'strain',
      severity: 'danger',
      message: 'Training strain critically high - mandatory rest recommended',
      metric: 'Strain',
      threshold: LOAD_THRESHOLDS.STRAIN_CRITICAL,
      actual: current.strain,
    });
  } else if (current.strain != null && current.strain > LOAD_THRESHOLDS.STRAIN_HIGH) {
    warnings.push({
      type: 'strain',
      severity: 'warning',
      message: 'Training strain elevated - consider lighter week',
      metric: 'Strain',
      threshold: LOAD_THRESHOLDS.STRAIN_HIGH,
      actual: current.strain,
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
function determineRisk(warnings: LoadWarning[]): OvertrainingRisk {
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
function generateRecommendations(
  warnings: LoadWarning[],
  risk: OvertrainingRisk
): string[] {
  const recommendations: string[] = [];

  if (risk === 'critical') {
    recommendations.push('Take a full rest day or very light recovery activity only');
    recommendations.push('Review training load over the past 2 weeks');
  }

  if (warnings.some((w) => w.type === 'ramp_rate')) {
    recommendations.push('Reduce weekly training volume by 10-15%');
    recommendations.push('Add an extra recovery day this week');
  }

  if (warnings.some((w) => w.type === 'monotony')) {
    recommendations.push('Vary workout intensities more throughout the week');
    recommendations.push('Include both easy and hard days rather than all moderate');
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
 * Validate a proposed workout against current training load
 */
export function validateTrainingLoad(
  proposed: ProposedWorkout,
  history: TrainingHistory,
  consecutiveHardDays = 0
): TrainingLoadValidation {
  const proposedTSS = estimateTSS(proposed);
  const metrics = history.fitnessMetrics;

  // Calculate current load metrics
  const last7Days = history.activities
    .filter((a) => {
      const activityDate = new Date(a.date);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return activityDate >= sevenDaysAgo;
    })
    .map((a) => a.tss);

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

  // Project load after proposed workout
  const projectedATL = metrics.atl + proposedTSS * 0.1; // Simplified ATL projection
  const projectedTSB = metrics.ctl - projectedATL;

  const projectedLoad: LoadMetrics = {
    weeklyTSS: weeklyTSS + proposedTSS,
    ctl: metrics.ctl, // CTL doesn't change much day-to-day
    atl: projectedATL,
    tsb: projectedTSB,
    rampRate: metrics.rampRate ?? 0,
    monotony,
    strain,
  };

  // Check for warnings
  const warnings = checkWarnings(currentLoad, projectedLoad, consecutiveHardDays);
  const risk = determineRisk(warnings);
  const recommendations = generateRecommendations(warnings, risk);

  return {
    isValid: risk !== 'critical',
    risk,
    currentLoad,
    projectedLoad,
    warnings,
    recommendations,
  };
}
```

### Step 3: Export New Functions

Update `packages/ai-client/src/tools/index.ts`:

```typescript
export {
  // Existing exports
  CHECK_TRAINING_READINESS_TOOL,
  CHECK_FATIGUE_LEVEL_TOOL,
  CHECK_CONSTRAINT_COMPATIBILITY_TOOL,
  SAFETY_TOOLS,
  checkTrainingReadiness,
  checkFatigueLevel,
  checkConstraintCompatibility,
  // New exports
  VALIDATE_TRAINING_LOAD_TOOL,
  validateTrainingLoad,
  type TrainingReadiness,
  type ReadinessAssessment,
  type FatigueAssessment,
  type ConstraintCompatibility,
} from './safety-tools.js';
```

## Testing Requirements

### Unit Tests

Add to `packages/ai-client/src/__tests__/safety-tools.test.ts`:

```typescript
import {
  validateTrainingLoad,
  type ProposedWorkout,
  type TrainingHistory,
} from '../tools/safety-tools.js';

describe('validateTrainingLoad', () => {
  const baseHistory: TrainingHistory = {
    activities: [
      { date: '2026-02-12', tss: 80, intensity: 'moderate' },
      { date: '2026-02-11', tss: 100, intensity: 'threshold' },
      { date: '2026-02-10', tss: 40, intensity: 'easy' },
      { date: '2026-02-09', tss: 0, intensity: 'rest' },
      { date: '2026-02-08', tss: 90, intensity: 'tempo' },
      { date: '2026-02-07', tss: 60, intensity: 'moderate' },
      { date: '2026-02-06', tss: 50, intensity: 'easy' },
    ],
    fitnessMetrics: {
      date: '2026-02-13',
      ctl: 70,
      atl: 85,
      tsb: -15,
      rampRate: 4,
    },
  };

  it('returns low risk for moderate workout with good recovery', () => {
    const workout: ProposedWorkout = {
      sport: 'bike',
      durationMinutes: 60,
      intensity: 'moderate',
      estimatedTSS: 60,
    };

    const result = validateTrainingLoad(workout, baseHistory);

    expect(result.isValid).toBe(true);
    expect(result.risk).toBe('low');
    expect(result.warnings).toHaveLength(0);
  });

  it('returns critical risk when TSB is already very negative', () => {
    const fatigued: TrainingHistory = {
      ...baseHistory,
      fitnessMetrics: {
        ...baseHistory.fitnessMetrics,
        tsb: -35,
        atl: 110,
      },
    };

    const workout: ProposedWorkout = {
      sport: 'run',
      durationMinutes: 90,
      intensity: 'threshold',
      estimatedTSS: 120,
    };

    const result = validateTrainingLoad(workout, fatigued);

    expect(result.isValid).toBe(false);
    expect(result.risk).toBe('critical');
    expect(result.warnings.some((w) => w.type === 'overreaching')).toBe(true);
  });

  it('warns about high ramp rate', () => {
    const rampingHistory: TrainingHistory = {
      ...baseHistory,
      fitnessMetrics: {
        ...baseHistory.fitnessMetrics,
        rampRate: 9,
      },
    };

    const workout: ProposedWorkout = {
      sport: 'bike',
      durationMinutes: 60,
      intensity: 'moderate',
    };

    const result = validateTrainingLoad(workout, rampingHistory);

    expect(result.warnings.some((w) => w.type === 'ramp_rate')).toBe(true);
  });

  it('warns about consecutive hard days', () => {
    const workout: ProposedWorkout = {
      sport: 'run',
      durationMinutes: 60,
      intensity: 'threshold',
    };

    const result = validateTrainingLoad(workout, baseHistory, 2);

    expect(result.warnings.some((w) => w.type === 'consecutive_hard')).toBe(true);
  });

  it('estimates TSS when not provided', () => {
    const workout: ProposedWorkout = {
      sport: 'bike',
      durationMinutes: 90, // 1.5x duration
      intensity: 'threshold', // base 100 TSS
    };

    const result = validateTrainingLoad(workout, baseHistory);

    // Should estimate ~150 TSS (100 * 90/60)
    expect(result.projectedLoad).toBeDefined();
  });

  it('detects high monotony when training lacks variability', () => {
    const monotonousHistory: TrainingHistory = {
      ...baseHistory,
      activities: [
        // All moderate - no variability
        { date: '2026-02-12', tss: 60, intensity: 'moderate' },
        { date: '2026-02-11', tss: 60, intensity: 'moderate' },
        { date: '2026-02-10', tss: 60, intensity: 'moderate' },
        { date: '2026-02-09', tss: 60, intensity: 'moderate' },
        { date: '2026-02-08', tss: 60, intensity: 'moderate' },
        { date: '2026-02-07', tss: 60, intensity: 'moderate' },
        { date: '2026-02-06', tss: 60, intensity: 'moderate' },
      ],
    };

    const workout: ProposedWorkout = {
      sport: 'bike',
      durationMinutes: 60,
      intensity: 'moderate',
    };

    const result = validateTrainingLoad(workout, monotonousHistory);

    expect(result.currentLoad.monotony).toBeGreaterThan(2.0);
    expect(result.warnings.some((w) => w.type === 'monotony')).toBe(true);
  });
});
```

## Verification Checklist

- [ ] All new types are exported from index.ts
- [ ] `validateTrainingLoad` correctly calculates risk levels
- [ ] TSS estimation works for all intensity levels
- [ ] Monotony calculation handles edge cases (0 values, single day)
- [ ] Warnings include all required fields (type, severity, message)
- [ ] Recommendations are actionable and specific
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Linting passes

## Integration with AI Orchestrator

Once completed, the orchestrator (P4-A-01) should call `validateTrainingLoad` before presenting any workout recommendation:

```typescript
// In ai-orchestrator, after generating workout recommendation:
const validation = validateTrainingLoad(
  proposedWorkout,
  athleteHistory,
  consecutiveHardDays
);

if (!validation.isValid) {
  // Return safety warnings instead of workout
  return {
    content: formatSafetyResponse(validation),
    safetyIntervention: true,
  };
}

// If valid, include warnings in response context
```

## PR Checklist

- [ ] Add conversation log to `claude-convos/`
- [ ] Ensure all tests pass (`pnpm test`)
- [ ] Run `pnpm lint`
- [ ] Keep PR focused on validation logic (injury awareness is P4-B-02)
