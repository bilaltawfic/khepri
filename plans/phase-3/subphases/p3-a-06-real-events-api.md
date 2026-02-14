# P3-A-06: Wire get_events to Real Intervals.icu API

## Goal

Replace mock data in the `get_events` MCP tool with real Intervals.icu API calls. The `fetchEvents()` utility already exists in `intervals-api.ts` — this task just wires it up, following the same pattern as `get_activities`.

## Dependencies

- ✅ P3-A-01: MCP gateway scaffold
- ✅ P3-A-05: Intervals.icu API utilities (fetchEvents exists)
- ✅ P3-B-02: Credential storage

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/mcp-gateway/tools/get-events.ts` | Modify | Replace mock with real API call |
| `supabase/functions/mcp-gateway/tools/__tests__/get-events.test.ts` | Modify | Add tests for real API path |

## Implementation Steps

### Step 1: Add Supabase Client to Handler Signature

The handler at ~line 242 currently ignores the `athleteId` parameter:
```typescript
async function handler(input: Record<string, unknown>, _athleteId: string): Promise<MCPToolResult>
```

Update to match `get_activities` pattern:
```typescript
async function handler(
  input: Record<string, unknown>,
  athleteId: string,
  supabase: SupabaseClient
): Promise<MCPToolResult>
```

### Step 2: Replace Mock Data with Real API Call

At ~line 246, replace:
```typescript
// TODO (P3-A-05): Fetch real data from Intervals.icu API
let filtered = filterEventsByDateRange(MOCK_EVENTS, params.oldest, params.newest);
```

With the credential check + real API call pattern from `get_activities`:
```typescript
const credentials = await getIntervalsCredentials(supabase, athleteId);

let events: CalendarEvent[];
if (!credentials) {
  // Fallback to mock data when no Intervals.icu connection
  events = filterEventsByDateRange(MOCK_EVENTS, params.oldest, params.newest);
} else {
  const rawEvents = await fetchEvents(credentials, {
    oldest: params.oldest,
    newest: params.newest,
  });
  events = rawEvents.map(transformIntervalsEvent);
}
```

### Step 3: Create Transform Function

Map `IntervalsEvent` → `CalendarEvent`:
```typescript
function transformIntervalsEvent(event: IntervalsEvent): CalendarEvent {
  return {
    id: String(event.id),
    name: event.name,
    type: normalizeEventType(event.type),
    start_date: event.start_date_local,
    end_date: event.end_date_local,
    description: event.description,
    category: event.category,
    planned_duration: event.moving_time,
    planned_tss: event.icu_training_load,
    planned_distance: event.distance,
    indoor: event.indoor,
    priority: normalizeEventPriority(event.event_priority),
  };
}
```

Normalize Intervals.icu type strings (UPPERCASE) to tool types (lowercase):
```typescript
function normalizeEventType(type: string): CalendarEvent['type'] {
  const typeMap: Record<string, CalendarEvent['type']> = {
    WORKOUT: 'workout',
    RACE: 'race',
    NOTE: 'note',
    REST_DAY: 'rest_day',
  };
  return typeMap[type] ?? 'workout';
}
```

### Step 4: Handle Errors

Follow `get_activities` error pattern — all `IntervalsApiError` types (including `INVALID_CREDENTIALS`) return an error response. Non-API errors bubble up to the outer catch-all:
```typescript
// fetchEvents may throw IntervalsApiError — handled by outer catch
const rawEvents = await fetchEvents(credentials, { oldest, newest });
events = rawEvents.map(transformIntervalsEvent);
```

### Step 5: Write Tests

- Tests real API path when credentials exist (mock `fetchEvents`)
- Tests fallback to mock data when no credentials
- Tests `transformIntervalsEvent` mapping (all fields)
- Tests `normalizeEventType` with known + unknown types
- Tests error handling for API failures
- Tests filter application after real data fetch

## Testing Requirements

- Unit tests with mocked `fetchEvents` and `getIntervalsCredentials`
- Verify transform maps all fields correctly (especially type normalization)
- Verify filters (date range, event type, category) apply to real data
- Test graceful degradation on credential/API errors

## Verification

1. `pnpm test` passes
2. With Intervals.icu credentials configured: events reflect real calendar
3. Without credentials: mock data returned (existing behavior preserved)
4. Dashboard upcoming events show real data when connected

## Key Considerations

- **Backwards compatible**: Mock fallback preserved for users without Intervals.icu
- **Type normalization**: Intervals.icu uses UPPERCASE types; validate against known set
- **Follow existing pattern**: Match `get_activities` implementation exactly
- **Handler signature**: Must match `MCPToolHandler` type (input, athleteId, supabase)
