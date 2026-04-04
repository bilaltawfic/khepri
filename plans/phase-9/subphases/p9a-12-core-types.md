# P9-A-12: Season, RaceBlock, Workout, Adaptation Types in Core Package

## Goal

Add TypeScript types, const arrays, and type guards for the season-based planning data model to `@khepri/core`. These types are used by the mobile app, supabase-client queries, and Edge Functions.

**Parent plan:** [p9a-data-model.md](./p9a-data-model.md)
**Design doc:** [docs/design/training-plan-redesign.md](../../../docs/design/training-plan-redesign.md)
**Depends on:** Nothing
**Blocks:** P9-A-08 through P9-A-11 (supabase-client queries need these types)

## Files to Create

| File | Purpose |
|------|---------|
| `packages/core/src/types/season.ts` | Season, RaceBlock, SeasonPreferences, SeasonSkeleton, BlockPhase types |
| `packages/core/src/types/workout.ts` | Workout, WorkoutStructure, WorkoutSection, WorkoutStep, Sport types |
| `packages/core/src/types/adaptation.ts` | PlanAdaptation, WorkoutSnapshot, ComplianceResult types |
| `packages/core/src/__tests__/season.test.ts` | Type guard tests for season types |
| `packages/core/src/__tests__/workout.test.ts` | Type guard tests for workout types |
| `packages/core/src/__tests__/adaptation.test.ts` | Type guard tests for adaptation types |

## Files to Modify

| File | Change |
|------|--------|
| `packages/core/src/types/index.ts` | Add barrel exports for season, workout, adaptation modules |
| `packages/core/src/index.ts` | Add barrel exports for new types and type guards |

## Implementation Steps

### 1. Create `packages/core/src/types/season.ts`

Follow the existing pattern from `wellness.ts`: const arrays → derived types → type guards accepting `unknown`.

```typescript
// Const arrays (single source of truth)
export const SEASON_STATUSES = ['active', 'completed', 'archived'] as const;
export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export const BLOCK_STATUSES = ['draft', 'locked', 'in_progress', 'completed', 'cancelled'] as const;
export type BlockStatus = (typeof BLOCK_STATUSES)[number];

// Type guards
export function isSeasonStatus(value: unknown): value is SeasonStatus {
  return typeof value === 'string' && (SEASON_STATUSES as readonly string[]).includes(value);
}

export function isBlockStatus(value: unknown): value is BlockStatus {
  return typeof value === 'string' && (BLOCK_STATUSES as readonly string[]).includes(value);
}

// Interfaces
export interface SeasonPreferences {
  readonly weeklyHoursTarget: number;
  readonly availableDays: readonly number[];        // 0=Mon, 6=Sun
  readonly sportPriority: readonly string[];        // ordered list of sports
  readonly maxSessionsPerDay: number;
  readonly preferredRestDays: readonly number[];
}

export interface SeasonSkeleton {
  readonly phases: readonly SeasonSkeletonPhase[];
  readonly generatedAt: string;                     // ISO timestamp
}

export interface SeasonSkeletonPhase {
  readonly name: string;
  readonly startDate: string;                       // YYYY-MM-DD
  readonly endDate: string;
  readonly focus: string;
  readonly weeklyHours: number;
}

export interface BlockPhase {
  readonly name: string;
  readonly weeks: number;
  readonly focus: string;
  readonly weeklyHours: number;
}

// Domain interfaces (not DB rows — those live in supabase-client)
export interface Season {
  readonly id: string;
  readonly athleteId: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: SeasonStatus;
  readonly preferences: SeasonPreferences;
  readonly skeleton: SeasonSkeleton | null;
}

export interface RaceBlock {
  readonly id: string;
  readonly seasonId: string;
  readonly athleteId: string;
  readonly name: string;
  readonly goalId: string | null;
  readonly startDate: string;
  readonly endDate: string;
  readonly totalWeeks: number;
  readonly status: BlockStatus;
  readonly phases: readonly BlockPhase[];
}
```

### 2. Create `packages/core/src/types/workout.ts`

```typescript
export const SPORTS = ['swim', 'bike', 'run', 'strength', 'rest'] as const;
export type Sport = (typeof SPORTS)[number];

export const WORKOUT_TYPES = ['intervals', 'endurance', 'tempo', 'threshold', 'recovery', 'race', 'test'] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const SYNC_STATUSES = ['pending', 'synced', 'conflict', 'not_connected'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const INTERVALS_TARGETS = ['POWER', 'PACE', 'HR', 'AUTO'] as const;
export type IntervalsTarget = (typeof INTERVALS_TARGETS)[number];

// Type guards
export function isSport(value: unknown): value is Sport { ... }
export function isWorkoutType(value: unknown): value is WorkoutType { ... }
export function isSyncStatus(value: unknown): value is SyncStatus { ... }
export function isIntervalsTarget(value: unknown): value is IntervalsTarget { ... }

// Structured workout content (for app display)
export interface WorkoutStructure {
  readonly sections: readonly WorkoutSection[];
  readonly totalDurationMinutes: number;
  readonly notes?: string;
}

export interface WorkoutSection {
  readonly name: string;                            // "Warm-up", "Main Set", "Cool-down"
  readonly steps: readonly WorkoutStep[];
  readonly durationMinutes: number;
}

export interface WorkoutStep {
  readonly description: string;
  readonly durationMinutes?: number;
  readonly durationMeters?: number;
  readonly repeat?: number;
  readonly zone?: string;                           // e.g., "Z2", "Z4", "easy", "threshold"
  readonly target?: string;                         // e.g., "180W", "4:30/km"
}

// Domain interface
export interface Workout {
  readonly id: string;
  readonly blockId: string;
  readonly athleteId: string;
  readonly date: string;
  readonly weekNumber: number;
  readonly name: string;
  readonly sport: Sport;
  readonly workoutType: WorkoutType | null;
  readonly plannedDurationMinutes: number;
  readonly plannedTss: number | null;
  readonly structure: WorkoutStructure;
  readonly descriptionDsl: string;
  readonly intervalsTarget: IntervalsTarget;
  readonly syncStatus: SyncStatus;
  readonly externalId: string;
  // Actual results (nullable — filled after activity sync)
  readonly actualDurationMinutes: number | null;
  readonly actualTss: number | null;
  readonly completedAt: string | null;
  readonly compliance: ComplianceResult | null;
}
```

### 3. Create `packages/core/src/types/adaptation.ts`

```typescript
export const ADAPTATION_TRIGGERS = ['coach_suggestion', 'athlete_request', 'block_review', 'external_sync'] as const;
export type AdaptationTrigger = (typeof ADAPTATION_TRIGGERS)[number];

export const ADAPTATION_STATUSES = ['suggested', 'accepted', 'rejected', 'rolled_back'] as const;
export type AdaptationStatus = (typeof ADAPTATION_STATUSES)[number];

// Type guards
export function isAdaptationTrigger(value: unknown): value is AdaptationTrigger { ... }
export function isAdaptationStatus(value: unknown): value is AdaptationStatus { ... }

export interface ComplianceResult {
  readonly score: number;                           // 0-100
  readonly color: 'green' | 'amber' | 'red';
  readonly durationMatch: number | null;            // 0-100
  readonly tssMatch: number | null;
  readonly distanceMatch: number | null;
  readonly completionStatus: 'completed' | 'partial' | 'skipped' | 'pending';
}

export const COMPLIANCE_COLORS = ['green', 'amber', 'red'] as const;
export type ComplianceColor = (typeof COMPLIANCE_COLORS)[number];

export interface WorkoutSnapshot {
  readonly workoutId: string;
  readonly before: Record<string, unknown>;
  readonly after: Record<string, unknown>;
  readonly changeType: 'modified' | 'swapped' | 'skipped' | 'added' | 'removed';
}

export interface PlanAdaptation {
  readonly id: string;
  readonly blockId: string;
  readonly athleteId: string;
  readonly trigger: AdaptationTrigger;
  readonly status: AdaptationStatus;
  readonly affectedWorkouts: readonly WorkoutSnapshot[];
  readonly reason: string;
  readonly context: Record<string, unknown> | null;
}
```

### 4. Update barrel exports

Add to `packages/core/src/types/index.ts`:
```typescript
// ==== Season Types ====
export type { Season, RaceBlock, SeasonPreferences, SeasonSkeleton, ... } from './season.js';
export { SEASON_STATUSES, BLOCK_STATUSES, isSeasonStatus, isBlockStatus } from './season.js';

// ==== Workout Types ====
export type { Workout, WorkoutStructure, WorkoutSection, WorkoutStep, ... } from './workout.js';
export { SPORTS, WORKOUT_TYPES, SYNC_STATUSES, INTERVALS_TARGETS, isSport, ... } from './workout.js';

// ==== Adaptation Types ====
export type { PlanAdaptation, ComplianceResult, WorkoutSnapshot, ... } from './adaptation.js';
export { ADAPTATION_TRIGGERS, ADAPTATION_STATUSES, COMPLIANCE_COLORS, ... } from './adaptation.js';
```

Add to `packages/core/src/index.ts` following existing sections.

### 5. Write tests

One test file per type module. Test:
- Each type guard returns `true` for valid values
- Each type guard returns `false` for invalid values (wrong string, number, null, undefined, object)
- Edge cases: empty string, number 0, boolean

## Testing Requirements

- `pnpm test` passes in `packages/core`
- `pnpm lint` passes
- `pnpm typecheck` passes
- All type guards have >95% coverage

## Verification Checklist

- [ ] `season.ts` exports: SEASON_STATUSES, BLOCK_STATUSES, isSeasonStatus, isBlockStatus, Season, RaceBlock, SeasonPreferences, SeasonSkeleton, BlockPhase
- [ ] `workout.ts` exports: SPORTS, WORKOUT_TYPES, SYNC_STATUSES, INTERVALS_TARGETS, isSport, isWorkoutType, isSyncStatus, isIntervalsTarget, Workout, WorkoutStructure, WorkoutSection, WorkoutStep, Sport, WorkoutType, SyncStatus, IntervalsTarget
- [ ] `adaptation.ts` exports: ADAPTATION_TRIGGERS, ADAPTATION_STATUSES, COMPLIANCE_COLORS, isAdaptationTrigger, isAdaptationStatus, ComplianceResult, ComplianceColor, WorkoutSnapshot, PlanAdaptation, AdaptationTrigger, AdaptationStatus
- [ ] Barrel exports updated in both `types/index.ts` and root `index.ts`
- [ ] All type guards accept `unknown` and use `typeof` checks
- [ ] All interfaces use `readonly` properties
- [ ] All tests pass
