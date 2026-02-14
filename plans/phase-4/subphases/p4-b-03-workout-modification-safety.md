# P4-B-03: Implement Workout Modification Safety Checks

## Goal

Add a `validate_workout_modification` safety tool that checks whether proposed changes to an existing workout are safe, given the athlete's current fatigue state, injuries, and training load. This prevents athletes from making dangerous workout modifications (e.g., doubling intensity when already fatigued).

## Current State

- `safety-tools.ts` has 4 safety tools: `checkTrainingReadiness`, `checkFatigueLevel`, `checkConstraintCompatibility`, `validateTrainingLoad`
- These tools validate individual workouts but don't compare original vs. modified workouts
- No tool exists to assess the safety of *changes* to a planned workout
- The AI orchestrator has tool execution but no workout modification validation

## Target State

- New `VALIDATE_WORKOUT_MODIFICATION_TOOL` definition for Claude tool use
- `validateWorkoutModification()` function that compares original vs. modified workout
- Reuses existing safety checks as building blocks
- Returns structured validation with risk level, warnings, and safe alternatives
- Exported and available for AI orchestrator integration

## Files to Modify

| File | Changes |
|------|---------|
| `packages/ai-client/src/tools/safety-tools.ts` | Add tool definition + implementation function |
| `packages/ai-client/src/tools/index.ts` | Export new tool and function |
| `packages/ai-client/src/types.ts` | Add `WorkoutModificationValidation` and related types |
| `packages/ai-client/src/__tests__/safety-tools.test.ts` | Add comprehensive test suite for new function |

## Implementation Steps

### Step 1: Add Types (`types.ts`)

Add types for workout modification validation:

```typescript
// ====== Workout Modification Types ======

export interface ProposedWorkout {
  sport: string;
  duration_minutes: number;
  intensity: WorkoutIntensity;
  estimated_tss: number;
}

export type WorkoutIntensity = 'recovery' | 'easy' | 'moderate' | 'threshold' | 'vo2max' | 'sprint';

export const WORKOUT_INTENSITIES = ['recovery', 'easy', 'moderate', 'threshold', 'vo2max', 'sprint'] as const;

export function isWorkoutIntensity(value: unknown): value is WorkoutIntensity {
  return typeof value === 'string' && WORKOUT_INTENSITIES.includes(value as WorkoutIntensity);
}

export const INTENSITY_ORDER: Record<WorkoutIntensity, number> = {
  recovery: 0,
  easy: 1,
  moderate: 2,
  threshold: 3,
  vo2max: 4,
  sprint: 5,
};

export type ModificationReason =
  | 'feeling_good'
  | 'feeling_bad'
  | 'time_constraint'
  | 'equipment_unavailable'
  | 'weather'
  | 'other';

export interface WorkoutModificationValidation {
  readonly isValid: boolean;
  readonly risk: 'low' | 'moderate' | 'high' | 'critical';
  readonly warnings: readonly ModificationWarning[];
  readonly recommendations: readonly string[];
  readonly suggestedModification?: ProposedWorkout;
}

export interface ModificationWarning {
  readonly type: ModificationWarningType;
  readonly severity: 'info' | 'warning' | 'danger';
  readonly message: string;
}

export type ModificationWarningType =
  | 'intensity_jump'
  | 'load_increase'
  | 'constraint_violation'
  | 'fatigue_risk'
  | 'consecutive_hard_days'
  | 'duration_increase';
```

### Step 2: Add Tool Definition (`safety-tools.ts`)

```typescript
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
          intensity: { type: 'string', description: 'Intensity level: recovery, easy, moderate, threshold, vo2max, sprint' },
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
        description: 'Why the athlete wants to modify: feeling_good, feeling_bad, time_constraint, equipment_unavailable, weather, other',
      },
    },
    required: ['original_workout', 'modified_workout'],
  },
};
```

### Step 3: Implement Validation Function (`safety-tools.ts`)

```typescript
export function validateWorkoutModification(
  original: ProposedWorkout,
  modified: ProposedWorkout,
  context: {
    readiness?: ReadinessAssessment;
    fatigue?: FatigueAssessment;
    constraints?: Constraint[];
    recentActivities?: Activity[];
    modificationReason?: ModificationReason;
  },
): WorkoutModificationValidation {
  const warnings: ModificationWarning[] = [];
  const recommendations: string[] = [];

  // 1. Check intensity jump
  const originalLevel = INTENSITY_ORDER[original.intensity];
  const modifiedLevel = INTENSITY_ORDER[modified.intensity];
  const intensityJump = modifiedLevel - originalLevel;

  if (intensityJump >= 2) {
    warnings.push({
      type: 'intensity_jump',
      severity: intensityJump >= 3 ? 'danger' : 'warning',
      message: `Intensity jump from ${original.intensity} to ${modified.intensity} (${intensityJump} levels)`,
    });
    recommendations.push(
      `Consider stepping up gradually: try ${WORKOUT_INTENSITIES[originalLevel + 1]} instead`,
    );
  }

  // 2. Check TSS increase
  const tssIncrease = modified.estimated_tss - original.estimated_tss;
  const tssIncreasePercent = original.estimated_tss > 0
    ? (tssIncrease / original.estimated_tss) * 100
    : 0;

  if (tssIncreasePercent > 50) {
    warnings.push({
      type: 'load_increase',
      severity: tssIncreasePercent > 100 ? 'danger' : 'warning',
      message: `TSS increase of ${Math.round(tssIncreasePercent)}% (${original.estimated_tss} → ${modified.estimated_tss})`,
    });
  }

  // 3. Check duration increase
  const durationIncrease = modified.duration_minutes - original.duration_minutes;
  const durationIncreasePercent = original.duration_minutes > 0
    ? (durationIncrease / original.duration_minutes) * 100
    : 0;

  if (durationIncreasePercent > 50) {
    warnings.push({
      type: 'duration_increase',
      severity: durationIncreasePercent > 100 ? 'danger' : 'warning',
      message: `Duration increase of ${Math.round(durationIncreasePercent)}% (${original.duration_minutes} → ${modified.duration_minutes} min)`,
    });
  }

  // 4. Check against readiness state
  if (context.readiness != null) {
    if (context.readiness.status === 'red' && modifiedLevel > originalLevel) {
      warnings.push({
        type: 'fatigue_risk',
        severity: 'danger',
        message: 'Increasing intensity while readiness is RED (not ready to train hard)',
      });
      recommendations.push('Current readiness suggests rest or easy recovery session');
    } else if (context.readiness.status === 'yellow' && intensityJump >= 1) {
      warnings.push({
        type: 'fatigue_risk',
        severity: 'warning',
        message: 'Increasing intensity while readiness is YELLOW (limited capacity)',
      });
    }
  }

  // 5. Check against fatigue level
  if (context.fatigue != null) {
    if (context.fatigue.level === 'critical' && modified.estimated_tss > original.estimated_tss) {
      warnings.push({
        type: 'fatigue_risk',
        severity: 'danger',
        message: 'Increasing load with CRITICAL fatigue level',
      });
      recommendations.push('Take a rest day or do a very easy recovery session');
    } else if (context.fatigue.level === 'high' && tssIncreasePercent > 25) {
      warnings.push({
        type: 'fatigue_risk',
        severity: 'warning',
        message: 'Significant load increase with HIGH fatigue',
      });
    }
  }

  // 6. Check constraint compatibility for sport change
  if (original.sport !== modified.sport && context.constraints != null) {
    for (const constraint of context.constraints) {
      if (constraint.constraintType === 'injury' && constraint.injuryRestrictions != null) {
        if (constraint.injuryRestrictions.includes(modified.sport)) {
          warnings.push({
            type: 'constraint_violation',
            severity: 'danger',
            message: `${modified.sport} is restricted due to ${constraint.injuryBodyPart ?? 'injury'} injury`,
          });
        }
        if (
          constraint.injuryRestrictions.includes('high_intensity') &&
          modifiedLevel >= INTENSITY_ORDER.threshold
        ) {
          warnings.push({
            type: 'constraint_violation',
            severity: constraint.injurySeverity === 'severe' ? 'danger' : 'warning',
            message: `High intensity restricted due to ${constraint.injurySeverity ?? ''} ${constraint.injuryBodyPart ?? ''} injury`,
          });
        }
      }
    }
  }

  // 7. Check consecutive hard days
  if (context.recentActivities != null && modifiedLevel >= INTENSITY_ORDER.threshold) {
    const recentHardDays = countConsecutiveHardDays(context.recentActivities);
    if (recentHardDays >= LOAD_THRESHOLDS.MAX_CONSECUTIVE_HARD_DAYS) {
      warnings.push({
        type: 'consecutive_hard_days',
        severity: 'danger',
        message: `${recentHardDays} consecutive hard days already — adding another high-intensity session`,
      });
      recommendations.push('Insert a recovery day before the next hard session');
    }
  }

  // Determine overall risk
  const risk = determineOverallRisk(warnings);
  const isValid = risk !== 'critical';

  // Suggest safe alternative if risky
  let suggestedModification: ProposedWorkout | undefined;
  if (risk === 'high' || risk === 'critical') {
    suggestedModification = buildSafeAlternative(original, modified, context);
  }

  return { isValid, risk, warnings, recommendations, suggestedModification };
}

function determineOverallRisk(warnings: ModificationWarning[]): 'low' | 'moderate' | 'high' | 'critical' {
  const dangerCount = warnings.filter((w) => w.severity === 'danger').length;
  const warningCount = warnings.filter((w) => w.severity === 'warning').length;

  if (dangerCount >= 2) return 'critical';
  if (dangerCount >= 1) return 'high';
  if (warningCount >= 2) return 'moderate';
  if (warningCount >= 1) return 'moderate';
  return 'low';
}

function buildSafeAlternative(
  original: ProposedWorkout,
  modified: ProposedWorkout,
  context: { constraints?: Constraint[] },
): ProposedWorkout {
  // Step up one intensity level max from original
  const originalLevel = INTENSITY_ORDER[original.intensity];
  const safeIntensityLevel = Math.min(originalLevel + 1, INTENSITY_ORDER.threshold);
  const safeIntensity = WORKOUT_INTENSITIES[safeIntensityLevel];

  // Cap duration increase at 25%
  const safeDuration = Math.min(
    modified.duration_minutes,
    Math.round(original.duration_minutes * 1.25),
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

  // Estimate TSS proportionally
  const safeTss = Math.round(
    original.estimated_tss * (safeDuration / original.duration_minutes) *
      (1 + (safeIntensityLevel - originalLevel) * 0.15),
  );

  return {
    sport: safeSport,
    duration_minutes: safeDuration,
    intensity: safeIntensity,
    estimated_tss: safeTss,
  };
}
```

### Step 4: Update Exports (`tools/index.ts`)

```typescript
export {
  // Existing exports...
  VALIDATE_WORKOUT_MODIFICATION_TOOL,
  validateWorkoutModification,
} from './safety-tools.js';
```

### Step 5: Write Tests (`__tests__/safety-tools.test.ts`)

Add a new `describe('validateWorkoutModification', ...)` block:

#### Test Categories

**A. Intensity Jump Tests:**
- No change → no warnings
- 1-level increase → no warning
- 2-level increase → warning
- 3+ level increase → danger
- Decrease → no warning (always safe to reduce)

**B. TSS Increase Tests:**
- ≤50% increase → no warning
- 51-100% increase → warning
- >100% increase → danger
- Decrease → no warning

**C. Duration Increase Tests:**
- ≤50% increase → no warning
- >50% increase → warning
- >100% increase → danger

**D. Readiness Interaction Tests:**
- Red readiness + intensity increase → danger
- Yellow readiness + intensity increase → warning
- Green readiness + intensity increase → no fatigue warning
- Red readiness + decrease → no fatigue warning (reducing is fine)

**E. Fatigue Interaction Tests:**
- Critical fatigue + TSS increase → danger
- High fatigue + >25% TSS increase → warning
- Low fatigue + TSS increase → no fatigue warning

**F. Constraint Violation Tests:**
- Sport change to restricted sport → danger
- Sport change to unrestricted sport → no warning
- High intensity with intensity restriction + severe injury → danger
- High intensity with intensity restriction + mild injury → warning

**G. Consecutive Hard Days Tests:**
- 2 hard days + threshold workout → danger
- 1 hard day + threshold workout → no warning
- 2 hard days + easy workout → no warning (intensity below threshold)

**H. Overall Risk Determination Tests:**
- 0 danger, 0 warning → low
- 0 danger, 1 warning → moderate
- 0 danger, 2+ warnings → moderate
- 1 danger → high
- 2+ dangers → critical

**I. Safe Alternative Tests:**
- Caps intensity at 1 level above original
- Caps duration at 125% of original
- Reverts to original sport if constraint violation
- TSS scales proportionally

**J. Edge Cases:**
- Zero original TSS (avoid division by zero)
- Zero original duration (avoid division by zero)
- Empty constraints array
- Null optional context fields
- Same workout (no modification) → low risk, valid

## Testing Requirements

- Follow existing test patterns in `safety-tools.test.ts` (use `createCheckIn()` helper, `jest.useFakeTimers()`)
- Use `.js` extensions in imports (ESM package)
- Test boundary conditions for all thresholds
- All tests pass with `pnpm test`
- Linting passes with `pnpm lint`

## Verification

1. `pnpm test` passes (all existing + new tests)
2. `pnpm lint` passes
3. New tool definition matches Claude API tool format
4. Function reuses existing safety infrastructure (thresholds, helpers)
5. Types are exported correctly through barrel exports
6. All edge cases handled (division by zero, null fields)

## Dependencies

- P4-B-01 ✅ (training load validation)
- P4-B-02 ✅ (injury awareness)

## Estimated Scope

~200 lines of new implementation code + ~400 lines of tests. Should fit within a single focused PR.
