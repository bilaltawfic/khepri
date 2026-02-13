# P3-A-04: Add get_events Tool Handler

## Goal

Add a `get_events` MCP tool to fetch calendar events (planned workouts, races, rest days) from Intervals.icu. This enables the AI coach to understand the athlete's training schedule and make context-aware recommendations.

## Dependencies

- P3-A-01 (MCP Gateway scaffold) ✅

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/mcp-gateway/tools/get-events.ts` | Create | Tool implementation with mock data |
| `supabase/functions/mcp-gateway/tools/index.ts` | Modify | Register the new tool |

## Implementation Steps

### Step 1: Create get-events.ts Tool File

Create `supabase/functions/mcp-gateway/tools/get-events.ts` following the existing patterns.

**Event interface (based on Intervals.icu API):**

```typescript
interface CalendarEvent {
  id: string;
  name: string;
  type: 'workout' | 'race' | 'note' | 'rest_day' | 'travel';
  start_date: string; // ISO 8601
  end_date?: string; // For multi-day events
  description?: string;
  category?: string; // e.g., "Ride", "Run", "Swim"
  planned_duration?: number; // seconds
  planned_tss?: number;
  planned_distance?: number; // meters
  indoor?: boolean;
  priority?: 'A' | 'B' | 'C'; // Race priority
}
```

**Tool definition:**

```typescript
const definition = {
  name: 'get_events',
  description:
    "Get upcoming calendar events from the athlete's Intervals.icu account. Returns planned workouts, races, rest days, and notes.",
  input_schema: {
    type: 'object' as const,
    properties: {
      oldest: {
        type: 'string',
        description: 'Start date for events (ISO 8601 format). Defaults to today.',
      },
      newest: {
        type: 'string',
        description: 'End date for events (ISO 8601 format). Defaults to 14 days from today.',
      },
      types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by event types: workout, race, note, rest_day, travel',
      },
      category: {
        type: 'string',
        description: 'Filter by activity category (Ride, Run, Swim, etc.)',
      },
    },
    required: [] as const,
  },
} as const;
```

### Step 2: Implement Input Parsing

Follow the same pattern as `get-wellness.ts`:
- Validate dates with round-trip check
- Default `oldest` to today
- Default `newest` to 14 days from today
- Cap maximum range at 90 days
- Auto-swap if oldest > newest

### Step 3: Create Mock Data Generator

Generate realistic mock events:

```typescript
const MOCK_EVENTS: readonly CalendarEvent[] = [
  {
    id: 'mock-event-1',
    name: 'Zone 2 Endurance Ride',
    type: 'workout',
    start_date: '2026-02-14T07:00:00Z',
    category: 'Ride',
    planned_duration: 5400, // 90 min
    planned_tss: 65,
    indoor: false,
  },
  {
    id: 'mock-event-2',
    name: 'Recovery Day',
    type: 'rest_day',
    start_date: '2026-02-15T00:00:00Z',
    description: 'Active recovery or complete rest',
  },
  {
    id: 'mock-event-3',
    name: 'Local Sprint Triathlon',
    type: 'race',
    start_date: '2026-03-01T08:00:00Z',
    category: 'Triathlon',
    priority: 'B',
    description: 'Season opener',
  },
  // ... more events
];
```

### Step 4: Implement Handler

```typescript
async function handler(
  input: Record<string, unknown>,
  _athleteId: string
): Promise<MCPToolResult> {
  try {
    const params = parseInput(input);

    // TODO (P3-A-05): Fetch real data from Intervals.icu API
    let filtered = filterEventsByDateRange(MOCK_EVENTS, params.oldest, params.newest);

    if (params.types && params.types.length > 0) {
      filtered = filtered.filter((e) => params.types?.includes(e.type));
    }

    if (params.category) {
      filtered = filtered.filter(
        (e) => e.category?.toLowerCase() === params.category?.toLowerCase()
      );
    }

    return {
      success: true,
      data: {
        events: filtered,
        total: filtered.length,
        date_range: {
          oldest: params.oldest,
          newest: params.newest,
        },
        filters_applied: {
          types: params.types,
          category: params.category,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get events',
      code: 'GET_EVENTS_ERROR',
    };
  }
}
```

### Step 5: Register Tool in index.ts

Update `supabase/functions/mcp-gateway/tools/index.ts`:

```typescript
import { getEventsTool } from './get-events.ts';

// In registrations section:
registerTool(getEventsTool);
```

Remove the placeholder comment `// - P3-A-04: registerTool(getEventsTool)`

## Testing Requirements

### Manual Testing

1. Deploy function: `supabase functions deploy mcp-gateway`
2. Test list_tools returns the new tool
3. Test execute_tool with various inputs:
   - No parameters (defaults)
   - Date range filtering
   - Type filtering
   - Category filtering
   - Invalid dates (should use defaults)
   - Empty results

### Test Commands

```bash
# List tools - verify get_events appears
curl -X POST $SUPABASE_URL/functions/v1/mcp-gateway \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "list_tools"}'

# Get events with defaults
curl -X POST $SUPABASE_URL/functions/v1/mcp-gateway \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "execute_tool",
    "tool_name": "get_events",
    "tool_input": {}
  }'

# Get events with filters
curl -X POST $SUPABASE_URL/functions/v1/mcp-gateway \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "execute_tool",
    "tool_name": "get_events",
    "tool_input": {
      "types": ["workout", "race"],
      "oldest": "2026-02-14",
      "newest": "2026-03-14"
    }
  }'
```

## Code Patterns to Follow

1. **Type safety**: Use `as const` assertions for definitions
2. **Input validation**: Always validate and normalize inputs
3. **Date handling**: Use UTC throughout to avoid timezone issues
4. **Error handling**: Return structured errors with codes
5. **Documentation**: Include TODO comments for P3-A-05 real API integration

## Verification Checklist

- [ ] Tool file created at correct path
- [ ] Tool follows existing patterns (definition, parseInput, handler, export)
- [ ] Tool registered in index.ts
- [ ] Placeholder comment removed from index.ts
- [ ] Mock data is realistic and covers various event types
- [ ] Date filtering works correctly
- [ ] Type and category filtering work correctly
- [ ] Function deploys successfully
- [ ] list_tools includes get_events
- [ ] execute_tool returns expected mock data
- [ ] Lint passes (`pnpm lint`)

## Estimated Time

1-2 hours
