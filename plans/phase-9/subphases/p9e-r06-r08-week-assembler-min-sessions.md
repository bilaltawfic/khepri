# P9E-R-06 + R-08: Week Assembler Min Sessions & Unit Tests

## Goal
Modify `assembleWeek()` to accept minimum session requirements per sport (from `getSportRequirements()`) and guarantee them when possible. Add `workoutLabel` to `DayConstraint` to influence template selection. Includes comprehensive unit tests (R-08).

**Depends on:** P9E-R-01 (SportRequirement type + getSportRequirements) ✅ merged in #159

## Files to Modify
- `packages/core/src/utils/week-assembler.ts` — add `minSessionsPerSport` to input, `workoutLabel` to `DayConstraint`, update allocation algorithm
- `packages/core/src/utils/__tests__/week-assembler.test.ts` — extend with new test cases
- `packages/core/src/index.ts` — export new types if needed

## Implementation Steps

### 1. Extend `DayConstraint` type

Add `workoutLabel` field to the existing `DayConstraint` interface in `week-assembler.ts`:

```typescript
export interface DayConstraint {
  readonly day: DayOfWeek;
  readonly sport?: Sport;
  readonly maxDurationMinutes?: number;
  readonly isHardDay?: boolean;
  readonly workoutLabel?: string;  // NEW: e.g. "Long Ride", "Technique Swim"
}
```

### 2. Extend `WeekAssemblyInput`

Add optional `minSessionsPerSport` field:

```typescript
export interface WeekAssemblyInput {
  // ... existing fields ...
  readonly minSessionsPerSport?: ReadonlyMap<Sport, number>;
}
```

### 3. Update `allocateSports()` algorithm

Current logic distributes sessions by sport priority weight. New logic:

1. **Phase 1 — Guarantee minimums**: For each sport in `minSessionsPerSport`, reserve that many sessions. Prefer days with matching `DayConstraint.sport` first, then fill from unassigned available days.
2. **Phase 2 — Distribute remainder**: Remaining sessions allocated by priority weight (existing logic), but skip already-assigned days.
3. **Phase 3 — Best-effort warning**: If total minimums > available sessions, allocate what's possible. Prioritise by race-distance relevance (order in the map). Add a `warnings` field to `WeekPlan` output.

### 4. Map `workoutLabel` to template selection

In the session-generation step (where `selectTemplate()` is called), if `DayConstraint.workoutLabel` is set:
- Map common labels to `TrainingFocus` values:
  - "Long Ride" / "Long Run" / "Long Swim" → `'endurance'`
  - "Tempo Run" / "Tempo Ride" → `'tempo'`
  - "Threshold" / "FTP" → `'threshold'`
  - "Technique Swim" / "Drill" → `'technique'`
  - "Recovery" / "Easy" → `'recovery'`
  - "Interval" / "VO2max" → `'vo2max'`
  - "Sprint" / "Speed" → `'sprint'`
- Pass the mapped focus as a preference to `selectTemplate()` or override the focus selection.

### 5. Add `warnings` to `WeekPlan`

```typescript
export interface WeekPlan {
  // ... existing fields ...
  readonly warnings?: readonly string[];
}
```

Warnings emitted when:
- Minimum sessions for a sport couldn't be fully satisfied
- Total required sessions exceed available days

### 6. Write unit tests (R-08)

**New test file or extend existing `week-assembler.test.ts`:**

#### `minSessionsPerSport` tests:
- Min sessions respected when enough days available (e.g., swim 2, bike 3, run 3 with 7 available days)
- Min sessions allocated first, remainder by priority
- Min sessions best-effort when days are scarce (e.g., only 4 days but need 6 sessions)
- Warning emitted when minimums can't be met
- Empty/undefined `minSessionsPerSport` preserves existing behavior

#### `workoutLabel` tests:
- Day with `workoutLabel: "Long Ride"` gets endurance focus
- Day with `workoutLabel: "Tempo Run"` gets tempo focus
- Unknown label falls back to default focus selection
- `workoutLabel` absent behaves as before

#### Interaction tests:
- `minSessionsPerSport` combined with day constraints (sport pinned to specific day)
- Min sessions + unavailable days (fewer available than minimum)

## Code Patterns

### Guarantee minimums algorithm
```typescript
function allocateSportsWithMinimums(
  availableDays: readonly DayOfWeek[],
  sportPriority: readonly Sport[],
  dayConstraints: readonly DayConstraint[],
  minSessionsPerSport?: ReadonlyMap<Sport, number>,
): { allocation: Map<DayOfWeek, Sport>; warnings: string[] } {
  const allocation = new Map<DayOfWeek, Sport>();
  const warnings: string[] = [];
  const unassigned = new Set(availableDays);

  // Phase 1: Honour day constraints first
  for (const dc of dayConstraints) {
    if (dc.sport && unassigned.has(dc.day)) {
      allocation.set(dc.day, dc.sport);
      unassigned.delete(dc.day);
    }
  }

  // Phase 2: Guarantee minimums
  if (minSessionsPerSport) {
    for (const [sport, minCount] of minSessionsPerSport) {
      const alreadyAssigned = [...allocation.values()].filter(s => s === sport).length;
      const needed = minCount - alreadyAssigned;
      let filled = 0;
      for (const day of unassigned) {
        if (filled >= needed) break;
        allocation.set(day, sport);
        unassigned.delete(day);
        filled++;
      }
      if (filled < needed) {
        warnings.push(`Could only allocate ${alreadyAssigned + filled}/${minCount} sessions for ${sport}`);
      }
    }
  }

  // Phase 3: Distribute remainder by priority weight
  // ... existing logic for remaining unassigned days ...

  return { allocation, warnings };
}
```

### Label-to-focus mapping
```typescript
const LABEL_TO_FOCUS: Record<string, TrainingFocus> = {
  'long ride': 'endurance',
  'long run': 'endurance',
  'long swim': 'endurance',
  'tempo run': 'tempo',
  'tempo ride': 'tempo',
  'threshold': 'threshold',
  'ftp': 'threshold',
  'technique swim': 'technique',
  'drill': 'technique',
  'recovery': 'recovery',
  'easy': 'recovery',
  'interval': 'vo2max',
  'vo2max': 'vo2max',
  'sprint': 'sprint',
  'speed': 'sprint',
};

function labelToFocus(label: string): TrainingFocus | undefined {
  return LABEL_TO_FOCUS[label.toLowerCase()];
}
```

## Testing Requirements
- All existing `assembleWeek()` tests continue to pass (no regression)
- New `minSessionsPerSport` tests cover happy path, scarce days, and warnings
- New `workoutLabel` tests cover focus mapping and fallback
- `pnpm test` passes
- `pnpm lint` passes
- `pnpm typecheck` passes

## Verification
- Existing week-assembler behavior unchanged when new fields omitted
- Min sessions allocated before priority distribution
- Warnings surfaced when constraints can't be met
- `workoutLabel` maps to correct training focus
