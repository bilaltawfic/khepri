# P2-D-01: Create Dashboard Data Hook

## Branch
```bash
git checkout feat/p2-d-01-dashboard-hook
```

## Goal
Create a `useDashboard` hook that aggregates data for the dashboard screen, and wire the dashboard to display real data instead of hardcoded placeholders.

## Current State
- `apps/mobile/app/(tabs)/index.tsx` - Dashboard shows hardcoded placeholders:
  - "Good morning!" (not personalized)
  - CTL/ATL/TSB show "--"
  - "Complete your daily check-in to get started"
  - "No upcoming events"
- No data fetching on dashboard
- Related hooks exist: `useAthleteProfile`, `useGoals` (can reference patterns)

## Changes Required

### 1. Create useDashboard hook

Create `apps/mobile/hooks/useDashboard.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import {
  type GoalRow,
  getActiveGoals,
  getAthleteByAuthUser,
  getTodayCheckin,
} from '@khepri/supabase-client';

export type DashboardData = {
  greeting: string;
  athleteName: string | null;
  todayRecommendation: TodayRecommendation | null;
  hasCompletedCheckinToday: boolean;
  fitnessMetrics: FitnessMetrics;
  upcomingEvents: UpcomingEvent[];
};

export type TodayRecommendation = {
  workoutSuggestion: string;
  intensityLevel: 'easy' | 'moderate' | 'hard';
  duration: number; // minutes
  summary: string;
};

export type FitnessMetrics = {
  ftp: number | null;
  weight: number | null;
  // CTL/ATL/TSB will be null until Phase 3 (Intervals.icu integration)
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
};

export type UpcomingEvent = {
  id: string;
  title: string;
  type: 'goal' | 'constraint' | 'workout';
  date: string;
  priority?: 'A' | 'B' | 'C';
};

export type UseDashboardReturn = {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

function getGreeting(firstName?: string | null): string {
  const hour = new Date().getHours();
  const name = firstName ? `, ${firstName}` : '';

  if (hour < 12) return `Good morning${name}!`;
  if (hour < 17) return `Good afternoon${name}!`;
  return `Good evening${name}!`;
}

function getFirstName(displayName: string | null): string | null {
  if (!displayName) return null;
  return displayName.split(' ')[0] ?? null;
}

function parseRecommendation(json: unknown): TodayRecommendation | null {
  if (!json || typeof json !== 'object') return null;
  const rec = json as Record<string, unknown>;

  // Validate required fields exist
  if (typeof rec.workoutSuggestion !== 'string') return null;
  if (typeof rec.summary !== 'string') return null;

  // Validate intensityLevel
  const validIntensities = ['easy', 'moderate', 'hard'];
  const intensity = validIntensities.includes(rec.intensityLevel as string)
    ? (rec.intensityLevel as 'easy' | 'moderate' | 'hard')
    : 'moderate';

  return {
    workoutSuggestion: rec.workoutSuggestion,
    intensityLevel: intensity,
    duration: typeof rec.duration === 'number' ? rec.duration : 60,
    summary: rec.summary,
  };
}

function goalsToEvents(goals: GoalRow[]): UpcomingEvent[] {
  return goals
    .filter((g) => g.target_date && g.status === 'active')
    .map((g) => ({
      id: g.id,
      title: g.title,
      type: 'goal' as const,
      date: g.target_date!,
      priority: (g.priority as 'A' | 'B' | 'C') ?? undefined,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
}

export function useDashboard(): UseDashboardReturn {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id || !supabase) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get athlete profile
      const athleteResult = await getAthleteByAuthUser(supabase, user.id);

      if (athleteResult.error) {
        setError(athleteResult.error.message);
        setData(null);
        setIsLoading(false);
        return;
      }

      if (!athleteResult.data) {
        setError('No athlete profile found');
        setData(null);
        setIsLoading(false);
        return;
      }

      const athlete = athleteResult.data;
      const firstName = getFirstName(athlete.display_name);

      // Step 2: Fetch goals and today's check-in in parallel
      const [goalsResult, checkinResult] = await Promise.all([
        getActiveGoals(supabase, athlete.id),
        getTodayCheckin(supabase, athlete.id),
      ]);

      // Handle goals
      const goals = goalsResult.data ?? [];
      const upcomingEvents = goalsToEvents(goals);

      // Handle check-in
      const todayCheckin = checkinResult.data;
      const hasCompletedCheckinToday = todayCheckin != null;
      const todayRecommendation = todayCheckin?.ai_recommendation
        ? parseRecommendation(todayCheckin.ai_recommendation)
        : null;

      setData({
        greeting: getGreeting(firstName),
        athleteName: firstName,
        todayRecommendation,
        hasCompletedCheckinToday,
        fitnessMetrics: {
          ftp: athlete.ftp_watts ?? null,
          weight: athlete.weight_kg != null ? Number(athlete.weight_kg) : null,
          // These remain null until Phase 3 (Intervals.icu)
          ctl: null,
          atl: null,
          tsb: null,
        },
        upcomingEvents,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const refresh = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, isLoading, error, refresh };
}
```

### 2. Add getActiveGoals to supabase-client (if not exists)

Check if `getActiveGoals` exists in `packages/supabase-client/src/queries/goals.ts`. If not, add it:

```typescript
export async function getActiveGoals(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<GoalRow[]>> {
  const { data, error } = await client
    .from('goals')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .order('priority', { ascending: true });

  return {
    data,
    error: error ? createError(error) : null,
  };
}
```

### 3. Update dashboard screen to use hook

Update `apps/mobile/app/(tabs)/index.tsx`:

```typescript
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useDashboard, type UpcomingEvent } from '@/hooks';

// ... component code using useDashboard()
```

### 4. Create test file

Create `apps/mobile/hooks/__tests__/useDashboard.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { useDashboard } from '../useDashboard';

// Mock dependencies
jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

const mockAthlete = {
  id: 'athlete-123',
  display_name: 'John Doe',
  ftp_watts: 250,
  weight_kg: 70,
};

const mockGoals = [
  {
    id: 'goal-1',
    title: 'Complete Ironman',
    status: 'active',
    target_date: '2024-09-15',
    priority: 'A',
  },
];

const mockCheckin = {
  id: 'checkin-1',
  ai_recommendation: {
    workoutSuggestion: 'Easy recovery ride',
    intensityLevel: 'easy',
    duration: 45,
    summary: 'Take it easy today',
  },
};

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: jest.fn(() => Promise.resolve({ data: mockAthlete, error: null })),
  getActiveGoals: jest.fn(() => Promise.resolve({ data: mockGoals, error: null })),
  getTodayCheckin: jest.fn(() => Promise.resolve({ data: mockCheckin, error: null })),
}));

describe('useDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useDashboard());
    expect(result.current.isLoading).toBe(true);
  });

  it('fetches and returns dashboard data', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.athleteName).toBe('John');
    expect(result.current.data?.fitnessMetrics.ftp).toBe(250);
    expect(result.current.data?.hasCompletedCheckinToday).toBe(true);
    expect(result.current.data?.upcomingEvents).toHaveLength(1);
  });

  it('returns personalized greeting with first name', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.greeting).toMatch(/John/);
  });

  it('parses AI recommendation correctly', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.todayRecommendation).toEqual({
      workoutSuggestion: 'Easy recovery ride',
      intensityLevel: 'easy',
      duration: 45,
      summary: 'Take it easy today',
    });
  });

  it('handles missing check-in gracefully', async () => {
    const { getTodayCheckin } = require('@khepri/supabase-client');
    getTodayCheckin.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.hasCompletedCheckinToday).toBe(false);
    expect(result.current.data?.todayRecommendation).toBeNull();
  });

  it('handles errors gracefully', async () => {
    const { getAthleteByAuthUser } = require('@khepri/supabase-client');
    getAthleteByAuthUser.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' }
    });

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Database error');
    expect(result.current.data).toBeNull();
  });
});
```

### 5. Export from hooks index

Update `apps/mobile/hooks/index.ts` to export the new hook:

```typescript
export { useDashboard, type UseDashboardReturn, type DashboardData } from './useDashboard';
```

## Files to Create
- `apps/mobile/hooks/useDashboard.ts` - Main hook
- `apps/mobile/hooks/__tests__/useDashboard.test.ts` - Tests

## Files to Modify
- `apps/mobile/hooks/index.ts` - Add export
- `apps/mobile/app/(tabs)/index.tsx` - Use the hook (basic wiring)
- `packages/supabase-client/src/queries/goals.ts` - Add getActiveGoals if missing

## Data Flow
```
useDashboard()
  └── useAuth() → user.id
  └── getAthleteByAuthUser() → athlete profile
  └── Promise.all([
        getActiveGoals() → upcoming events
        getTodayCheckin() → recommendation
      ])
  └── Return aggregated DashboardData
```

## Checklist
- [ ] Create useDashboard hook with proper types
- [ ] Implement getGreeting() with time-based logic
- [ ] Parse AI recommendation from JSON safely
- [ ] Convert goals to UpcomingEvent format
- [ ] Handle loading/error/empty states
- [ ] Add refresh callback
- [ ] Export from hooks index
- [ ] Basic wiring to dashboard screen (loading/error states)
- [ ] Write comprehensive tests
- [ ] Run `pnpm lint` and `pnpm test`

## Notes
- CTL/ATL/TSB remain null until Phase 3 (Intervals.icu integration)
- The hook should handle missing data gracefully (new users)
- Use runtime validation for AI recommendation JSON parsing
- Follow existing hook patterns (useGoals, useAthleteProfile)

## PR Guidelines
- Keep PR focused on hook creation + basic wiring
- Full dashboard UI updates will be in P2-D-02 and P2-D-03
- Follow conventional commit: `feat(mobile): add useDashboard hook for aggregated data`
