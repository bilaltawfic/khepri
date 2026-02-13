# Phase 2 Workstream D: Dashboard Real Data

## Goal

Replace placeholder dashboard content with real athlete data from Supabase. Display actual training metrics, today's workout recommendation, and upcoming events/goals.

---

## Current State

**Status: ✅ COMPLETE (3/3 tasks - consolidated into #47)**

- ✅ `apps/mobile/hooks/useDashboard.ts` - Aggregates all dashboard data (#47)
- ✅ `apps/mobile/app/(tabs)/index.tsx` - Fully wired with:
  - Personalized greeting with athlete name
  - Today's workout card (shows recommendation or check-in prompt)
  - Training load card (FTP shown, CTL/ATL/TSB ready for Phase 3)
  - Upcoming events from goals
  - Pull-to-refresh functionality
  - Loading and error states

---

## Scope Clarification

**Phase 2 Dashboard shows:**
- Today's AI recommendation (from last check-in)
- Manual fitness metrics (FTP, weight, etc. from profile)
- Upcoming goals with target dates

**Phase 3 Dashboard will add:**
- Real CTL/ATL/TSB from Intervals.icu
- Synced activities
- Training plan integration

For Phase 2, CTL/ATL/TSB remain as "--" until Intervals.icu integration.

---

## Tasks (3 PRs)

### P2-D-01: Create dashboard data hook
**Branch:** `feat/p2-d-01-dashboard-hook`

**Create files:**
- `apps/mobile/hooks/useDashboard.ts` - Aggregates dashboard data
- `apps/mobile/hooks/__tests__/useDashboard.test.ts`

**useDashboard pattern:**
```typescript
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getAthleteByAuthUser, getActiveGoals, getTodayCheckin } from '@khepri/supabase-client';

type DashboardData = {
  greeting: string;
  todayRecommendation: AIRecommendation | null;
  fitnessMetrics: {
    ftp: number | null;
    weight: number | null;
    // CTL/ATL/TSB null until Phase 3
    ctl: number | null;
    atl: number | null;
    tsb: number | null;
  };
  upcomingEvents: UpcomingEvent[];
  hasCompletedCheckinToday: boolean;
};

type UpcomingEvent = {
  id: string;
  title: string;
  type: 'goal' | 'constraint' | 'workout';
  date: string;
  priority?: 'A' | 'B' | 'C';
};

export function useDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !supabase) {
      setIsLoading(false);
      return;
    }

    async function fetchDashboardData() {
      try {
        // First resolve athlete record from auth user id
        const athlete = await getAthleteByAuthUser(supabase!, user!.id);
        if (!athlete) {
          throw new Error('Athlete profile not found');
        }

        const [goals, todayCheckin] = await Promise.all([
          getActiveGoals(supabase!, athlete.id),
          getTodayCheckin(supabase!, athlete.id),
        ]);

        // Use display_name from athlete profile
        const greeting = getGreeting(athlete.display_name ?? undefined);
        const todayRecommendation = todayCheckin?.ai_recommendation ?? null;
        const hasCompletedCheckinToday = todayCheckin != null;

        const upcomingEvents = goals
          .filter((g) => g.target_date)
          .map((g) => ({
            id: g.id,
            title: g.title,
            type: 'goal' as const,
            date: g.target_date!,
            priority: g.priority as 'A' | 'B' | 'C',
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5);

        setData({
          greeting,
          todayRecommendation,
          fitnessMetrics: {
            ftp: athlete.ftp_watts ?? null,
            weight: athlete.weight_kg ? Number(athlete.weight_kg) : null,
            ctl: null, // Phase 3 (from Intervals.icu)
            atl: null, // Phase 3 (from Intervals.icu)
            tsb: null, // Phase 3 (from Intervals.icu)
          },
          upcomingEvents,
          hasCompletedCheckinToday,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [user?.id, refreshKey]);

  // Use a refresh key to trigger refetch
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Add refreshKey to useEffect dependencies to trigger refetch

  return { data, isLoading, error, refresh };
}

function getGreeting(firstName?: string): string {
  const hour = new Date().getHours();
  const name = firstName ? `, ${firstName}` : '';

  if (hour < 12) return `Good morning${name}!`;
  if (hour < 17) return `Good afternoon${name}!`;
  return `Good evening${name}!`;
}

function isToday(dateString?: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}
```

**Test:** Data aggregates correctly, greeting varies by time, events sorted

---

### P2-D-02: Display today's workout and check-in status
**Branch:** `feat/p2-d-02-todays-workout-card`

**Modify files:**
- `apps/mobile/app/(tabs)/index.tsx` - Use useDashboard, show workout card

**Changes to workout card:**
1. If no check-in today: Show prompt to complete check-in with CTA button
2. If check-in complete: Show AI recommendation with intensity, duration, notes
3. Add pull-to-refresh to reload dashboard data

**UI pattern:**
```typescript
function TodayWorkoutCard({ recommendation, hasCheckedIn, colorScheme }: Props) {
  if (!hasCheckedIn) {
    return (
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Today's Workout</ThemedText>
        <ThemedText>Complete your daily check-in to get personalized recommendations.</ThemedText>
        <Button
          title="Start Check-in"
          onPress={() => router.push('/checkin')}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle">Today's Workout</ThemedText>
        <IntensityBadge level={recommendation.intensityLevel} />
      </View>
      <ThemedText type="defaultSemiBold">{recommendation.workoutSuggestion}</ThemedText>
      <ThemedText>{recommendation.summary}</ThemedText>
      <View style={styles.workoutMeta}>
        <Ionicons name="time-outline" />
        <ThemedText type="caption">{recommendation.duration} min</ThemedText>
      </View>
    </ThemedView>
  );
}
```

**Test:** Card shows correct state based on check-in status

---

### P2-D-03: Display upcoming events and fitness metrics
**Branch:** `feat/p2-d-03-events-metrics-cards`

**Modify files:**
- `apps/mobile/app/(tabs)/index.tsx` - Show events list and metrics

**Create files:**
- `apps/mobile/components/EventCard.tsx` - Reusable event display
- `apps/mobile/components/__tests__/EventCard.test.tsx`

**Training Load card changes:**
- Show FTP and weight if available
- CTL/ATL/TSB remain "--" with tooltip "Connect Intervals.icu to see"
- Link to profile to update values

**Upcoming Events card changes:**
1. Show next 5 goals/events with dates
2. Color-code by priority (A=red, B=yellow, C=green)
3. Show days remaining for each
4. Empty state if no upcoming events
5. CTA to add a goal if empty

**EventCard pattern:**
```typescript
type EventCardProps = {
  event: UpcomingEvent;
  colorScheme: 'light' | 'dark';
};

export function EventCard({ event, colorScheme }: EventCardProps) {
  const daysUntil = getDaysUntil(event.date);
  const priorityColor = event.priority ? PRIORITY_COLORS[event.priority] : null;

  return (
    <View style={styles.eventCard}>
      {priorityColor && (
        <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
      )}
      <View style={styles.eventContent}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {event.title}
        </ThemedText>
        <ThemedText type="caption">
          {formatDate(event.date)} • {formatDaysUntil(daysUntil)}
        </ThemedText>
      </View>
    </View>
  );
}

function formatDaysUntil(days: number): string {
  if (days < 0) return 'Past';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}
```

**Test:** Events display sorted by date, metrics show correct values

---

## Dependencies

```
P2-D-01 ─────→ P2-D-02 (needs hook)
         └───→ P2-D-03 (needs hook)
```

- P2-D-01 must complete first (creates the data hook)
- P2-D-02 and P2-D-03 can run in parallel after P2-D-01

External dependencies:
- Needs P2-A-05 (save onboarding data) for initial data
- Needs P2-B (profile management) for editable metrics
- Works best with P2-C (Claude integration) for real recommendations

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Dashboard screen | `apps/mobile/app/(tabs)/index.tsx` |
| Check-in tab | `apps/mobile/app/(tabs)/checkin.tsx` |
| Profile tab | `apps/mobile/app/(tabs)/profile.tsx` |
| Athlete queries | `packages/supabase-client/src/queries/athlete.ts` |
| Goals queries | `packages/supabase-client/src/queries/goals.ts` |
| Check-in queries | `packages/supabase-client/src/queries/checkins.ts` |

---

## Testing Approach

- Unit test for useDashboard with mocked queries
- Test greeting based on mocked time
- Component tests for card states (loading, empty, populated)
- Test pull-to-refresh behavior

---

## Verification

After all 3 PRs merged:
1. Dashboard shows personalized greeting with name
2. Today's Workout shows check-in prompt if not done
3. Complete check-in → workout recommendation appears
4. Upcoming events show goals sorted by date
5. Fitness metrics show values from profile
6. Pull-to-refresh updates data
7. Empty states guide user to relevant actions
