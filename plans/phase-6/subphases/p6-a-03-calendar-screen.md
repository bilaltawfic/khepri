# P6-A-03: Build Calendar Screen in Mobile App

## Goal

Build a calendar tab screen in the mobile app that displays Intervals.icu events (workouts, races, rest days, notes, travel) fetched via the MCP gateway `get_events` tool. The screen shows a scrollable weekly/daily agenda view with event cards, pull-to-refresh, and navigation between date ranges.

**Dependencies:** P6-A-02 (calendar tools wired into AI orchestrator) - assumed complete.

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `apps/mobile/app/(tabs)/calendar.tsx` | Calendar tab screen |
| `apps/mobile/hooks/useCalendarEvents.ts` | Data-fetching hook for calendar events |
| `apps/mobile/services/calendar.ts` | MCP gateway service for event fetching |
| `apps/mobile/hooks/__tests__/useCalendarEvents.test.ts` | Hook unit tests |
| `apps/mobile/app/(tabs)/__tests__/calendar.test.tsx` | Screen render tests |

### Modified Files
| File | Change |
|------|--------|
| `apps/mobile/app/(tabs)/_layout.tsx` | Add Calendar tab entry |

## Implementation Steps

### Step 1: Add Calendar Service (`services/calendar.ts`)

Create a service following the pattern in `services/intervals.ts` (lines 94-121 for `getRecentActivities`):

```typescript
import { formatDateLocal } from '@khepri/core';
import { supabase } from '@/lib/supabase';

interface MCPToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Matches CalendarEvent in mcp-gateway/tools/get-events.ts:9-22
export interface CalendarEvent {
  readonly id: string;
  readonly name: string;
  readonly type: 'workout' | 'race' | 'note' | 'rest_day' | 'travel';
  readonly start_date: string;
  readonly end_date?: string;
  readonly description?: string;
  readonly category?: string;
  readonly planned_duration?: number; // seconds
  readonly planned_tss?: number;
  readonly planned_distance?: number; // meters
  readonly indoor?: boolean;
  readonly priority?: 'A' | 'B' | 'C';
}

interface EventsResponse {
  events: CalendarEvent[];
  total: number;
  source: string;
  date_range: { oldest: string; newest: string };
}

function getMCPGatewayUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('EXPO_PUBLIC_SUPABASE_URL is not configured');
  return `${url}/functions/v1/mcp-gateway`;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch calendar events from Intervals.icu via MCP gateway.
 * Default range: today to 14 days ahead.
 */
export async function getCalendarEvents(
  oldest?: string,
  newest?: string
): Promise<CalendarEvent[]> {
  const headers = await getAuthHeaders();

  const today = formatDateLocal(new Date());
  const twoWeeksOut = new Date();
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
  const defaultNewest = formatDateLocal(twoWeeksOut);

  const response = await fetch(getMCPGatewayUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'execute_tool',
      tool_name: 'get_events',
      tool_input: {
        oldest: oldest ?? today,
        newest: newest ?? defaultNewest,
      },
    }),
  });

  if (!response.ok) throw new Error('Failed to fetch calendar events');

  const result: MCPToolResponse<EventsResponse> = await response.json();
  if (!result.success || !result.data) return [];

  return result.data.events;
}
```

### Step 2: Create Data-Fetching Hook (`hooks/useCalendarEvents.ts`)

Follow the `useDashboard.ts` hook pattern (state, loading, error, refresh):

```typescript
import { useCallback, useEffect, useState } from 'react';
import { formatDateLocal } from '@khepri/core';
import { useAuth } from '@/contexts/AuthContext';
import { getCalendarEvents, type CalendarEvent } from '@/services/calendar';

export interface UseCalendarEventsReturn {
  readonly events: CalendarEvent[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly dateRange: { oldest: string; newest: string };
  readonly refresh: () => Promise<void>;
  readonly navigateForward: () => void;
  readonly navigateBack: () => void;
}

/**
 * Hook that fetches calendar events for a 2-week window.
 * Supports navigating forward/back by 2-week increments.
 */
export function useCalendarEvents(): UseCalendarEventsReturn {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => new Date());

  const oldest = formatDateLocal(startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 13);
  const newest = formatDateLocal(endDate);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCalendarEvents(oldest, newest);
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, oldest, newest]);

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);

  const navigateForward = useCallback(() => {
    setStartDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 14);
      return next;
    });
  }, []);

  const navigateBack = useCallback(() => {
    setStartDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 14);
      return next;
    });
  }, []);

  return {
    events,
    isLoading,
    error,
    dateRange: { oldest, newest },
    refresh: fetchEvents,
    navigateForward,
    navigateBack,
  };
}
```

### Step 3: Build Calendar Screen (`app/(tabs)/calendar.tsx`)

Use existing components: `ScreenContainer`, `ThemedText`, `ThemedView`, `LoadingState`, `ErrorState`, `EmptyState`.

Key UI elements:
- **Header**: Date range display with forward/back chevron buttons
- **Agenda list**: `ScrollView` with `RefreshControl` (pull-to-refresh)
- **Event cards**: Grouped by date, styled with category color coding
- **Empty state**: When no events exist in the date range

```typescript
// calendar.tsx — key structure
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import type { CalendarEvent } from '@/services/calendar';

// Group events by date for agenda view
function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const dateKey = event.start_date.slice(0, 10); // YYYY-MM-DD
    const existing = grouped.get(dateKey) ?? [];
    existing.push(event);
    grouped.set(dateKey, existing);
  }
  return grouped;
}

// Event type → icon mapping
function getEventIcon(type: CalendarEvent['type']): string {
  switch (type) {
    case 'workout': return 'barbell';
    case 'race': return 'trophy';
    case 'rest_day': return 'bed';
    case 'note': return 'document-text';
    case 'travel': return 'airplane';
  }
}

// Format duration from seconds to readable string
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
```

### Step 4: Add Calendar Tab to Layout

Modify `apps/mobile/app/(tabs)/_layout.tsx` to add the calendar tab between Check-in and Coach:

```tsx
<Tabs.Screen
  name="calendar"
  options={{
    title: 'Calendar',
    tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
  }}
/>
```

Position: Insert between the `checkin` and `chat` Tabs.Screen entries.

### Step 5: Write Tests

#### Hook tests (`hooks/__tests__/useCalendarEvents.test.ts`)

Test cases:
1. **Initial loading state** — `isLoading` true, events empty
2. **Successful fetch** — events populated, isLoading false
3. **Error handling** — error message set, events empty
4. **Navigate forward** — date range shifts +14 days, re-fetches
5. **Navigate back** — date range shifts -14 days, re-fetches
6. **Refresh** — re-fetches current date range
7. **No user** — skips fetch, stays in initial state

Mock pattern (from `useDashboard.test.ts`):
```typescript
const mockGetCalendarEvents = jest.fn();
jest.mock('@/services/calendar', () => ({
  getCalendarEvents: (...args: unknown[]) => mockGetCalendarEvents(...args),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));
```

#### Screen tests (`app/(tabs)/__tests__/calendar.test.tsx`)

Test cases:
1. **Loading state renders** — shows LoadingState component
2. **Events render** — shows event cards with name, type icon, duration
3. **Empty state** — shows EmptyState when no events
4. **Error state** — shows ErrorState with retry
5. **Date grouping** — events grouped under date headers

## Testing Requirements

- All new files must have corresponding test files
- Mock `@/services/calendar` for hook tests (never call real MCP gateway)
- Mock `useCalendarEvents` for screen tests
- Follow existing `jest-expo/web` preset patterns
- Use `toJSON()` + string search for text assertions

## Verification

1. `pnpm test` passes with all new tests
2. `pnpm lint` passes (Biome sorted imports)
3. `pnpm typecheck` passes
4. Calendar tab appears in tab bar
5. Events display grouped by date in agenda format
6. Forward/back navigation changes date range and re-fetches
7. Pull-to-refresh works
8. Loading, error, and empty states render correctly

## PR Scope

- ~200-250 lines of implementation code
- ~150-200 lines of tests
- 5 new files, 1 modified file
- PR title: `feat(mobile): add calendar screen with event display`
