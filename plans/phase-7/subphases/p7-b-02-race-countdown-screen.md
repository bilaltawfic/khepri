# P7-B-02: Build Race Countdown Screen

## Goal

Create a race countdown screen at `apps/mobile/app/analysis/race-countdown.tsx` that displays upcoming race goals with days remaining, current form status, projected TSB, training recommendation, and confidence level. This screen uses the existing `calculateRaceReadiness()` utility from `@khepri/core` and `getUpcomingRaceGoals()` from `@khepri/supabase-client`.

## Dependencies

- **P7-B-01** (✅ Complete) — Training analysis utilities in `@khepri/core`

## Files to Create

1. `apps/mobile/app/analysis/_layout.tsx` — Stack layout for analysis screens
2. `apps/mobile/app/analysis/race-countdown.tsx` — Race countdown screen
3. `apps/mobile/hooks/useRaceCountdown.ts` — Hook to fetch race goals + wellness data and compute readiness
4. `apps/mobile/hooks/__tests__/useRaceCountdown.test.ts` — Unit tests for the hook
5. `apps/mobile/app/analysis/__tests__/race-countdown.test.tsx` — Screen render tests

## Files to Modify

1. `apps/mobile/hooks/index.ts` — Export `useRaceCountdown`
2. `apps/mobile/app/(tabs)/_layout.tsx` — (No change needed — analysis screens are navigated to from dashboard/profile, not a new tab)

## Implementation Steps

### Step 1: Create Analysis Stack Layout

Create `apps/mobile/app/analysis/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function AnalysisLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="race-countdown" options={{ title: 'Race Countdown' }} />
    </Stack>
  );
}
```

### Step 2: Create `useRaceCountdown` Hook

Create `apps/mobile/hooks/useRaceCountdown.ts`:

**Data flow:**
1. Use `useAuth()` to get authenticated user
2. Use `supabase` client to call `getAthleteByAuthUser()` → get athlete ID
3. Call `getUpcomingRaceGoals(client, athleteId)` → get race goals with `target_date`
4. Call `getWellnessData()` via MCP gateway (or use wellness service from `services/intervals.ts`) to get last 14+ days of fitness data points
5. For each race goal, call `calculateRaceReadiness(fitnessData, goal.target_date)` from `@khepri/core`
6. Return combined race readiness data

**Interface:**

```ts
import type { GoalRow } from '@khepri/supabase-client';
import type { RaceReadiness } from '@khepri/core';

export type RaceCountdownItem = {
  readonly goal: GoalRow;
  readonly readiness: RaceReadiness | null;
};

export interface UseRaceCountdownReturn {
  readonly races: RaceCountdownItem[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
}
```

**Key implementation details:**
- Map `WellnessDataPoint` from `services/intervals.ts` to `FitnessDataPoint` from `@khepri/core` (extract `date`, `ctl`, `atl`, `tsb` fields)
- Fetch 42 days (6 weeks) of wellness data to ensure `calculateRaceReadiness()` has enough data points (requires ≥ 7)
- Handle case where wellness data is unavailable (readiness will be `null`)
- Use `useCallback` for refresh, `isCurrent` flag in useEffect for cleanup

### Step 3: Create Race Countdown Screen

Create `apps/mobile/app/analysis/race-countdown.tsx`:

**UI layout (follows calendar screen pattern):**
- `ScreenContainer` wrapper
- `ThemedText type="title"` — "Race Countdown"
- Loading/Error/Empty states using shared components
- `ScrollView` with pull-to-refresh
- For each race: a card showing:
  - **Race name** (from `goal.race_event_name` or `goal.title`)
  - **Date** (from `goal.target_date`, formatted)
  - **Days remaining** (from `readiness.daysUntilRace`)
  - **Location** (from `goal.race_location`, if set)
  - **Distance** (from `goal.race_distance`, if set)
  - **Current form status** badge (color-coded: race_ready=green, fresh=blue, optimal=primary, tired=warning, overtrained=error)
  - **Projected TSB** on race day
  - **Confidence** indicator (high/medium/low)
  - **Recommendation** text
- If no readiness data available (insufficient fitness data), show a "Connect to Intervals.icu for race predictions" message

**Color mapping for form status:**
- `race_ready` → Colors success
- `fresh` → Colors info
- `optimal` → Colors primary
- `tired` → Colors warning
- `overtrained` → Colors error

**Accessibility:**
- `accessibilityRole="summary"` on race cards
- `accessibilityLabel` with full race details for screen readers

### Step 4: Export Hook

Add to `apps/mobile/hooks/index.ts`:

```ts
export { useRaceCountdown, type RaceCountdownItem, type UseRaceCountdownReturn } from './useRaceCountdown';
```

### Step 5: Write Tests

**Hook tests** (`apps/mobile/hooks/__tests__/useRaceCountdown.test.ts`):
- Test loading state while fetching
- Test successful fetch with race goals + readiness data
- Test empty state when no upcoming races
- Test error handling when Supabase query fails
- Test error handling when wellness fetch fails
- Test that readiness is null when insufficient fitness data
- Mock: `@/lib/supabase`, `@/contexts` (useAuth), `@/services/intervals` (wellness fetch), `@khepri/supabase-client` queries

**Screen tests** (`apps/mobile/app/analysis/__tests__/race-countdown.test.tsx`):
- Test screen renders with loading state
- Test screen renders race cards with readiness data
- Test empty state renders when no races
- Test error state renders
- Test form status badge colors
- Mock: `useRaceCountdown` hook

## Code Patterns to Follow

- ESM imports with `.js` extensions in test files for `@khepri/core` imports
- `useCallback` for `refresh` function
- `isCurrent` cleanup flag in `useEffect`
- `readonly` on all interface properties
- `StyleSheet.create()` for styles
- `Colors[colorScheme]` for theme-aware colors
- `toJSON()` + string search for text assertions in tests (not `getByText`)

## Testing Requirements

- All new code must have unit tests
- Run `pnpm test` — all tests pass
- Run `pnpm lint` — no lint errors
- Run `pnpm typecheck` — no type errors

## Verification

1. `pnpm test` passes
2. `pnpm lint` passes
3. `pnpm typecheck` passes
4. Screen renders race cards with countdown data
5. Form status badges are color-coded correctly
6. Empty/loading/error states work correctly
7. Pull-to-refresh reloads data
