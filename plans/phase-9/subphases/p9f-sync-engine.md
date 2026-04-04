# P9F: Sync Engine

## Goal

Build the bidirectional Intervals.icu sync system: a webhook endpoint for real-time updates, a push module for sending workouts, and a cron reconciliation job for catching missed events.

**ADR:** [docs/adr/001-intervals-icu-sync-architecture.md](../../../docs/adr/001-intervals-icu-sync-architecture.md)
**Wave:** 2 (parallel with 9B, 9C, 9D)
**Depends on:** 9A (sync columns), 9D (DSL validator — for P9-F-05 only)
**Blocks:** 9E (push module), 9G, 9H

## Context

Khepri pushes planned workouts to Intervals.icu and pulls completed activities + wellness data back. The sync uses two mechanisms:
- **Webhooks** for real-time (activity/event/wellness changes)
- **Polling every 30 min** as a safety net (webhooks aren't 100% reliable)

Conflict resolution is **last-write-wins** with full audit trail. See ADR-001 for complete architecture.

### Existing infrastructure
- `supabase/functions/mcp-gateway/utils/intervals-api.ts` — existing API client with `createEvent`, `updateEvent`, `fetchActivities`, `fetchWellness`, `fetchEvents`
- `apps/mobile/services/intervals.ts` — mobile wrapper for MCP gateway calls
- Credentials stored encrypted in Supabase (via `credentials` Edge Function)

## Dependencies

- **P9-A-07** (athletes sync columns) — `intervals_last_synced_*` timestamps
- **P9-D-02** (DSL validator) — validate before push

## Tasks

| ID | Task | Status |
|----|------|--------|
| P9-F-01 | Intervals.icu sync engine shared module | ⬜ |
| P9-F-02 | Webhook Edge Function: intervals-webhook | ⬜ |
| P9-F-03 | Push module: bulk upsert events to Intervals.icu | ⬜ |
| P9-F-04 | Cron reconciliation Edge Function: intervals-sync | ⬜ |
| P9-F-05 | DSL validation before push (with fallback) | ⬜ |

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/intervals-sync-engine.ts` | Shared logic: activity matching, compliance, diff detection |
| `supabase/functions/_shared/intervals-push.ts` | Outbound: bulk upsert events, race events, availability |
| `supabase/functions/intervals-webhook/index.ts` | Inbound: receives webhook POST, delegates to sync engine |
| `supabase/functions/intervals-sync/index.ts` | Cron: periodic reconciliation polling |

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/mcp-gateway/utils/intervals-api.ts` | May need new methods for bulk operations |

## Implementation Details

### Shared Sync Engine (P9-F-01)

Core logic used by webhook, cron, and push:

```typescript
// Activity → Workout matching
export function matchActivityToWorkout(
  activity: IntervalsActivity,
  plannedWorkouts: Workout[],
): { workout: Workout; confidence: 'exact' | 'probable' | 'weak' } | null;

// Matching logic:
// 1. Filter workouts by activity date
// 2. Match by sport type (Ride→bike, Run→run, Swim→swim)
// 3. If multiple matches, pick closest by duration
// 4. If no match → return null (unplanned session)

// Compute compliance from planned vs actual
export function computeCompliance(
  planned: { duration_minutes: number; tss?: number; distance_meters?: number },
  actual: { duration_minutes: number; tss?: number; distance_meters?: number },
): ComplianceResult;

// Compliance metric priority: TSS > Duration > Distance
// Thresholds: green 80-120%, amber 50-79%/121-150%, red <50%/>150%

// Detect changes in an Intervals.icu event vs local workout
export function diffEventVsWorkout(
  event: IntervalsEvent,
  workout: Workout,
): { changed: boolean; fields: string[] };
```

### Push Module (P9-F-03)

Outbound sync: converts Khepri workouts to Intervals.icu events and bulk upserts.

```typescript
export async function pushBlockToIntervals(
  apiKey: string,
  athleteId: string,
  workouts: Workout[],
  raceEvents: RaceEvent[],
  availabilityEvents: AvailabilityEvent[],
): Promise<PushResult>;

interface PushResult {
  success: boolean;
  pushed_count: number;
  failed_count: number;
  failures: Array<{ external_id: string; error: string }>;
}
```

**Event construction per type:**

| Khepri Type | category | type | color | Notes |
|-------------|----------|------|-------|-------|
| Workout | `WORKOUT` | Sport (Ride/Run/Swim) | default | DSL in description, target field set |
| A-race | `RACE_A` | Triathlon/Run/etc | red | |
| B-race | `RACE_B` | as above | | |
| C-race | `RACE_C` | as above | | |
| Rest day | `NOTE` | null | gray | |
| Travel/Holiday | `HOLIDAY` | null | | |
| Sick | `SICK` | null | | |
| Injured | `INJURED` | null | | |

**Batch size:** 50 events per API call (Intervals.icu recommendation). Batch sequentially to avoid rate limits.

**DSL validation before push (P9-F-05):**
- Run each workout's `description_dsl` through `validateDSL()`
- If valid: push as-is
- If invalid: push simplified description (workout name + duration + intensity summary)
- Log validation failure to `sync_log`

### Webhook Edge Function (P9-F-02)

Receives POST from Intervals.icu when activities/events/wellness change.

```typescript
// POST /functions/v1/intervals-webhook
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const payload = await req.json() as WebhookPayload;
  // { event_type, athlete_id (intervals ID), resource_id, timestamp }

  // 1. Look up Khepri athlete by intervals_athlete_id
  // 2. Fetch their API key from encrypted credentials
  // 3. Based on event_type, fetch full resource from Intervals.icu API
  // 4. Process:

  switch (payload.event_type) {
    case 'activity.create':
    case 'activity.update':
      // Fetch activity → match to workout → compute compliance → update workout
      break;

    case 'event.update':
      // Fetch event → find workout by external_id → diff fields
      // If changed: apply last-write-wins, log adaptation
      break;

    case 'event.delete':
      // Find workout by external_id → mark sync_status as 'conflict'
      // Log to sync_log — don't delete the Khepri workout
      break;

    case 'wellness.update':
      // Fetch wellness → update local wellness record
      // Used by coach for daily adaptation suggestions
      break;
  }

  return jsonResponse({ received: true });
});
```

### Cron Reconciliation (P9-F-04)

Invoked every 30 minutes (via pg_cron or Supabase scheduled function):

```typescript
Deno.serve(async (req: Request) => {
  // Service role — no user auth needed
  const supabase = createServiceClient();

  // Get all athletes with active Intervals.icu connection
  const { data: athletes } = await supabase
    .from('athletes')
    .select('id, intervals_athlete_id, intervals_last_synced_activities, ...')
    .not('intervals_athlete_id', 'is', null);

  for (const athlete of athletes) {
    // 1. Poll activities for last 2 days
    const activities = await fetchActivities(apiKey, athlete.intervals_athlete_id, {
      oldest: twoDaysAgo,
      newest: today,
    });
    // Process each: match → compliance → update

    // 2. Poll events for today ± 7 days
    const events = await fetchEvents(apiKey, athlete.intervals_athlete_id, {
      oldest: sevenDaysAgo,
      newest: sevenDaysFromNow,
    });
    // Diff against local state, detect external modifications

    // 3. Poll wellness for last 2 days
    const wellness = await fetchWellness(apiKey, athlete.intervals_athlete_id, {
      oldest: twoDaysAgo,
      newest: today,
    });
    // Update local wellness records

    // 4. Update last_synced_at timestamps
    await supabase.from('athletes').update({
      intervals_last_synced_activities: now,
      intervals_last_synced_events: now,
      intervals_last_synced_wellness: now,
    }).eq('id', athlete.id);
  }
});
```

**Rate limit awareness:** 3 requests per athlete per cycle. At 100 req/min limit, process ~33 athletes/min. For many athletes, stagger across the 30-min window.

## Testing Requirements

### Unit Tests
- SYNC-08: Activity matches to planned workout by date + sport
- SYNC-09: Multiple same-sport workouts on same day match by duration
- SYNC-10: Unplanned activity recorded as unplanned
- SYNC-11: Sync works gracefully when Intervals.icu not connected
- SYNC-12: DSL validation failure falls back to simplified description
- SYNC-13: Rate limiting respected (batched requests)
- Compliance computation: all threshold boundaries tested

### Integration Tests
- SYNC-01: Push workouts creates events with correct external_id
- SYNC-02: Push uses upsert — re-push doesn't create duplicates
- SYNC-03: Push races with correct category (RACE_A/B/C)
- SYNC-04: Push availability as HOLIDAY/SICK/INJURED
- SYNC-05: Webhook receives activity.create and matches to workout (mock)
- SYNC-06: Webhook receives event.update and applies last-write-wins (mock)
- SYNC-07: Cron poll catches activities missed by webhook (mock)

### Edge Function Tests
- Webhook handles all event types without crashing
- Webhook returns 200 quickly (processes async)
- Cron handles athletes with no connection gracefully
- Push handles API errors (rate limit, auth failure) gracefully

## Verification Checklist

- [ ] Push module creates events with valid DSL descriptions
- [ ] External IDs are stable and support upsert
- [ ] Race events use correct RACE_A/B/C categories
- [ ] Webhook endpoint deployed and reachable
- [ ] Webhook processes activity, event, wellness updates
- [ ] Activity matching correctly identifies planned workouts
- [ ] Compliance computed and stored on workout records
- [ ] External event modifications detected and logged
- [ ] Cron job polls and reconciles successfully
- [ ] DSL validation prevents invalid workouts from pushing
- [ ] sync_log populated for debugging
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
