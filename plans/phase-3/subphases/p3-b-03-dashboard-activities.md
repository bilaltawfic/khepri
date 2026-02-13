# P3-B-03: Fetch and Display Recent Activities

## Goal

Add a "Recent Activities" card to the dashboard that fetches completed workouts from Intervals.icu via the MCP gateway. This completes Phase 3 by bringing real training data into the main app experience.

## Dependencies

- P3-A-05: MCP gateway wired to real Intervals.icu API ✅
- P3-B-02: Encrypted API credentials storage ✅

## Files to Create/Modify

### New Files
- `apps/mobile/services/mcp-client.ts` - Client for calling MCP gateway

### Modified Files
- `apps/mobile/hooks/useDashboard.ts` - Add activities fetching
- `apps/mobile/app/(tabs)/index.tsx` - Add Recent Activities card UI

## Implementation Steps

### Step 1: Create MCP Gateway Client

Create `apps/mobile/services/mcp-client.ts`:

```typescript
import { supabase } from '@/lib/supabase';

export type MCPToolResult<T = unknown> = {
  content: T;
  isError?: boolean;
};

export type Activity = {
  id: string;
  name: string;
  type: string;
  start_date: string;
  moving_time: number;
  distance?: number;
  icu_training_load?: number;
};

export async function callMCPTool<T>(
  toolName: string,
  toolInput: Record<string, unknown> = {}
): Promise<MCPToolResult<T>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    return { content: null as T, isError: true };
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mcp-gateway`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'execute_tool',
        tool_name: toolName,
        tool_input: toolInput,
      }),
    }
  );

  if (!response.ok) {
    return { content: null as T, isError: true };
  }

  return response.json();
}

export async function getRecentActivities(
  daysBack = 7
): Promise<Activity[]> {
  const oldest = new Date();
  oldest.setDate(oldest.getDate() - daysBack);

  const result = await callMCPTool<{ activities: Activity[] }>(
    'get_activities',
    { oldest: oldest.toISOString().split('T')[0] }
  );

  if (result.isError || !result.content?.activities) {
    return [];
  }

  return result.content.activities;
}
```

### Step 2: Add Activity Types to useDashboard

Update `apps/mobile/hooks/useDashboard.ts`:

```typescript
// Add new type
export type RecentActivity = {
  id: string;
  name: string;
  type: string;
  date: string;
  duration: number; // in minutes
  load?: number;
};

// Update DashboardData type to include:
export type DashboardData = {
  // ... existing fields ...
  recentActivities: RecentActivity[];
};
```

### Step 3: Fetch Activities in useDashboard

Update `fetchDashboardData` in `useDashboard.ts`:

```typescript
import { getRecentActivities, type Activity } from '@/services/mcp-client';

// Helper to convert API activity to display format
function activityToDisplay(activity: Activity): RecentActivity {
  return {
    id: activity.id,
    name: activity.name,
    type: activity.type,
    date: activity.start_date,
    duration: Math.round(activity.moving_time / 60),
    load: activity.icu_training_load,
  };
}

// In fetchDashboardData, add parallel fetch:
const [goalsResult, checkinResult, activities] = await Promise.all([
  getActiveGoals(supabase, athlete.id),
  getTodayCheckin(supabase, athlete.id),
  getRecentActivities(7),
]);

// In setData call:
setData({
  // ... existing fields ...
  recentActivities: activities.slice(0, 5).map(activityToDisplay),
});
```

### Step 4: Add Recent Activities Card UI

Update `apps/mobile/app/(tabs)/index.tsx`:

```typescript
// Add helper function
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// Add ActivityRow component
function ActivityRow({ activity }: Readonly<{ activity: RecentActivity }>) {
  return (
    <View style={styles.activityRow} accessibilityRole="text">
      <View style={styles.activityInfo}>
        <ThemedText>{activity.name}</ThemedText>
        <ThemedText type="caption">{activity.type}</ThemedText>
      </View>
      <View style={styles.activityMeta}>
        <ThemedText type="caption">{formatDuration(activity.duration)}</ThemedText>
        {activity.load != null && (
          <ThemedText type="caption" style={styles.loadBadge}>
            {activity.load} TSS
          </ThemedText>
        )}
      </View>
    </View>
  );
}

// Add card in render (after Training Load card):
{/* Recent Activities Card */}
<ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
  <View style={styles.cardHeader}>
    <ThemedText type="subtitle">Recent Activities</ThemedText>
  </View>
  {data?.recentActivities && data.recentActivities.length > 0 ? (
    <View style={styles.activitiesList}>
      {data.recentActivities.map((activity) => (
        <ActivityRow key={activity.id} activity={activity} />
      ))}
    </View>
  ) : (
    <View style={[styles.placeholder, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
      <ThemedText type="caption">
        Connect Intervals.icu to see your activities
      </ThemedText>
    </View>
  )}
</ThemedView>

// Add styles:
activityRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 8,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: 'rgba(0,0,0,0.1)',
},
activityInfo: {
  flex: 1,
  gap: 2,
},
activityMeta: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
activitiesList: {
  gap: 0,
},
loadBadge: {
  backgroundColor: 'rgba(0,0,0,0.05)',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
},
```

## Testing Requirements

### Unit Tests

Create `apps/mobile/services/__tests__/mcp-client.test.ts`:

```typescript
import { getRecentActivities } from '../mcp-client';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

describe('mcp-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('getRecentActivities', () => {
    it('returns empty array when not authenticated', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

      const result = await getRecentActivities();
      expect(result).toEqual([]);
    });

    it('returns activities on success', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });

      const mockActivities = [
        { id: '1', name: 'Morning Ride', type: 'Ride', start_date: '2026-02-13', moving_time: 3600 },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: { activities: mockActivities } }),
      });

      const result = await getRecentActivities();
      expect(result).toEqual(mockActivities);
    });

    it('returns empty array on API error', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
      });

      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      const result = await getRecentActivities();
      expect(result).toEqual([]);
    });
  });
});
```

### Integration Tests

Update dashboard hook tests to verify activities are fetched and displayed.

## Verification Checklist

- [ ] MCP client correctly calls gateway with auth token
- [ ] Activities appear on dashboard when Intervals.icu is connected
- [ ] Graceful fallback when not connected (shows placeholder)
- [ ] Duration formatting is correct (e.g., "1h 30m")
- [ ] Training load badge shows when available
- [ ] Pull-to-refresh updates activities
- [ ] All existing dashboard tests still pass
- [ ] No TypeScript errors
- [ ] Linting passes

## Edge Cases to Handle

1. **No Intervals.icu connection** - Show helpful placeholder
2. **API rate limits** - Return empty array, don't crash
3. **No activities in date range** - Show "No recent activities"
4. **Very long activity names** - Truncate with ellipsis
5. **Zero duration** - Display "0m" not empty

## PR Checklist

- [ ] Add conversation log to `claude-convos/`
- [ ] Ensure all tests pass
- [ ] Run `pnpm lint`
- [ ] Keep PR under 200 lines if possible
