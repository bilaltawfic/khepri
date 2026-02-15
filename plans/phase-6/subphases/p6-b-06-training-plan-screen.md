# P6-B-06: Build Training Plan Screen in Mobile App

## Goal

Build a training plan tab screen that displays the athlete's active training plan. Shows plan overview (name, dates, status), periodization phases with visual progress, weekly volume chart, and current week highlight. Includes actions to pause/cancel the plan and an empty state prompting plan creation via the AI coach.

**Dependencies:** P6-B-02 (training plan queries) — merged as PR #101.

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `apps/mobile/app/(tabs)/plan.tsx` | Training plan tab screen |
| `apps/mobile/hooks/useTrainingPlan.ts` | Data-fetching hook for active training plan |
| `apps/mobile/hooks/__tests__/useTrainingPlan.test.ts` | Hook unit tests |

### Modified Files
| File | Change |
|------|--------|
| `apps/mobile/app/(tabs)/_layout.tsx` | Add Plan tab entry |

## Implementation Steps

### Step 1: Create Data-Fetching Hook (`hooks/useTrainingPlan.ts`)

Follow the `useGoals.ts` / `useDashboard.ts` patterns: `useAuth()`, null checks, `useCallback` + `useEffect`, return `{ plan, isLoading, error, refresh, pause, cancel }`.

```typescript
import { useCallback, useEffect, useState } from 'react';
import {
  cancelTrainingPlan,
  getActiveTrainingPlan,
  getAthleteByAuthUser,
  pauseTrainingPlan,
  type TrainingPlanRow,
} from '@khepri/supabase-client';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface UseTrainingPlanReturn {
  readonly plan: TrainingPlanRow | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly pausePlan: () => Promise<{ success: boolean; error?: string }>;
  readonly cancelPlan: () => Promise<{ success: boolean; error?: string }>;
}

export function useTrainingPlan(): UseTrainingPlanReturn {
  const { user } = useAuth();
  const [plan, setPlan] = useState<TrainingPlanRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    if (!supabase || !user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data: athlete } = await getAthleteByAuthUser(supabase, user.id);
      if (!athlete) {
        setError('Athlete profile not found');
        setPlan(null);
        return;
      }
      const { data, error: queryError } = await getActiveTrainingPlan(supabase, athlete.id);
      if (queryError) {
        setError(queryError.message);
        setPlan(null);
        return;
      }
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load training plan');
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  const pausePlan = useCallback(async () => {
    if (!supabase || !plan) return { success: false, error: 'No active plan' };
    const { error: err } = await pauseTrainingPlan(supabase, plan.id);
    if (err) return { success: false, error: err.message };
    setPlan(null); // No longer active
    return { success: true };
  }, [plan]);

  const cancelPlan = useCallback(async () => {
    if (!supabase || !plan) return { success: false, error: 'No active plan' };
    const { error: err } = await cancelTrainingPlan(supabase, plan.id);
    if (err) return { success: false, error: err.message };
    setPlan(null);
    return { success: true };
  }, [plan]);

  return { plan, isLoading, error, refresh: fetchPlan, pausePlan, cancelPlan };
}
```

### Step 2: Build Plan Screen (`app/(tabs)/plan.tsx`)

Key sections of the screen:

**A. Plan Overview Card** — Name, date range, total weeks, status badge, progress indicator (current week / total weeks).

**B. Phases Timeline** — Vertical list of periodization phases from the `periodization` JSONB column. Each phase shows: name, weeks count, focus area, intensity distribution bar. Highlight the current phase based on today's date.

**C. Weekly Volume Chart** — Simple bar chart (no library needed — use `View` widths proportional to `volume_multiplier`). Highlight current week.

**D. Actions** — Pause and Cancel buttons (secondary/text variants).

**E. Empty State** — When no active plan exists, show `EmptyState` with "No Active Training Plan" message and a button linking to the Coach tab.

```typescript
// plan.tsx — key structure
import { RefreshControl, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';

// ---- Helper functions ----

/** Calculate which week number we're currently in (1-indexed). */
function getCurrentWeek(startDate: string): number {
  const start = new Date(startDate).getTime();
  const now = Date.now();
  const diffMs = now - start;
  if (diffMs < 0) return 0; // Plan hasn't started yet
  return Math.floor(diffMs / (7 * 86_400_000)) + 1;
}

/** Get a display color for a phase. */
function getPhaseColor(phase: string, colors: typeof Colors.light): string {
  switch (phase) {
    case 'base': return colors.zoneEndurance;
    case 'build': return colors.zoneThreshold;
    case 'peak': return colors.zoneVO2;
    case 'taper': return colors.zoneRecovery;
    case 'recovery': return colors.zoneRecovery;
    default: return colors.primary;
  }
}

/** Get an icon name for a phase. */
function getPhaseIcon(phase: string): string {
  switch (phase) {
    case 'base': return 'leaf';
    case 'build': return 'trending-up';
    case 'peak': return 'flash';
    case 'taper': return 'battery-charging';
    case 'recovery': return 'bed';
    default: return 'fitness';
  }
}

/** Format a phase focus for display. */
function formatFocus(focus: string): string {
  return focus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Safely parse periodization JSONB. */
function parsePeriodization(json: unknown): {
  phases: Array<{ phase: string; weeks: number; focus: string; intensity_distribution: number[] }>;
  weekly_volumes: Array<{ week: number; volume_multiplier: number; phase: string }>;
} | null {
  if (typeof json !== 'object' || json === null) return null;
  const obj = json as Record<string, unknown>;
  if (!Array.isArray(obj.phases) || !Array.isArray(obj.weekly_volumes)) return null;
  return obj as ReturnType<typeof parsePeriodization>;
}
```

### Step 3: Add Plan Tab to Layout

Modify `apps/mobile/app/(tabs)/_layout.tsx` — insert between Coach and Profile tabs:

```tsx
<Tabs.Screen
  name="plan"
  options={{
    title: 'Plan',
    tabBarIcon: ({ color }) => <TabBarIcon name="clipboard" color={color} />,
  }}
/>
```

Position: After `chat` and before `profile`. This gives the tab order: Dashboard | Check-in | Coach | Plan | Profile.

**Icon choice:** `clipboard` (represents a structured plan). Alternative: `list` or `document-text`.

### Step 4: Write Tests

#### Hook tests (`hooks/__tests__/useTrainingPlan.test.ts`)

```typescript
const mockGetAthleteByAuthUser = jest.fn();
const mockGetActiveTrainingPlan = jest.fn();
const mockPauseTrainingPlan = jest.fn();
const mockCancelTrainingPlan = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getActiveTrainingPlan: (...args: unknown[]) => mockGetActiveTrainingPlan(...args),
  pauseTrainingPlan: (...args: unknown[]) => mockPauseTrainingPlan(...args),
  cancelTrainingPlan: (...args: unknown[]) => mockCancelTrainingPlan(...args),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));
```

**Test cases:**
1. **Initial loading** — `isLoading` true on mount
2. **Successful fetch with plan** — plan populated, isLoading false, error null
3. **Successful fetch with no plan** — plan is null (not an error), empty state renders
4. **Error handling** — error message set, plan null
5. **No user** — skips fetch, stays loading false
6. **Pause plan** — calls `pauseTrainingPlan`, clears plan from state
7. **Cancel plan** — calls `cancelTrainingPlan`, clears plan from state
8. **Refresh** — re-fetches from Supabase
9. **Athlete not found** — sets descriptive error

## Key Design Decisions

### Why `plan.tsx` (not `training-plan.tsx`)?
Tab file names should be short. Expo Router uses the file name as the route name. `plan` is concise and clear in the context of a training app.

### Why parse JSONB at runtime?
The `periodization` column is typed as `Json` (generic). We need runtime validation because:
1. The data comes from the database and could be malformed
2. Following Copilot review pattern #2: "Runtime validation for type assertions"
3. The `parsePeriodization` function returns `null` for invalid data, which triggers a graceful degradation

### Why no chart library?
Simple volume bars can be built with `View` components + dynamic width. This avoids adding a dependency for a single chart. The bars use `volume_multiplier` scaled to a max width.

### Current week calculation
Uses `Date.now()` vs plan `start_date` to determine the current week. This is straightforward and doesn't need timezone precision — a week-level granularity is sufficient.

## Testing Requirements

- `useTrainingPlan.test.ts` with 9+ test cases
- Mock all `@khepri/supabase-client` query functions
- Follow existing `jest-expo/web` patterns
- Use `renderHook` + `waitFor` for async assertions
- Test mutation callbacks (pause, cancel) update local state correctly

## Verification

1. `pnpm test` passes with all new tests
2. `pnpm lint` passes
3. `pnpm typecheck` passes
4. Plan tab appears in tab bar (5th tab: Dashboard | Check-in | Coach | Plan | Profile)
5. Active plan displays: name, dates, phases, volume chart
6. Current week highlighted in volume chart
7. No active plan shows empty state with Coach link
8. Pause/Cancel actions work and clear the active plan
9. Pull-to-refresh re-fetches plan data

## PR Scope

- ~180 lines `plan.tsx` (screen)
- ~70 lines `useTrainingPlan.ts` (hook)
- ~120 lines `useTrainingPlan.test.ts` (tests)
- ~5 lines `_layout.tsx` (tab entry)
- **Total: ~375 lines** — may need splitting if too large
- PR title: `feat(mobile): add training plan screen`
