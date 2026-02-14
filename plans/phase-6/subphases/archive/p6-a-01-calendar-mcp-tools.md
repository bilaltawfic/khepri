# P6-A-01: Calendar MCP Tools (Create/Update Events)

**Branch:** `feat/p6-a-01-calendar-mcp-tools`
**Depends on:** P3-A-05 (✅ Complete - Real Intervals.icu API integration)
**Blocks:** P6-A-02 (Wire calendar tools into ai-orchestrator)

## Goal

Add MCP tools to create and update calendar events in Intervals.icu, enabling the AI coach to schedule and modify workouts on the athlete's calendar.

## Files to Create/Modify

### Create
- `supabase/functions/mcp-gateway/tools/create-event.ts` - Tool to create new calendar events
- `supabase/functions/mcp-gateway/tools/update-event.ts` - Tool to update existing events
- `supabase/functions/mcp-gateway/tools/create-event.test.ts` - Unit tests for create
- `supabase/functions/mcp-gateway/tools/update-event.test.ts` - Unit tests for update

### Modify
- `supabase/functions/mcp-gateway/index.ts` - Register new tools
- `supabase/functions/mcp-gateway/utils/intervals-api.ts` - Add create/update API functions

## Implementation Steps

### 1. Add Intervals.icu API Functions

Update `utils/intervals-api.ts` with:

```typescript
/**
 * Create a new event in Intervals.icu calendar.
 */
export async function createEvent(
  credentials: IntervalsCredentials,
  event: {
    name: string;
    type: 'WORKOUT' | 'RACE' | 'NOTE' | 'REST_DAY' | 'TRAVEL';
    start_date_local: string; // ISO 8601
    end_date_local?: string;
    description?: string;
    category?: string;
    moving_time?: number; // seconds
    icu_training_load?: number; // TSS
    distance?: number; // meters
    indoor?: boolean;
    event_priority?: 'A' | 'B' | 'C';
  }
): Promise<IntervalsEvent> {
  const url = `https://intervals.icu/api/v1/athlete/${credentials.athleteId}/events`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`API_KEY:${credentials.apiKey}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new IntervalsApiError(
      `Failed to create event: ${text}`,
      'CREATE_EVENT_ERROR',
      response.status
    );
  }

  return response.json();
}

/**
 * Update an existing event in Intervals.icu calendar.
 */
export async function updateEvent(
  credentials: IntervalsCredentials,
  eventId: string,
  updates: {
    name?: string;
    type?: 'WORKOUT' | 'RACE' | 'NOTE' | 'REST_DAY' | 'TRAVEL';
    start_date_local?: string;
    end_date_local?: string;
    description?: string;
    category?: string;
    moving_time?: number;
    icu_training_load?: number;
    distance?: number;
    indoor?: boolean;
    event_priority?: 'A' | 'B' | 'C';
  }
): Promise<IntervalsEvent> {
  const url = `https://intervals.icu/api/v1/athlete/${credentials.athleteId}/events/${eventId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Basic ${btoa(`API_KEY:${credentials.apiKey}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new IntervalsApiError(
      `Failed to update event ${eventId}: ${text}`,
      'UPDATE_EVENT_ERROR',
      response.status
    );
  }

  return response.json();
}
```

### 2. Create `create-event.ts` Tool

Follow the pattern from `get-events.ts`:

```typescript
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { MCPToolEntry, MCPToolResult } from '../types.ts';
import { getIntervalsCredentials } from '../utils/credentials.ts';
import { IntervalsApiError, createEvent } from '../utils/intervals-api.ts';

const VALID_EVENT_TYPES: ReadonlySet<string> = new Set([
  'WORKOUT',
  'RACE',
  'NOTE',
  'REST_DAY',
  'TRAVEL',
]);

const VALID_PRIORITIES: ReadonlySet<string> = new Set(['A', 'B', 'C']);

const definition = {
  name: 'create_event',
  description:
    'Create a new event on the athlete\'s Intervals.icu calendar. Use this to schedule workouts, races, or notes.',
  input_schema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'Event name (e.g., "Zone 2 Endurance Ride", "Interval Session")',
      },
      type: {
        type: 'string',
        enum: ['WORKOUT', 'RACE', 'NOTE', 'REST_DAY', 'TRAVEL'],
        description: 'Event type',
      },
      start_date_local: {
        type: 'string',
        description: 'Start date/time in ISO 8601 format (e.g., "2026-02-20T07:00:00")',
      },
      end_date_local: {
        type: 'string',
        description: 'End date/time for multi-day events (ISO 8601)',
      },
      description: {
        type: 'string',
        description: 'Detailed workout description or notes',
      },
      category: {
        type: 'string',
        description: 'Activity category (Ride, Run, Swim, etc.)',
      },
      moving_time: {
        type: 'number',
        description: 'Planned duration in seconds',
      },
      icu_training_load: {
        type: 'number',
        description: 'Planned TSS (Training Stress Score)',
      },
      distance: {
        type: 'number',
        description: 'Planned distance in meters',
      },
      indoor: {
        type: 'boolean',
        description: 'Whether this is an indoor workout',
      },
      event_priority: {
        type: 'string',
        enum: ['A', 'B', 'C'],
        description: 'Race priority (A = goal race, B = important, C = training race)',
      },
    },
    required: ['name', 'type', 'start_date_local'] as const,
  },
} as const;

// Validation and handler implementation...
// Follow patterns from get-events.ts
```

**Key validation rules:**
- Validate `type` against `VALID_EVENT_TYPES` before casting
- Validate `event_priority` against `VALID_PRIORITIES` before casting
- Validate ISO 8601 date format for `start_date_local`
- Return error if credentials are missing (cannot create without API access)

### 3. Create `update-event.ts` Tool

Similar structure to create, but:
- Add `event_id` as required parameter
- All other fields are optional (partial update)
- Fetch existing event first to preserve unmodified fields

### 4. Register Tools in `index.ts`

```typescript
import { createEventTool } from './tools/create-event.ts';
import { updateEventTool } from './tools/update-event.ts';

// Add to tool registry
const TOOLS: Record<string, MCPToolEntry> = {
  get_activities: getActivitiesTool,
  get_wellness_data: getWellnessDataTool,
  get_events: getEventsTool,
  create_event: createEventTool,  // NEW
  update_event: updateEventTool,  // NEW
};
```

## Testing Requirements

### Unit Tests

**`create-event.test.ts`:**
- ✅ Creates event with minimal required fields (name, type, start_date)
- ✅ Creates event with all optional fields populated
- ✅ Validates event type against allowed values
- ✅ Validates priority against allowed values (A, B, C)
- ✅ Returns error when credentials are missing
- ✅ Returns error for invalid date format
- ✅ Handles API errors gracefully (401, 500, etc.)

**`update-event.test.ts`:**
- ✅ Updates single field (e.g., just name)
- ✅ Updates multiple fields
- ✅ Validates event_id is provided
- ✅ Returns error when event doesn't exist (404)
- ✅ Returns error when credentials are missing
- ✅ Handles API errors gracefully

### Manual Testing

1. Create a workout via AI coach chat:
   ```
   "Schedule a 45-minute Zone 2 ride for tomorrow at 7am"
   ```
2. Verify event appears in Intervals.icu calendar
3. Update the workout:
   ```
   "Change tomorrow's ride to 60 minutes"
   ```
4. Verify update reflects in Intervals.icu

## Code Patterns to Follow

### Error Handling
```typescript
try {
  const credentials = await getIntervalsCredentials(supabase, athleteId);
  if (!credentials) {
    return {
      success: false,
      error: 'Intervals.icu credentials not configured',
      code: 'NO_CREDENTIALS',
    };
  }

  const event = await createEvent(credentials, validatedInput);
  return { success: true, data: event };
} catch (error) {
  if (error instanceof IntervalsApiError) {
    return { success: false, error: error.message, code: error.code };
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
    code: 'CREATE_EVENT_ERROR',
  };
}
```

### Type Validation
```typescript
// Validate type before casting
if (!VALID_EVENT_TYPES.has(input.type)) {
  return {
    success: false,
    error: `Invalid event type: ${input.type}`,
    code: 'INVALID_EVENT_TYPE',
  };
}
const eventType = input.type as 'WORKOUT' | 'RACE' | 'NOTE' | 'REST_DAY' | 'TRAVEL';
```

## Verification

Task is complete when:
- ✅ Both tools are implemented and registered
- ✅ All unit tests pass
- ✅ Can manually create an event via MCP gateway (curl/REST client)
- ✅ Can manually update an event via MCP gateway
- ✅ Created/updated events appear correctly in Intervals.icu calendar
- ✅ Biome lint passes
- ✅ TypeScript compiles without errors

## Notes

- These tools **require** Intervals.icu credentials - no mock fallback
- The AI orchestrator will call these tools (P6-A-02), but we're just defining them here
- Follow Intervals.icu API docs for field requirements and constraints
- Use the same `IntervalsApiError` pattern for consistent error handling

## Related Tasks

- **Next:** P6-A-02 - Wire these tools into ai-orchestrator
- **Parallel:** P6-B-01 - Training plans schema (independent)
- **Parallel:** P6-B-03 - Periodization logic (independent)
