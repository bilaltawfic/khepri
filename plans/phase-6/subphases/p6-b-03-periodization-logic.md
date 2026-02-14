# P6-B-03: Periodization Logic in Core Package

**Branch:** `feat/p6-b-03-periodization-logic`
**Depends on:** None (standalone utility functions)
**Blocks:** P6-B-04 (Plan generation Edge Function)

## Goal

Implement training periodization utilities in the core package that calculate training phases, intensity distributions, and weekly progressions for structured training plans.

## Files to Create/Modify

### Create
- `packages/core/src/utils/periodization.ts` - Periodization calculation functions
- `packages/core/src/utils/periodization.test.ts` - Unit tests
- `packages/core/src/types/training.ts` - Training plan type definitions

### Modify
- `packages/core/src/utils/index.ts` - Export periodization utilities
- `packages/core/src/types/index.ts` - Export training types

## Implementation Steps

### 1. Define Training Plan Types

Create `packages/core/src/types/training.ts`:

```typescript
/**
 * Training periodization phase types.
 */
export const PERIODIZATION_PHASES = [
  'base',
  'build',
  'peak',
  'taper',
  'recovery',
] as const;

export type PeriodizationPhase = typeof PERIODIZATION_PHASES[number];

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

export type TrainingFocus = typeof TRAINING_FOCUS[number];

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
```

### 2. Implement Periodization Functions

Create `packages/core/src/utils/periodization.ts`:

```typescript
import type {
  PeriodizationPhase,
  PeriodizationPhaseConfig,
  TrainingFocus,
  IntensityDistribution,
  PeriodizationPlan,
  WeeklyVolume,
} from '../types/training.js';

/**
 * Validate that intensity distribution sums to 100.
 */
function validateIntensityDistribution(dist: IntensityDistribution): boolean {
  const [zone12, zone34, zone5] = dist;
  const sum = zone12 + zone34 + zone5;
  // Allow 0.1% tolerance for floating point rounding
  return Math.abs(sum - 100) < 0.1;
}

/**
 * Get recommended intensity distribution for a training phase.
 * Based on classic periodization models (Lydiard, Coggan, Friel).
 */
export function getIntensityDistribution(phase: PeriodizationPhase): IntensityDistribution {
  switch (phase) {
    case 'base':
      return [80, 15, 5]; // Focus on aerobic base
    case 'build':
      return [70, 20, 10]; // Increase threshold work
    case 'peak':
      return [60, 25, 15]; // Add VO2max and race-specific intensity
    case 'taper':
      return [90, 5, 5]; // Reduce intensity, maintain sharpness
    case 'recovery':
      return [95, 5, 0]; // Active recovery only
    default:
      // Exhaustiveness check: TypeScript should ensure all cases covered
      const _exhaustive: never = phase;
      return [80, 15, 5];
  }
}

/**
 * Get recommended training focus for a phase.
 */
export function getTrainingFocus(phase: PeriodizationPhase): TrainingFocus {
  switch (phase) {
    case 'base':
      return 'aerobic_endurance';
    case 'build':
      return 'threshold_work';
    case 'peak':
      return 'race_specific';
    case 'taper':
      return 'recovery';
    case 'recovery':
      return 'recovery';
    default:
      const _exhaustive: never = phase;
      return 'aerobic_endurance';
  }
}

/**
 * Calculate phase breakdown for a training plan.
 * Returns recommended weeks for each phase based on total duration.
 *
 * @param totalWeeks - Total plan duration (4-52 weeks)
 * @param targetPhase - Optional phase to build toward (defaults to 'peak')
 * @returns Array of phase configurations
 */
export function calculatePhaseBreakdown(
  totalWeeks: number,
  targetPhase: PeriodizationPhase = 'peak'
): PeriodizationPhaseConfig[] {
  if (totalWeeks < 4 || totalWeeks > 52) {
    throw new Error(`Total weeks must be between 4 and 52, got ${totalWeeks}`);
  }

  const phases: PeriodizationPhaseConfig[] = [];

  if (totalWeeks <= 8) {
    // Short plan: Base → Build → Taper
    const baseWeeks = Math.max(2, Math.floor(totalWeeks * 0.4));
    const taperWeeks = Math.min(2, Math.floor(totalWeeks * 0.2));
    const buildWeeks = totalWeeks - baseWeeks - taperWeeks;

    phases.push({
      phase: 'base',
      weeks: baseWeeks,
      focus: getTrainingFocus('base'),
      intensity_distribution: getIntensityDistribution('base'),
    });

    phases.push({
      phase: 'build',
      weeks: buildWeeks,
      focus: getTrainingFocus('build'),
      intensity_distribution: getIntensityDistribution('build'),
    });

    phases.push({
      phase: 'taper',
      weeks: taperWeeks,
      focus: getTrainingFocus('taper'),
      intensity_distribution: getIntensityDistribution('taper'),
    });
  } else {
    // Standard plan: Base → Build → Peak → Taper
    const baseWeeks = Math.max(3, Math.floor(totalWeeks * 0.35));
    const taperWeeks = Math.min(2, Math.floor(totalWeeks * 0.15));
    const peakWeeks = Math.max(2, Math.floor(totalWeeks * 0.15));
    const buildWeeks = totalWeeks - baseWeeks - peakWeeks - taperWeeks;

    phases.push({
      phase: 'base',
      weeks: baseWeeks,
      focus: getTrainingFocus('base'),
      intensity_distribution: getIntensityDistribution('base'),
    });

    phases.push({
      phase: 'build',
      weeks: buildWeeks,
      focus: getTrainingFocus('build'),
      intensity_distribution: getIntensityDistribution('build'),
    });

    phases.push({
      phase: 'peak',
      weeks: peakWeeks,
      focus: getTrainingFocus('peak'),
      intensity_distribution: getIntensityDistribution('peak'),
    });

    phases.push({
      phase: 'taper',
      weeks: taperWeeks,
      focus: getTrainingFocus('taper'),
      intensity_distribution: getIntensityDistribution('taper'),
    });
  }

  return phases;
}

/**
 * Calculate weekly volume progression for a training plan.
 * Uses a wave pattern with progressive overload and recovery weeks.
 *
 * @param phases - Phase configurations from calculatePhaseBreakdown
 * @returns Array of weekly volumes with multipliers
 */
export function calculateWeeklyVolumes(
  phases: readonly PeriodizationPhaseConfig[]
): WeeklyVolume[] {
  const volumes: WeeklyVolume[] = [];
  let currentWeek = 1;

  for (const phase of phases) {
    const phaseVolumes = generatePhaseVolumes(phase, currentWeek);
    volumes.push(...phaseVolumes);
    currentWeek += phase.weeks;
  }

  return volumes;
}

/**
 * Generate weekly volumes for a single phase using 3:1 progression
 * (3 weeks progressive overload, 1 recovery week).
 */
function generatePhaseVolumes(
  phase: PeriodizationPhaseConfig,
  startWeek: number
): WeeklyVolume[] {
  const volumes: WeeklyVolume[] = [];

  // Base multipliers for each phase
  const phaseBaseMultiplier: Record<PeriodizationPhase, number> = {
    base: 0.8,
    build: 1.0,
    peak: 1.1,
    taper: 0.5,
    recovery: 0.6,
  };

  const baseMultiplier = phaseBaseMultiplier[phase.phase];

  for (let i = 0; i < phase.weeks; i++) {
    const weekInPhase = i + 1;
    const weekNumber = startWeek + i;

    let volumeMultiplier: number;

    if (phase.phase === 'taper') {
      // Taper: progressive reduction
      volumeMultiplier = baseMultiplier * (1 - (i / phase.weeks) * 0.4);
    } else {
      // 3:1 progression: weeks 1-3 increase, week 4 recovery
      const cyclePosition = weekInPhase % 4;
      if (cyclePosition === 1) {
        volumeMultiplier = baseMultiplier * 0.85;
      } else if (cyclePosition === 2) {
        volumeMultiplier = baseMultiplier * 0.95;
      } else if (cyclePosition === 3) {
        volumeMultiplier = baseMultiplier * 1.05;
      } else {
        // Recovery week
        volumeMultiplier = baseMultiplier * 0.7;
      }
    }

    volumes.push({
      week: weekNumber,
      volume_multiplier: Number(volumeMultiplier.toFixed(2)),
      phase: phase.phase,
    });
  }

  return volumes;
}

/**
 * Generate a complete periodization plan for a training cycle.
 *
 * @param totalWeeks - Total plan duration (4-52 weeks)
 * @param targetPhase - Optional phase to build toward
 * @returns Complete periodization plan with phases and weekly volumes
 */
export function generatePeriodizationPlan(
  totalWeeks: number,
  targetPhase: PeriodizationPhase = 'peak'
): PeriodizationPlan {
  const phases = calculatePhaseBreakdown(totalWeeks, targetPhase);
  const weeklyVolumes = calculateWeeklyVolumes(phases);

  return {
    total_weeks: totalWeeks,
    phases,
    weekly_volumes: weeklyVolumes,
  };
}
```

### 3. Write Comprehensive Tests

Create `packages/core/src/utils/periodization.test.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';
import {
  getIntensityDistribution,
  getTrainingFocus,
  calculatePhaseBreakdown,
  calculateWeeklyVolumes,
  generatePeriodizationPlan,
} from './periodization.js';

describe('periodization', () => {
  describe('getIntensityDistribution', () => {
    it('returns correct distribution for base phase', () => {
      expect(getIntensityDistribution('base')).toEqual([80, 15, 5]);
    });

    it('returns correct distribution for build phase', () => {
      expect(getIntensityDistribution('build')).toEqual([70, 20, 10]);
    });

    it('distributions sum to 100', () => {
      const phases = ['base', 'build', 'peak', 'taper', 'recovery'] as const;
      for (const phase of phases) {
        const dist = getIntensityDistribution(phase);
        const sum = dist[0] + dist[1] + dist[2];
        expect(sum).toBe(100);
      }
    });
  });

  describe('calculatePhaseBreakdown', () => {
    it('creates 3 phases for 8-week plan', () => {
      const phases = calculatePhaseBreakdown(8);
      expect(phases).toHaveLength(3);
      expect(phases[0]?.phase).toBe('base');
      expect(phases[1]?.phase).toBe('build');
      expect(phases[2]?.phase).toBe('taper');
    });

    it('creates 4 phases for 12-week plan', () => {
      const phases = calculatePhaseBreakdown(12);
      expect(phases).toHaveLength(4);
      expect(phases[0]?.phase).toBe('base');
      expect(phases[1]?.phase).toBe('build');
      expect(phases[2]?.phase).toBe('peak');
      expect(phases[3]?.phase).toBe('taper');
    });

    it('total weeks match input', () => {
      for (const weeks of [4, 8, 12, 16, 20]) {
        const phases = calculatePhaseBreakdown(weeks);
        const totalWeeks = phases.reduce((sum, p) => sum + p.weeks, 0);
        expect(totalWeeks).toBe(weeks);
      }
    });

    it('throws error for invalid week counts', () => {
      expect(() => calculatePhaseBreakdown(3)).toThrow();
      expect(() => calculatePhaseBreakdown(53)).toThrow();
    });
  });

  describe('calculateWeeklyVolumes', () => {
    it('generates volumes for all weeks', () => {
      const phases = calculatePhaseBreakdown(12);
      const volumes = calculateWeeklyVolumes(phases);
      expect(volumes).toHaveLength(12);
    });

    it('week numbers are sequential', () => {
      const phases = calculatePhaseBreakdown(12);
      const volumes = calculateWeeklyVolumes(phases);
      for (let i = 0; i < volumes.length; i++) {
        expect(volumes[i]?.week).toBe(i + 1);
      }
    });

    it('taper weeks have reduced volume', () => {
      const phases = calculatePhaseBreakdown(12);
      const volumes = calculateWeeklyVolumes(phases);
      const taperVolumes = volumes.filter((v) => v.phase === 'taper');
      for (const tv of taperVolumes) {
        expect(tv.volume_multiplier).toBeLessThan(0.7);
      }
    });

    it('follows 3:1 progression in build phase', () => {
      const phases = calculatePhaseBreakdown(12);
      const volumes = calculateWeeklyVolumes(phases);
      const buildVolumes = volumes.filter((v) => v.phase === 'build');

      // Check that every 4th week is a recovery week (lower volume)
      for (let i = 3; i < buildVolumes.length; i += 4) {
        const recoveryWeek = buildVolumes[i];
        const previousWeek = buildVolumes[i - 1];
        if (recoveryWeek != null && previousWeek != null) {
          expect(recoveryWeek.volume_multiplier).toBeLessThan(
            previousWeek.volume_multiplier
          );
        }
      }
    });
  });

  describe('generatePeriodizationPlan', () => {
    it('creates complete plan with phases and volumes', () => {
      const plan = generatePeriodizationPlan(12);
      expect(plan.total_weeks).toBe(12);
      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.weekly_volumes).toHaveLength(12);
    });

    it('plan volumes match phase count', () => {
      const plan = generatePeriodizationPlan(16);
      const phaseWeeks = plan.phases.reduce((sum, p) => sum + p.weeks, 0);
      expect(phaseWeeks).toBe(16);
      expect(plan.weekly_volumes).toHaveLength(16);
    });
  });
});
```

### 4. Export from Index Files

Update `packages/core/src/types/index.ts`:

```typescript
// ==== Training Types ====
export type {
  PeriodizationPhase,
  TrainingFocus,
  IntensityDistribution,
  PeriodizationPhaseConfig,
  WeeklyVolume,
  PeriodizationPlan,
} from './training.js';

export { PERIODIZATION_PHASES, TRAINING_FOCUS } from './training.js';
```

Update `packages/core/src/utils/index.ts`:

```typescript
// ==== Periodization ====
export {
  getIntensityDistribution,
  getTrainingFocus,
  calculatePhaseBreakdown,
  calculateWeeklyVolumes,
  generatePeriodizationPlan,
} from './periodization.js';
```

## Testing Requirements

### Unit Tests
- ✅ All intensity distributions sum to 100
- ✅ Phase breakdown totals match input weeks
- ✅ Invalid week counts throw errors
- ✅ Weekly volumes generated for all weeks
- ✅ Week numbers are sequential
- ✅ Taper phase has progressively reduced volume
- ✅ Build phase follows 3:1 progression (3 weeks up, 1 recovery)
- ✅ Complete plan includes phases and weekly volumes

### Manual Verification
```typescript
import { generatePeriodizationPlan } from '@khepri/core';

// Generate 12-week plan
const plan = generatePeriodizationPlan(12);

console.log('Phases:', plan.phases);
console.log('Weekly Volumes:', plan.weekly_volumes);

// Verify output structure matches expectations
```

## Code Patterns to Follow

### Type Safety
```typescript
// Derive types from const arrays for single source of truth
export const PERIODIZATION_PHASES = [...] as const;
export type PeriodizationPhase = typeof PERIODIZATION_PHASES[number];

// Use readonly for immutable data
export interface PeriodizationPlan {
  readonly total_weeks: number;
  readonly phases: readonly PeriodizationPhaseConfig[];
}
```

### Error Handling
```typescript
if (totalWeeks < 4 || totalWeeks > 52) {
  throw new Error(`Total weeks must be between 4 and 52, got ${totalWeeks}`);
}
```

### Exhaustiveness Checks
```typescript
switch (phase) {
  case 'base': return ...;
  case 'build': return ...;
  default:
    const _exhaustive: never = phase;  // TypeScript ensures all cases covered
    return ...;
}
```

## Verification

Task is complete when:
- ✅ All types defined in `training.ts`
- ✅ All functions implemented in `periodization.ts`
- ✅ All tests pass (`pnpm test`)
- ✅ Exports added to index files
- ✅ TypeScript compiles without errors
- ✅ Biome lint passes
- ✅ Can import and use from `@khepri/core` in other packages

## Notes

- **Evidence-based approach:** Intensity distributions based on proven periodization models (Lydiard, Coggan, Friel)
- **3:1 progression:** Classic pattern of 3 weeks building + 1 recovery week
- **Flexibility:** Functions are pure and composable - can be used individually or combined
- **Future enhancement:** Could add support for block periodization, reverse periodization, etc.

## Related Tasks

- **Next:** P6-B-04 - Plan generation Edge Function (will use these utilities)
- **Parallel:** P6-A-01 - Calendar MCP tools (independent)
- **Parallel:** P6-B-01 - Training plans schema (independent)
