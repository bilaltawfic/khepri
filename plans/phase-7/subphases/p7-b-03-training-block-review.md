# P7-B-03: Build Training Block Review Screen

## Goal

Create a training block review screen at `apps/mobile/app/analysis/training-review.tsx` that displays CTL/ATL/TSB trends, weekly training loads, form status, recovery assessment, and form trend direction. This screen uses analysis utilities from `@khepri/core` (`calculateFormTrend`, `calculateWeeklyLoads`, `assessRecovery`, `getFormStatus`) and wellness/activity data from the MCP gateway.

## Dependencies

- **P7-B-01** (✅ Complete) — Training analysis utilities in `@khepri/core`

## Files to Create

1. `apps/mobile/app/analysis/_layout.tsx` — Stack layout for analysis screens (if not yet created by P7-B-02)
2. `apps/mobile/app/analysis/training-review.tsx` — Training block review screen
3. `apps/mobile/hooks/useTrainingReview.ts` — Hook to fetch wellness + activity data and compute analysis
4. `apps/mobile/hooks/__tests__/useTrainingReview.test.ts` — Unit tests for the hook
5. `apps/mobile/app/analysis/__tests__/training-review.test.tsx` — Screen render tests

## Files to Modify

1. `apps/mobile/hooks/index.ts` — Export `useTrainingReview`
2. `apps/mobile/app/analysis/_layout.tsx` — Add `training-review` screen entry (if layout already exists from P7-B-02)

## Implementation Steps

### Step 1: Create/Update Analysis Stack Layout

If `apps/mobile/app/analysis/_layout.tsx` does not yet exist (P7-B-02 not merged), create it:

```tsx
import { Stack } from 'expo-router';

export default function AnalysisLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="training-review" options={{ title: 'Training Review' }} />
    </Stack>
  );
}
```

If it already exists, add the `training-review` screen entry.

### Step 2: Create `useTrainingReview` Hook

Create `apps/mobile/hooks/useTrainingReview.ts`:

**Data flow:**
1. Use `useAuth()` to get authenticated user
2. Call `getWellnessData()` via MCP gateway — fetch 42 days (6 weeks) of wellness data points
3. Call `getRecentActivities(42)` via `services/intervals.ts` — fetch 6 weeks of activity data
4. Map `WellnessDataPoint` to `FitnessDataPoint` (extract `date`, `ctl`, `atl`, `tsb`)
5. Map `ActivityData` to `ActivityRecord` (extract `date`, `duration` in minutes, `tss`, `type`)
6. Call analysis functions:
   - `calculateFormTrend(fitnessData)` — overall 7-day trend
   - `calculateWeeklyLoads(activities)` — weekly load summaries
   - `assessRecovery(fitnessData)` — recovery state
   - `getFormStatus(latestTsb)` — current form category

**Interface:**

```ts
import type { FormStatus, FormTrend, RecoveryAssessment, WeeklyLoadSummary, FitnessDataPoint } from '@khepri/core';

export interface TrainingReviewData {
  readonly formStatus: FormStatus;
  readonly formTrend: FormTrend | null;
  readonly weeklyLoads: WeeklyLoadSummary[];
  readonly recovery: RecoveryAssessment | null;
  readonly fitnessData: FitnessDataPoint[]; // for trend display
  readonly latestCTL: number;
  readonly latestATL: number;
  readonly latestTSB: number;
}

export interface UseTrainingReviewReturn {
  readonly data: TrainingReviewData | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
}
```

**Key implementation details:**
- Convert `ActivityData.duration` from seconds to minutes for `ActivityRecord`
- Default `tss` to 0 when `ActivityData.tss` is undefined
- Use `useCallback` for refresh, `isCurrent` flag for cleanup
- Handle case where wellness API is unavailable (return null data)

### Step 3: Create Training Review Screen

Create `apps/mobile/app/analysis/training-review.tsx`:

**UI layout (follows plan screen pattern with card sections):**

1. **Header Section**
   - `ThemedText type="title"` — "Training Review"
   - Subtitle showing date range (last 6 weeks)

2. **Current Form Card**
   - Form status badge (color-coded, same mapping as P7-B-02)
   - Current TSB value with label
   - Trend direction arrow: ↑ improving (green), → stable (secondary), ↓ declining (warning)
   - TSB change over last 7 days

3. **Fitness Summary Card**
   - Three-column layout: CTL | ATL | TSB
   - Each showing current value with label
   - Color code: CTL (primary), ATL (warning), TSB (dynamic by form status)

4. **Recovery Assessment Card** (if available)
   - Fatigue level badge (low=green, moderate=blue, high=warning, very_high=error)
   - Suggested recovery days
   - Ramp rate (CTL change/week)
   - Overreaching warning if `isOverreaching === true`

5. **Weekly Training Loads Section**
   - List of weekly summaries (most recent first)
   - Each row shows:
     - Week start date (formatted)
     - Total TSS with bar visualization (proportional width)
     - Activity count
     - Average TSS per activity
     - Total duration (formatted as hours:minutes)
   - TSS bar max width based on highest week's TSS

6. **Form Trend Details Card** (if trend available)
   - Direction label with arrow icon
   - CTL change, ATL change, TSB change values
   - Average TSB over the period

**State handling:**
- `LoadingState` when fetching
- `ErrorState` with retry on fetch failure
- `EmptyState` with message to connect Intervals.icu when no data

**Accessibility:**
- `accessibilityRole` and `accessibilityLabel` on cards and badges
- Meaningful labels on trend arrows (e.g., "Form is improving")

### Step 4: Export Hook

Add to `apps/mobile/hooks/index.ts`:

```ts
export { useTrainingReview, type TrainingReviewData, type UseTrainingReviewReturn } from './useTrainingReview';
```

### Step 5: Write Tests

**Hook tests** (`apps/mobile/hooks/__tests__/useTrainingReview.test.ts`):
- Test loading state while fetching
- Test successful fetch with wellness + activity data
- Test computed values: form status, trend, weekly loads, recovery
- Test empty state when no wellness data
- Test error handling when MCP gateway fails
- Test duration conversion (seconds → minutes) and TSS defaulting
- Mock: `@/contexts` (useAuth), `@/services/intervals` (getRecentActivities, wellness fetch), `@khepri/core` analysis functions

**Screen tests** (`apps/mobile/app/analysis/__tests__/training-review.test.tsx`):
- Test screen renders with loading state
- Test screen renders all cards with data
- Test form status badge color mapping
- Test trend direction arrow rendering
- Test weekly loads list rendering
- Test recovery warning when overreaching
- Test empty and error states
- Mock: `useTrainingReview` hook

## Wellness Data Fetching

To get multi-day wellness data, use the MCP gateway `get_wellness_data` tool directly (similar to how `services/intervals.ts` does it):

```ts
// Fetch 42 days of wellness data
const oldest = new Date();
oldest.setDate(oldest.getDate() - 42);
const oldestStr = formatDateLocal(oldest);
const today = formatDateLocal(new Date());

// Call MCP gateway with get_wellness_data tool
// Map response.wellness[] to FitnessDataPoint[]
```

The `WellnessDataPoint` from `services/intervals.ts` has `date`, `ctl`, `atl`, `tsb` which map directly to `FitnessDataPoint` from `@khepri/core`.

## Code Patterns to Follow

- ESM imports with `.js` extensions in test files for `@khepri/core` imports
- `useCallback` for `refresh` function
- `isCurrent` cleanup flag in `useEffect`
- `readonly` on all interface properties
- `StyleSheet.create()` for styles
- `Colors[colorScheme]` for theme-aware colors
- `formatDuration()` / `formatMinutes()` from `@khepri/core` for time display
- `toJSON()` + string search for text assertions in tests

## Testing Requirements

- All new code must have unit tests
- Run `pnpm test` — all tests pass
- Run `pnpm lint` — no lint errors
- Run `pnpm typecheck` — no type errors

## Verification

1. `pnpm test` passes
2. `pnpm lint` passes
3. `pnpm typecheck` passes
4. Screen renders form status, fitness numbers, recovery, and weekly loads
5. Trend direction arrows display correctly
6. Weekly TSS bars are proportional
7. Empty/loading/error states work correctly
8. Pull-to-refresh reloads data
