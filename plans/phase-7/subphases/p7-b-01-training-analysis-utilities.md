# P7-B-01: Add Training Analysis Utility Functions

## Goal

Create pure utility functions in `@khepri/core` that analyze training data (CTL/ATL/TSB trends, weekly load, recovery, race readiness) to power the race countdown and training review screens in P7-B-02 and P7-B-03.

## Dependencies

- ✅ P3-A-05: Intervals.icu API integration - #65 (provides activity/wellness data)

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `packages/core/src/utils/analysis.ts` | Training analysis utility functions |
| Create | `packages/core/src/__tests__/analysis.test.ts` | Comprehensive unit tests |
| Create | `packages/core/src/types/analysis.ts` | Analysis-specific type definitions |
| Modify | `packages/core/src/types/index.ts` | Export analysis types |
| Modify | `packages/core/src/utils/index.ts` | Export analysis functions |
| Modify | `packages/core/src/index.ts` | Re-export from barrel (if not already covered) |

## Implementation Steps

### Step 1: Define Analysis Types

**File:** `packages/core/src/types/analysis.ts`

```typescript
/** A single data point with CTL/ATL/TSB values for a given date */
export type FitnessDataPoint = {
  readonly date: string; // YYYY-MM-DD
  readonly ctl: number; // Chronic Training Load (fitness)
  readonly atl: number; // Acute Training Load (fatigue)
  readonly tsb: number; // Training Stress Balance (form)
};

/** Result of form trend analysis over a time window */
export type FormTrend = {
  readonly direction: 'improving' | 'stable' | 'declining';
  readonly tsbChange: number; // TSB delta over the window
  readonly ctlChange: number; // CTL delta over the window
  readonly atlChange: number; // ATL delta over the window
  readonly currentTsb: number;
  readonly averageTsb: number;
};

/** Form status categories based on TSB value */
export const FORM_STATUSES = ['race_ready', 'fresh', 'optimal', 'tired', 'overtrained'] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

/** An activity record with training stress */
export type ActivityRecord = {
  readonly date: string; // YYYY-MM-DD
  readonly duration: number; // minutes
  readonly tss: number; // Training Stress Score
  readonly type?: string;
};

/** Weekly training load summary */
export type WeeklyLoadSummary = {
  readonly weekStart: string; // YYYY-MM-DD (Monday)
  readonly totalTss: number;
  readonly activityCount: number;
  readonly averageTssPerActivity: number;
  readonly totalDuration: number; // minutes
};

/** Race readiness assessment */
export type RaceReadiness = {
  readonly daysUntilRace: number;
  readonly currentForm: FormStatus;
  readonly projectedTsb: number; // Estimated TSB on race day
  readonly recommendation: string; // Brief actionable advice
  readonly confidence: 'high' | 'medium' | 'low';
};

/** Recovery assessment */
export type RecoveryAssessment = {
  readonly fatigueLevel: 'low' | 'moderate' | 'high' | 'very_high';
  readonly suggestedRecoveryDays: number;
  readonly rampRate: number; // Weekly CTL change (positive = building, negative = detraining)
  readonly isOverreaching: boolean;
};
```

### Step 2: Implement Analysis Functions

**File:** `packages/core/src/utils/analysis.ts`

#### Function 1: `getFormStatus(tsb: number): FormStatus`

Categorize TSB into form status:

| TSB Range | Status |
|-----------|--------|
| > 15 | `race_ready` |
| 5 to 15 | `fresh` |
| -10 to 5 | `optimal` (training sweet spot) |
| -25 to -10 | `tired` |
| < -25 | `overtrained` |

```typescript
export function getFormStatus(tsb: number): FormStatus {
  if (tsb > 15) return 'race_ready';
  if (tsb > 5) return 'fresh';
  if (tsb >= -10) return 'optimal';
  if (tsb >= -25) return 'tired';
  return 'overtrained';
}
```

#### Function 2: `calculateFormTrend(data: readonly FitnessDataPoint[]): FormTrend | null`

Analyze form direction over a window of fitness data points:

- Requires at least 2 data points
- Compare first and last TSB values
- Direction thresholds: improving (delta > 3), declining (delta < -3), stable otherwise
- Return null for empty/single-point data

```typescript
export function calculateFormTrend(data: readonly FitnessDataPoint[]): FormTrend | null {
  if (data.length < 2) return null;

  const first = data[0];
  const last = data[data.length - 1];

  const tsbChange = last.tsb - first.tsb;
  const ctlChange = last.ctl - first.ctl;
  const atlChange = last.atl - first.atl;

  const averageTsb = data.reduce((sum, d) => sum + d.tsb, 0) / data.length;

  let direction: FormTrend['direction'];
  if (tsbChange > 3) direction = 'improving';
  else if (tsbChange < -3) direction = 'declining';
  else direction = 'stable';

  return {
    direction,
    tsbChange,
    ctlChange,
    atlChange,
    currentTsb: last.tsb,
    averageTsb,
  };
}
```

#### Function 3: `calculateWeeklyLoads(activities: readonly ActivityRecord[]): WeeklyLoadSummary[]`

Group activities by ISO week and calculate weekly aggregates:

- Group by Monday-start weeks
- Calculate total TSS, activity count, average TSS per activity, total duration
- Return sorted by week start (ascending)
- Handle empty array → empty result
- Guard against division by zero (zero activities in a week)

```typescript
export function calculateWeeklyLoads(activities: readonly ActivityRecord[]): WeeklyLoadSummary[] {
  if (activities.length === 0) return [];

  // Group activities by ISO week (Monday start)
  const weekMap = new Map<string, ActivityRecord[]>();

  for (const activity of activities) {
    const weekStart = getISOWeekStart(activity.date);
    const existing = weekMap.get(weekStart) ?? [];
    existing.push(activity);
    weekMap.set(weekStart, existing);
  }

  // Calculate summaries
  const summaries: WeeklyLoadSummary[] = [];
  for (const [weekStart, weekActivities] of weekMap) {
    const totalTss = weekActivities.reduce((sum, a) => sum + a.tss, 0);
    const totalDuration = weekActivities.reduce((sum, a) => sum + a.duration, 0);
    const activityCount = weekActivities.length;

    summaries.push({
      weekStart,
      totalTss,
      activityCount,
      averageTssPerActivity: activityCount > 0 ? totalTss / activityCount : 0,
      totalDuration,
    });
  }

  return summaries.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
```

#### Function 4: `assessRecovery(data: readonly FitnessDataPoint[]): RecoveryAssessment | null`

Assess current recovery state and make recommendations:

- Requires at least 7 data points (one week)
- ATL-based fatigue: low (<40), moderate (40-70), high (70-90), very_high (>90)
- Ramp rate: CTL change over the window (per week)
- Overreaching: ramp rate > 7 CTL/week
- Suggested recovery days based on fatigue level

```typescript
export function assessRecovery(data: readonly FitnessDataPoint[]): RecoveryAssessment | null {
  if (data.length < 7) return null;

  const latest = data[data.length - 1];
  const weekAgo = data[Math.max(0, data.length - 7)];

  const rampRate = latest.ctl - weekAgo.ctl;
  const isOverreaching = rampRate > 7;

  let fatigueLevel: RecoveryAssessment['fatigueLevel'];
  let suggestedRecoveryDays: number;

  if (latest.atl > 90) {
    fatigueLevel = 'very_high';
    suggestedRecoveryDays = 3;
  } else if (latest.atl > 70) {
    fatigueLevel = 'high';
    suggestedRecoveryDays = 2;
  } else if (latest.atl > 40) {
    fatigueLevel = 'moderate';
    suggestedRecoveryDays = 1;
  } else {
    fatigueLevel = 'low';
    suggestedRecoveryDays = 0;
  }

  return { fatigueLevel, suggestedRecoveryDays, rampRate, isOverreaching };
}
```

#### Function 5: `calculateRaceReadiness(data: readonly FitnessDataPoint[], raceDateStr: string, today?: string): RaceReadiness | null`

Project form for race day and assess readiness:

- Requires at least 7 data points
- Calculate days until race
- Project TSB using simple linear extrapolation from recent trend
- Provide recommendation based on current phase (building, tapering, race week)
- Confidence based on data availability and projection distance

```typescript
export function calculateRaceReadiness(
  data: readonly FitnessDataPoint[],
  raceDateStr: string,
  today?: string,
): RaceReadiness | null {
  if (data.length < 7) return null;

  const currentDate = today ?? getToday();
  const daysUntilRace = daysBetween(currentDate, raceDateStr);

  if (daysUntilRace < 0) return null; // Race already passed

  const latest = data[data.length - 1];
  const trend = calculateFormTrend(data.slice(-7));
  const dailyTsbChange = trend != null ? trend.tsbChange / 7 : 0;

  const projectedTsb = latest.tsb + dailyTsbChange * daysUntilRace;
  const currentForm = getFormStatus(latest.tsb);

  let recommendation: string;
  if (daysUntilRace <= 2) {
    recommendation = 'Race week - rest and stay fresh.';
  } else if (daysUntilRace <= 14) {
    recommendation = 'Taper phase - reduce volume, maintain intensity.';
  } else if (daysUntilRace <= 28) {
    recommendation = 'Final build - key workouts then begin taper.';
  } else {
    recommendation = 'Continue building fitness with progressive overload.';
  }

  let confidence: RaceReadiness['confidence'];
  if (daysUntilRace <= 7 && data.length >= 14) confidence = 'high';
  else if (daysUntilRace <= 21) confidence = 'medium';
  else confidence = 'low';

  return { daysUntilRace, currentForm, projectedTsb, recommendation, confidence };
}
```

#### Helper: `getISOWeekStart(dateStr: string): string`

```typescript
function getISOWeekStart(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}
```

#### Helper: `daysBetween(from: string, to: string): number`

```typescript
function daysBetween(from: string, to: string): number {
  const msPerDay = 86_400_000;
  const fromDate = new Date(from + 'T00:00:00');
  const toDate = new Date(to + 'T00:00:00');
  return Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay);
}
```

### Step 3: Export from Barrel

**File:** `packages/core/src/types/index.ts`

```typescript
// ==== Analysis ====
export type {
  FitnessDataPoint,
  FormTrend,
  FormStatus,
  ActivityRecord,
  WeeklyLoadSummary,
  RaceReadiness,
  RecoveryAssessment,
} from './analysis.js';
export { FORM_STATUSES } from './analysis.js';
```

**File:** `packages/core/src/utils/index.ts`

```typescript
// ==== Analysis ====
export {
  getFormStatus,
  calculateFormTrend,
  calculateWeeklyLoads,
  assessRecovery,
  calculateRaceReadiness,
} from './analysis.js';
```

### Step 4: Write Comprehensive Tests

**File:** `packages/core/src/__tests__/analysis.test.ts`

```typescript
// getFormStatus tests:
// 1. Returns 'race_ready' for TSB > 15
// 2. Returns 'fresh' for TSB 5-15
// 3. Returns 'optimal' for TSB -10 to 5
// 4. Returns 'tired' for TSB -25 to -10
// 5. Returns 'overtrained' for TSB < -25
// 6. Handles boundary values exactly (15, 5, -10, -25)
// 7. Handles TSB of 0

// calculateFormTrend tests:
// 8. Returns null for empty array
// 9. Returns null for single data point
// 10. Returns 'improving' when TSB increases by more than 3
// 11. Returns 'declining' when TSB decreases by more than 3
// 12. Returns 'stable' when TSB change is within ±3
// 13. Calculates correct average TSB
// 14. Calculates correct CTL and ATL deltas

// calculateWeeklyLoads tests:
// 15. Returns empty array for empty input
// 16. Groups activities by ISO week (Monday start)
// 17. Calculates correct total TSS per week
// 18. Calculates correct activity count per week
// 19. Calculates correct average TSS per activity
// 20. Handles activities spanning multiple weeks
// 21. Returns weeks sorted by date ascending

// assessRecovery tests:
// 22. Returns null for fewer than 7 data points
// 23. Returns 'low' fatigue for ATL < 40
// 24. Returns 'moderate' fatigue for ATL 40-70
// 25. Returns 'high' fatigue for ATL 70-90
// 26. Returns 'very_high' fatigue for ATL > 90
// 27. Detects overreaching when ramp rate > 7
// 28. Suggests correct recovery days per fatigue level
// 29. Calculates correct weekly ramp rate

// calculateRaceReadiness tests:
// 30. Returns null for fewer than 7 data points
// 31. Returns null when race date is in the past
// 32. Calculates correct days until race
// 33. Projects TSB using trend extrapolation
// 34. Provides race week recommendation for ≤2 days out
// 35. Provides taper recommendation for ≤14 days out
// 36. Provides build recommendation for >28 days out
// 37. High confidence for close race with sufficient data
// 38. Low confidence for distant race
// 39. Accepts optional 'today' parameter for deterministic testing
```

## Code Patterns to Follow

- All functions are **pure** (no side effects, no external API calls)
- Accept `readonly` arrays to prevent mutation
- Return `null` for insufficient data (not throw)
- Use `!= null` instead of truthy checks where 0 is valid
- `.js` extensions in imports for ESM
- Derive types from const arrays: `typeof CONST[number]`
- Type guards accept `unknown` with `typeof` checks
- Capture date once for time-sensitive tests (pass `today` param)

## Testing Requirements

- All new tests pass: `pnpm test`
- Existing tests still pass
- Lint passes: `pnpm lint`
- Build passes: `pnpm build`
- Target: 38+ test cases with edge case coverage

## Verification

- [ ] All 5 analysis functions exported from `@khepri/core`
- [ ] All analysis types exported from `@khepri/core`
- [ ] Edge cases handled (empty arrays, insufficient data, boundary values)
- [ ] No division by zero possible
- [ ] Pure functions with no side effects
- [ ] 38+ tests passing
- [ ] Build succeeds with correct type declarations
