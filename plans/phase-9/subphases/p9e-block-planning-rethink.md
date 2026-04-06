# P9E-R: Block Planning Rethink

## Goal

Enhance block planning so that: (1) required sports and minimum weekly sessions are derived from the season's races, (2) users can set per-day workout preferences (e.g. "long ride on Friday", "swim on Mon and Wed"), (3) block dates are clearly shown to the user, and (4) unavailability selection is constrained to the block's date range. All of this feeds into the generate-block-workouts flow.

**Depends on:** P9E (existing block planning flow), P9C (season setup — races), P9D (workout generation — week assembler)

---

## Context

Currently, block setup collects weekly hours and unavailable dates (focus areas were removed in PR #154). It doesn't:
- Derive which sports **must** be trained based on race distances (e.g., a 70.3 requires swim, bike, run).
- Enforce a minimum number of weekly sessions per required sport.
- Let the user pin specific workout types to specific days (e.g., "long ride on Friday").
- Show the block's date range prominently.
- Restrict the unavailability date picker to the block's date range.

### Key files
- `packages/core/src/types/season.ts` — `SeasonPreferences`, `RaceBlock`, `BlockPhase`
- `packages/core/src/utils/week-assembler.ts` — `WeekAssemblyInput`, `DayConstraint`, `assembleWeek()`
- `apps/mobile/contexts/SeasonSetupContext.tsx` — `SeasonRace`, `DayConstraint`, `SeasonPreferencesInput`
- `apps/mobile/app/plan/block-setup.tsx` — Block setup UI (focus areas removed in PR #154)
- `apps/mobile/components/FormDatePicker.tsx` — Shared date picker with single/range mode, `minimumDate`/`maximumDate` props (added in PR #153)
- `apps/mobile/hooks/useBlockPlanning.ts` — Block planning hook (exposes season, block, step)
- `supabase/functions/generate-block-workouts/index.ts` — Edge function
- `docs/testing/manual-test-cases.csv` — Manual test cases

### Recent changes from main
- **PR #153**: Added `FormDatePicker` component with single and range modes, `minimumDate`/`maximumDate` constraint support, clear button, and full accessibility. Already used in races, profile, constraints, and goals screens.
- **PR #154**: Removed focus areas from block setup — the screen now only has weekly hours and unavailable dates.
- **PR #155**: Replaced the raw TextInput for unavailable dates with `FormDatePicker` in **range** mode. Added optional reason field. Added `UnavailableDate` type (`{date, reason?}`) in `packages/core/src/types/block.ts`. Added `expandDateRange()` and `groupUnavailableDates()` utilities in `packages/core/src/utils/date-ranges.ts`. Also added inline hours validation with disabled Generate button. **Note:** `minimumDate`/`maximumDate` block-range constraints on the date picker were not included — that is still needed (P9E-R-04 partially done).

---

## Tasks

| ID | Task | Estimate | Status |
|----|------|----------|--------|
| P9E-R-01 | Derive required sports + min sessions from race distance | S | ⬜ |
| P9E-R-02 | Add per-day workout preferences UI to block setup | M | ⬜ |
| P9E-R-03 | Show block date range in block setup header | S | ⬜ |
| P9E-R-04 | Constrain unavailability date picker to block dates | S | 🔶 |
| P9E-R-05 | Wire enriched preferences into generate-block-workouts | M | ⬜ |
| P9E-R-06 | Update week assembler to enforce min sessions per sport | M | ⬜ |
| P9E-R-07 | Update manual-test-cases.csv | S | ⬜ |
| P9E-R-08 | Unit tests for new logic | M | ⬜ |

---

## P9E-R-01: Derive Required Sports + Min Sessions from Race Distance

### What
Create a pure utility function that maps a race distance to the sports it requires and a recommended minimum weekly session count for each.

### Where
New file: `packages/core/src/utils/race-sport-requirements.ts`
Export from: `packages/core/src/index.ts`

### Details

```typescript
export interface SportRequirement {
  readonly sport: Sport;
  readonly minWeeklySessions: number;
  readonly label: string; // e.g. "Swim (min 2/week)"
}

/**
 * Given a race distance string (from RACE_DISTANCES), return the sports
 * that must be trained and a minimum weekly session count for each.
 */
export function getSportRequirements(raceDistance: string): readonly SportRequirement[];
```

Mapping:

| Race distance | Required sports | Min sessions |
|---------------|----------------|--------------|
| Sprint Tri | swim 2, bike 2, run 2 | 6 |
| Olympic Tri | swim 2, bike 3, run 3 | 8 |
| Ironman 70.3 | swim 2, bike 3, run 3 | 8 |
| Ironman | swim 3, bike 4, run 3 | 10 |
| T100 | swim 2, bike 3, run 3 | 8 |
| Aquathlon | swim 2, run 3 | 5 |
| Duathlon | bike 3, run 3 | 6 |
| 5K / 10K | run 3 | 3 |
| Half Marathon | run 4 | 4 |
| Marathon | run 5 | 5 |
| Ultra Marathon | run 5 | 5 |
| Custom | — (no enforcement) | — |

When a block targets multiple races, merge requirements by taking the max min-sessions per sport across all races.

### Tests
- Each race distance returns expected sports and counts
- Multiple races merge correctly (max per sport)
- Custom returns empty array
- Unknown distance returns empty array

---

## P9E-R-02: Per-Day Workout Preferences UI

### What
Add a section to block setup where the user can assign workout preferences to specific days. Each preference is: **day** + **sport** + optional **workout type** (e.g., "long ride", "technique swim", "tempo run").

### Where
Modify: `apps/mobile/app/plan/block-setup.tsx`
Extend type: `SeasonPreferencesInput.dayConstraints` (already exists but is unused in block setup UI)

### Details

The existing `DayConstraint` type in `SeasonSetupContext.tsx`:
```typescript
export type DayConstraint = {
  sport: string;
  days: readonly number[];
  type: 'preferred' | 'only';
};
```

Extend to support a workout descriptor:
```typescript
export type DayConstraint = {
  sport: string;
  days: readonly number[];
  type: 'preferred' | 'only';
  workoutLabel?: string; // e.g. "Long Ride", "Technique Swim"
};
```

**UI: "Your weekly rhythm" section** (after required sports info, before unavailability)

Show the 7 days of the week as rows. For each day the user can:
1. Tap to add a preference → bottom sheet with sport picker + optional workout type
2. See assigned preferences as chips (e.g., `🏊 Swim` on Mon, `🚴 Long Ride` on Fri)
3. Remove a preference by tapping X on the chip

Pre-populate from season-level `dayConstraints` if they exist.

The required sports from P9E-R-01 should be shown as an info card above this section:
> "Your 70.3 requires: Swim (min 2/wk), Bike (min 3/wk), Run (min 3/wk)"

If the user's day preferences don't meet the minimum, show a warning:
> "You've only assigned 1 swim session. We recommend at least 2/week for your 70.3."

### Component extraction
- `DayPreferenceRow` — a single day with its chips
- `AddPreferenceSheet` — bottom sheet for adding sport + type to a day

---

## P9E-R-03: Show Block Date Range in Block Setup Header

### What
Display the block's start and end dates prominently at the top of block setup so the user knows the planning window.

### Where
Modify: `apps/mobile/app/plan/block-setup.tsx`
Modify: `apps/mobile/hooks/useBlockPlanning.ts`

### Details

Header should read something like:
```
70.3 #1 Prep
Jan 19 – Jun 7, 2026 · 20 weeks
```

The block dates come from the season skeleton phase that this block maps to. The `useBlockPlanning` hook already computes `startDate` and `endDate` internally during `generateWorkouts()` (via `collectBlockPhases()`), but these are not exposed to the UI during the `setup` step. The hook needs to:

1. Compute the next block's phases eagerly (on load, not just on generate) using the existing `collectBlockPhases()` helper
2. Expose `blockName`, `blockStartDate`, `blockEndDate`, and `blockTotalWeeks` on the return type so block-setup.tsx can display them in the header and pass them to `FormDatePicker` as `minimumDate`/`maximumDate` (P9E-R-04).

**Note:** Also expose the season's races so P9E-R-01 can derive sport requirements in the UI.

---

## P9E-R-04: Constrain Unavailability Date Picker to Block Dates

**Status: 🔶 Partially done** — PR #155 replaced the raw TextInput with `FormDatePicker` in range mode (✅), but did not add `minimumDate`/`maximumDate` constraints. That remaining piece is scoped here.

### What
Set `minimumDate` and `maximumDate` on the existing `FormDatePicker` in block-setup.tsx so dates outside the block's date range are greyed out and unselectable.

### Where
Modify: `apps/mobile/app/plan/block-setup.tsx`

### What's already done (PR #155)
- `FormDatePicker mode="range"` replaces the old TextInput
- `expandDateRange()` / `groupUnavailableDates()` handle expansion and chip display
- `UnavailableDate` type (`{date, reason?}`) is in `@khepri/core`

### What remains
The `FormDatePicker` in block-setup.tsx currently has no `minimumDate`/`maximumDate` set:
```tsx
<FormDatePicker
  mode="range"
  label="Date range"
  rangeStart={rangeStart}
  rangeEnd={rangeEnd}
  onRangeSelect={handleRangeSelect}
  allowClear
/>
```

Once P9E-R-03 exposes `blockStartDate` and `blockEndDate` from the hook, add:
```tsx
<FormDatePicker
  mode="range"
  label="Date range"
  rangeStart={rangeStart}
  rangeEnd={rangeEnd}
  onRangeSelect={handleRangeSelect}
  minimumDate={blockStartDate}
  maximumDate={blockEndDate}
  helpText={`Within block: ${formatBlockDate(blockStartDate)} – ${formatBlockDate(blockEndDate)}`}
  allowClear
/>
```

Also filter out any pre-existing unavailable dates outside the block range when loading a draft (with a toast if any were removed).

---

## P9E-R-05: Wire Enriched Preferences into Generate Block Workouts

### What
Pass the sport requirements and day preferences into the `generate-block-workouts` edge function so the week assembler can use them.

### Where
Modify: `supabase/functions/generate-block-workouts/index.ts`
Modify: `apps/mobile/hooks/useBlockPlanning.ts`

### Details

The current `BlockSetupData` type (in `useBlockPlanning.ts`) is:
```typescript
interface BlockSetupData {
  readonly weeklyHoursMin: number;
  readonly weeklyHoursMax: number;
  readonly unavailableDates: readonly string[];
}
```

Extend it:
```typescript
interface BlockSetupData {
  readonly weeklyHoursMin: number;
  readonly weeklyHoursMax: number;
  readonly unavailableDates: readonly string[];
  readonly sportRequirements: SportRequirement[];  // from P9E-R-01
  readonly dayPreferences: DayPreference[];        // from P9E-R-02
}

interface DayPreference {
  dayOfWeek: number;        // 0=Sun, 1=Mon ... 6=Sat (matches JS getDay())
  sport: string;
  workoutLabel?: string;    // e.g. "Long Ride"
}
```

Extend the edge function's `GenerateRequest` (in `generate-block-workouts/index.ts`) to accept the new fields:
```typescript
interface GenerateRequest {
  // ... existing fields ...
  sport_requirements?: SportRequirement[];
  day_preferences?: DayPreference[];
}
```

The `useBlockPlanning` hook should:
1. Compute sport requirements from the season's races using `getSportRequirements()` (races are on `SeasonRow`)
2. Collect day preferences from the UI state
3. Pass both in the `supabase.functions.invoke('generate-block-workouts', { body: ... })` call

The edge function should:
1. Convert `day_preferences` into per-day sport assignments for workout generation
2. Use `sport_requirements` to enforce minimum session counts per sport
3. Both fields are optional for backward compatibility — existing blocks without them still work

---

## P9E-R-06: Update Week Assembler to Enforce Min Sessions per Sport

### What
Modify `assembleWeek()` to accept minimum session requirements per sport and guarantee them if possible.

### Where
Modify: `packages/core/src/utils/week-assembler.ts`

### Details

Add to `WeekAssemblyInput`:
```typescript
readonly minSessionsPerSport?: ReadonlyMap<Sport, number>;
```

Algorithm change in `allocateSports()`:
1. First, guarantee the minimum sessions per required sport
2. Then, distribute remaining sessions by priority weight (existing logic)
3. If total minimum > available sessions, warn but still allocate what's possible (prioritise by race distance relevance)

Also enhance `DayConstraint`:
```typescript
export interface DayConstraint {
  readonly day: DayOfWeek;
  readonly sport?: Sport;
  readonly maxDurationMinutes?: number;
  readonly isHardDay?: boolean;
  readonly workoutLabel?: string;  // new — passed to template selection
}
```

The `workoutLabel` (e.g., "Long Ride") should influence template selection — map common labels to template IDs or `TrainingFocus` values.

### Tests
- Min sessions respected when enough days available
- Min sessions best-effort when days are scarce
- Day preferences result in correct sport placement
- workoutLabel maps to appropriate template focus

---

## P9E-R-07: Update Manual Test Cases

### What
Update `docs/testing/manual-test-cases.csv` to cover the new block planning behavior.

### Details

New/modified test cases:

| ID | Category | Use Case |
|----|----------|----------|
| BLOCK-08 | Block Planning | Block setup shows date range header |
| BLOCK-09 | Block Planning | Required sports derived from race distance |
| BLOCK-10 | Block Planning | Min sessions warning when preferences insufficient |
| BLOCK-11 | Block Planning | Add per-day workout preference |
| BLOCK-12 | Block Planning | Remove per-day workout preference |
| BLOCK-13 | Block Planning | Unavailability date picker constrained to block dates |
| BLOCK-14 | Block Planning | Unavailability date outside block range rejected |
| BLOCK-15 | Block Planning | Day preferences fed into workout generation |
| BLOCK-16 | Block Planning | Generated workouts respect min sessions per sport |
| BLOCK-02 (modify) | Block Planning | Update to include day preferences step |

---

## P9E-R-08: Unit Tests

### What
Unit tests for all new pure logic.

### Where
- `packages/core/src/utils/__tests__/race-sport-requirements.test.ts`
- `packages/core/src/utils/__tests__/week-assembler.test.ts` (extend)

### Tests
- `getSportRequirements()` for each race distance
- `getSportRequirements()` merging multiple races
- `assembleWeek()` with `minSessionsPerSport`
- `assembleWeek()` with `workoutLabel` day constraints
- Edge case: more required sessions than available days

---

## Implementation Order

```
P9E-R-01  (core utility — no deps)
  +
P9E-R-03  (UI — expose block dates from hook, show header)
    ↓
P9E-R-04  (UI — swap TextInput for FormDatePicker — needs block dates from R-03)
  +
P9E-R-06  (week assembler changes — depends on types from R-01)
  +
P9E-R-08  (tests for R-01 and R-06)
    ↓
P9E-R-02  (UI — day preferences — uses R-01 for info card, R-03 for layout)
    ↓
P9E-R-05  (wiring — connects UI to edge function to assembler)
    ↓
P9E-R-07  (test cases — after behavior is finalized)
```

**Parallelizable:** R-01 + R-03 can start concurrently (no deps). Once R-03 done, R-04 is a quick swap using existing `FormDatePicker`. R-06 + R-08 can run in parallel once R-01 is done.

---

## Verification Checklist

- [ ] Block setup header shows block date range (start–end, weeks)
- [ ] Required sports info card derived from race distance(s)
- [ ] Per-day preferences UI allows assigning sport + workout type per day
- [ ] Warning shown when day preferences don't meet min sessions
- [ ] Unavailability date picker bounded to block date range
- [ ] Dates outside block range rejected
- [ ] `getSportRequirements()` returns correct data for all race distances
- [ ] `assembleWeek()` respects `minSessionsPerSport`
- [ ] `assembleWeek()` respects `workoutLabel` day constraints
- [ ] Edge function receives and passes through enriched preferences
- [ ] Generated workouts reflect user's day preferences
- [ ] Manual test cases updated
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
