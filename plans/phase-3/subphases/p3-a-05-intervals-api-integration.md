# P3-A-05: Wire to Real Intervals.icu API

## Goal

Connect the MCP gateway tools to the real Intervals.icu API, replacing mock data with live athlete data. This enables the AI coach to provide personalized recommendations based on actual training history.

## Dependencies

- P3-A-02 (get_activities tool) ✅
- P3-B-02 (encrypted credentials storage) ✅

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/mcp-gateway/utils/intervals-api.ts` | Create | Intervals.icu API client |
| `supabase/functions/mcp-gateway/utils/credentials.ts` | Create | Credential fetching and decryption |
| `supabase/functions/mcp-gateway/tools/get-activities.ts` | Modify | Use real API |
| `supabase/functions/mcp-gateway/tools/get-wellness.ts` | Modify | Use real API |
| `supabase/functions/mcp-gateway/tools/get-events.ts` | Modify | Use real API (if P3-A-04 done) |
| `supabase/functions/mcp-gateway/index.ts` | Modify | Pass Supabase client to tools |

## Implementation Steps

### Step 1: Create Credential Utilities

Create `supabase/functions/mcp-gateway/utils/credentials.ts`:

```typescript
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { decrypt } from '../../credentials/index.ts';

export interface IntervalsCredentials {
  intervalsAthleteId: string;
  apiKey: string;
}

/**
 * Fetch and decrypt Intervals.icu credentials for an athlete.
 * Returns null if credentials are not configured.
 */
export async function getIntervalsCredentials(
  supabase: SupabaseClient,
  athleteId: string
): Promise<IntervalsCredentials | null> {
  const { data, error } = await supabase
    .from('intervals_credentials')
    .select('intervals_athlete_id, encrypted_api_key')
    .eq('athlete_id', athleteId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - credentials not configured
      return null;
    }
    throw new Error(`Failed to fetch credentials: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const apiKey = await decrypt(data.encrypted_api_key);

  return {
    intervalsAthleteId: data.intervals_athlete_id,
    apiKey,
  };
}
```

### Step 2: Create Intervals.icu API Client

Create `supabase/functions/mcp-gateway/utils/intervals-api.ts`:

```typescript
import type { IntervalsCredentials } from './credentials.ts';

const INTERVALS_BASE_URL = 'https://intervals.icu/api/v1';

/**
 * Make an authenticated request to Intervals.icu API.
 */
async function intervalsRequest<T>(
  credentials: IntervalsCredentials,
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${INTERVALS_BASE_URL}/athlete/${credentials.intervalsAthleteId}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${btoa(`API_KEY:${credentials.apiKey}`)}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Intervals.icu API error: ${response.status} - ${text}`);
  }

  return response.json();
}

/**
 * Fetch activities from Intervals.icu.
 * API endpoint: GET /api/v1/athlete/{id}/activities
 */
export interface IntervalsActivity {
  id: string;
  name: string;
  type: string;
  start_date_local: string;
  moving_time: number; // seconds
  distance?: number; // meters
  icu_training_load?: number; // TSS equivalent
  icu_ctl?: number;
  icu_atl?: number;
}

export async function fetchActivities(
  credentials: IntervalsCredentials,
  options: {
    oldest?: string;
    newest?: string;
  }
): Promise<IntervalsActivity[]> {
  const params: Record<string, string> = {};
  if (options.oldest) params.oldest = options.oldest;
  if (options.newest) params.newest = options.newest;

  return intervalsRequest<IntervalsActivity[]>(credentials, '/activities', params);
}

/**
 * Fetch wellness data from Intervals.icu.
 * API endpoint: GET /api/v1/athlete/{id}/wellness
 */
export interface IntervalsWellness {
  id: string;
  ctl: number;
  atl: number;
  rampRate?: number;
  restingHR?: number;
  hrv?: number;
  hrvSDNN?: number;
  sleepSecs?: number;
  sleepQuality?: number;
  weight?: number;
  fatigue?: number;
  soreness?: number;
  stress?: number;
  mood?: number;
}

export async function fetchWellness(
  credentials: IntervalsCredentials,
  options: {
    oldest?: string;
    newest?: string;
  }
): Promise<IntervalsWellness[]> {
  const params: Record<string, string> = {};
  if (options.oldest) params.oldest = options.oldest;
  if (options.newest) params.newest = options.newest;

  return intervalsRequest<IntervalsWellness[]>(credentials, '/wellness', params);
}

/**
 * Fetch calendar events from Intervals.icu.
 * API endpoint: GET /api/v1/athlete/{id}/events
 */
export interface IntervalsEvent {
  id: number;
  name: string;
  description?: string;
  start_date_local: string;
  end_date_local?: string;
  type: string; // WORKOUT, NOTE, RACE, etc.
  category?: string; // Ride, Run, Swim, etc.
  moving_time?: number; // seconds (planned)
  icu_training_load?: number; // planned TSS
  distance?: number; // meters (planned)
  indoor?: boolean;
  event_priority?: string; // A, B, C
}

export async function fetchEvents(
  credentials: IntervalsCredentials,
  options: {
    oldest?: string;
    newest?: string;
  }
): Promise<IntervalsEvent[]> {
  const params: Record<string, string> = {};
  if (options.oldest) params.oldest = options.oldest;
  if (options.newest) params.newest = options.newest;

  return intervalsRequest<IntervalsEvent[]>(credentials, '/events', params);
}
```

### Step 3: Update MCP Gateway Index

Modify `supabase/functions/mcp-gateway/index.ts` to pass Supabase client to tool handlers:

**Update MCPToolHandler type in types.ts:**

```typescript
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

export type MCPToolHandler = (
  input: Record<string, unknown>,
  athleteId: string,
  supabase: SupabaseClient
) => Promise<MCPToolResult>;
```

**Update tool invocation in index.ts:**

```typescript
// Execute the tool handler (pass supabase client)
const result: MCPToolResult = await tool.handler(toolInput, athlete.id, supabase);
```

### Step 4: Update get-activities.ts

Modify handler to fetch real data:

```typescript
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { getIntervalsCredentials } from '../utils/credentials.ts';
import { fetchActivities } from '../utils/intervals-api.ts';

async function handler(
  input: Record<string, unknown>,
  athleteId: string,
  supabase: SupabaseClient
): Promise<MCPToolResult> {
  try {
    const params = parseInput(input);

    // Get credentials
    const credentials = await getIntervalsCredentials(supabase, athleteId);

    if (!credentials) {
      // Fall back to mock data if not connected
      return getMockActivities(params);
    }

    // Fetch real data
    const activities = await fetchActivities(credentials, {
      oldest: params.oldest,
      newest: params.newest,
    });

    // Transform to our format
    const transformed = activities
      .filter((a) => !params.activityType || a.type.toLowerCase() === params.activityType.toLowerCase())
      .slice(0, params.limit)
      .map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        start_date: a.start_date_local,
        duration: a.moving_time,
        distance: a.distance,
        tss: a.icu_training_load,
        ctl: a.icu_ctl,
        atl: a.icu_atl,
      }));

    return {
      success: true,
      data: {
        activities: transformed,
        total: transformed.length,
        source: 'intervals.icu',
        filters_applied: { /* ... */ },
      },
    };
  } catch (error) {
    // ... error handling
  }
}
```

### Step 5: Update get-wellness.ts

Similar pattern to get-activities.ts:

```typescript
async function handler(
  input: Record<string, unknown>,
  athleteId: string,
  supabase: SupabaseClient
): Promise<MCPToolResult> {
  try {
    const params = parseInput(input);

    const credentials = await getIntervalsCredentials(supabase, athleteId);

    if (!credentials) {
      return getMockWellnessData(params);
    }

    const wellness = await fetchWellness(credentials, {
      oldest: params.oldest,
      newest: params.newest,
    });

    // Transform Intervals.icu format to our format
    const transformed = wellness.map((w) => ({
      date: w.id, // Intervals.icu uses date as ID
      ctl: w.ctl,
      atl: w.atl,
      tsb: w.ctl - w.atl,
      rampRate: w.rampRate ?? 0,
      restingHR: w.restingHR,
      hrv: w.hrv,
      hrvSDNN: w.hrvSDNN,
      sleepQuality: w.sleepQuality,
      sleepHours: w.sleepSecs != null ? w.sleepSecs / 3600 : undefined,
      weight: w.weight,
      fatigue: w.fatigue,
      soreness: w.soreness,
      stress: w.stress,
      mood: w.mood,
    }));

    return {
      success: true,
      data: {
        wellness: transformed,
        summary: computeSummary(transformed),
        source: 'intervals.icu',
        date_range: { oldest: params.oldest, newest: params.newest },
      },
    };
  } catch (error) {
    // ... error handling
  }
}
```

### Step 6: Update get-events.ts (if P3-A-04 is done)

Same pattern, using `fetchEvents` from intervals-api.ts.

## Testing Requirements

### Unit Testing

Since edge functions run in Deno, we'll test manually initially.

### Integration Testing

1. Configure test credentials in Intervals.icu
2. Save credentials via the credentials endpoint
3. Call MCP gateway tools and verify real data is returned

### Test Commands

```bash
# Save credentials (replace with real values)
curl -X POST $SUPABASE_URL/functions/v1/credentials \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "intervals_athlete_id": "i12345",
    "api_key": "your-api-key"
  }'

# Get activities (should now return real data)
curl -X POST $SUPABASE_URL/functions/v1/mcp-gateway \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "execute_tool",
    "tool_name": "get_activities",
    "tool_input": {"limit": 5}
  }'

# Verify "source": "intervals.icu" in response

# Test with no credentials (should fall back to mock)
# Delete credentials first, then test
curl -X DELETE $SUPABASE_URL/functions/v1/credentials \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Should return mock data with "source": "mock"
```

## Error Handling

1. **No credentials**: Fall back to mock data gracefully
2. **Invalid credentials**: Return error with `INVALID_CREDENTIALS` code
3. **API rate limit**: Return error with `RATE_LIMITED` code, include retry-after if available
4. **Network errors**: Return error with `NETWORK_ERROR` code
5. **API errors**: Parse Intervals.icu error response and forward details

## Security Considerations

1. Never log API keys
2. Always use HTTPS for Intervals.icu API
3. Credentials are decrypted only in memory, never stored unencrypted
4. RLS policies ensure athletes can only access their own credentials

## Code Patterns to Follow

1. **Graceful fallback**: If no credentials, return mock data instead of error
2. **Add source field**: Responses should include `source: 'intervals.icu'` or `source: 'mock'`
3. **Transform data**: Map Intervals.icu field names to our consistent format
4. **Type safety**: Define interfaces for Intervals.icu API responses

## Verification Checklist

- [ ] utils/credentials.ts created and exports getIntervalsCredentials
- [ ] utils/intervals-api.ts created with fetchActivities, fetchWellness, fetchEvents
- [ ] types.ts updated with SupabaseClient parameter
- [ ] index.ts passes supabase client to handlers
- [ ] get-activities.ts uses real API when credentials exist
- [ ] get-wellness.ts uses real API when credentials exist
- [ ] Falls back to mock data when no credentials
- [ ] Response includes `source` field
- [ ] Error handling is comprehensive
- [ ] No sensitive data logged
- [ ] Function deploys successfully
- [ ] Real data returned with valid credentials
- [ ] Lint passes (`pnpm lint`)

## Estimated Time

2-3 hours

## Notes on Intervals.icu API

- Base URL: `https://intervals.icu/api/v1`
- Authentication: Basic auth with `API_KEY:{api_key}`
- Athlete ID format: `i{number}` (e.g., `i12345`)
- Date parameters: `oldest` and `newest` in YYYY-MM-DD format
- Full API docs: https://intervals.icu/api (requires login)
