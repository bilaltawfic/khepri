# ADR-001: Intervals.icu Bidirectional Sync Architecture

**Status:** Accepted
**Date:** 2026-04-04
**Decision makers:** Bil Tawfic (founder), Claude (AI architect)

## Context

Khepri generates structured training plans with daily workouts that need to be pushed to Intervals.icu for execution on devices (Garmin, Zwift, treadmills). Completed activities and wellness data flow back from Intervals.icu to power compliance tracking and AI coach adaptations. Athletes may also modify planned workouts directly in Intervals.icu. The system must keep both sides in sync reliably.

### Requirements

1. **Push planned workouts** from Khepri to Intervals.icu calendar events
2. **Pull completed activities** and wellness data from Intervals.icu into Khepri
3. **Detect external modifications** to planned events (athlete edits in Intervals.icu)
4. **Push coach adaptations** (accepted changes) back to Intervals.icu
5. **Support offline/disconnected mode** — Khepri works without Intervals.icu, just without device sync and auto-compliance
6. **Idempotent operations** — safe to retry, no duplicate events

## Decision

### Sync Strategy: Webhooks + Periodic Polling (Belt and Suspenders)

We use **two complementary mechanisms**:

| Mechanism | Purpose | Latency | Reliability |
|-----------|---------|---------|-------------|
| **Webhooks** | Real-time sync trigger | Seconds | Good (not 100% guaranteed) |
| **Polling** | Reconciliation / catch missed events | 30 min | Reliable |

Intervals.icu webhooks fire for activity created/updated, event created/updated/deleted, and wellness updated. However, webhook delivery is not guaranteed (the Intervals.icu developer describes webhooks as somewhat experimental), so periodic polling acts as a safety net.

### Conflict Resolution: Last-Write-Wins with Full Audit Trail

When both Khepri and Intervals.icu modify the same event:

- **Last write wins** — the most recent modification takes precedence
- **Every change is logged** in the adaptation audit trail with full before/after snapshots
- **Rollback is always possible** via support agents using the stored `before` snapshot

We chose last-write-wins over "flag for review" because:
- It's simpler to implement and reason about
- The audit trail makes any unintended change recoverable
- In practice, conflicts will be rare (athlete usually edits in one place at a time)
- A "flag for review" UX adds friction to every external edit

### Workout Format: Intervals.icu DSL in Description Field

All workouts are pushed using **Intervals.icu's workout description DSL syntax**. The description text is what Intervals.icu's server parses into structured `workout_doc` JSON, which then:
- Renders as colored interval blocks on the Intervals.icu calendar
- Pushes as native structured workouts to Garmin Connect
- Syncs to Zwift as structured workouts
- Provides target power/pace/HR overlays during execution

**Critical**: Plain text descriptions that don't follow the DSL syntax will NOT generate structured steps and will NOT push to devices. All workout generation (Claude-generated and template-based) MUST output valid DSL.

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Backend                        │
│                                                              │
│  ┌────────────────────┐    ┌─────────────────────────────┐  │
│  │ intervals-webhook   │    │ intervals-sync (cron)       │  │
│  │ (Edge Function)     │    │ (Edge Function / pg_cron)   │  │
│  │                     │    │                             │  │
│  │ Receives:           │    │ Every 30 min:               │  │
│  │ • activity.create   │    │ • Poll activities (2 days)  │  │
│  │ • activity.update   │    │ • Poll events (±7 days)     │  │
│  │ • event.create      │    │ • Poll wellness (2 days)    │  │
│  │ • event.update      │    │ • Diff against local state  │  │
│  │ • event.delete      │    │ • Patch missed changes      │  │
│  │ • wellness.update   │    │                             │  │
│  └──────────┬─────────┘    └──────────────┬──────────────┘  │
│             │                              │                 │
│             ▼                              ▼                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                intervals-sync-engine                   │   │
│  │  (shared module — used by webhook, cron, and push)    │   │
│  │                                                        │   │
│  │  Inbound (Intervals → Khepri):                        │   │
│  │  • Match completed activity → planned workout          │   │
│  │  • Compute compliance score (green/amber/red)          │   │
│  │  • Detect external event modifications (diff fields)   │   │
│  │  • Apply last-write-wins, log to audit trail           │   │
│  │  • Update local DB + recompute weekly compliance       │   │
│  │                                                        │   │
│  │  Outbound (Khepri → Intervals):                       │   │
│  │  • Validate DSL format before pushing                  │   │
│  │  • Bulk upsert events via external_id                  │   │
│  │  • Push races (RACE_A/B/C), rest days (NOTE)          │   │
│  │  • Push availability (HOLIDAY, SICK, INJURED)          │   │
│  │  • Push accepted coach adaptations                     │   │
│  │                                                        │   │
│  │  State:                                                │   │
│  │  • Per-athlete last_synced_at by resource type         │   │
│  │  • external_id mapping (Khepri workout ↔ I.icu event) │   │
│  │  • Sync status per event (pending/synced/conflict)     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### 1. Outbound: Khepri → Intervals.icu (Planned Workouts)

**Trigger:** Athlete locks in a race block (or coach adaptation is accepted).

```
Athlete locks block
  → Khepri generates workout events with DSL descriptions
  → DSL validation pass (syntax check before push)
  → POST /api/v1/athlete/{id}/events/bulk?upsert=true
  → Each workout event has stable external_id: "khepri-{block_id}-{date}-{sport}"
     (block_id identifies the parent training block)
  → Response confirms created/updated event IDs
  → Store Intervals.icu event ID mapped to Khepri workout ID
  → Mark sync_status = 'synced' for each workout
```

**Event categories by type:**

| Khepri Entity | Intervals.icu Category | Notes |
|---------------|----------------------|-------|
| Workout | `WORKOUT` | With DSL description + `target` field |
| A-race | `RACE_A` | Red color, linked to goal |
| B-race | `RACE_B` | |
| C-race | `RACE_C` | |
| Rest day | `NOTE` | Grey color |
| Travel/holiday | `HOLIDAY` | Blocks planning |
| Sick day | `SICK` | Triggers coach re-plan |
| Injury | `INJURED` | Triggers coach re-plan |

**DSL format requirements by sport:**

```
# Bike (target: POWER)
Warmup
- 10m ramp 50-75%

Main Set 4x
- 8m 95-105%
- 4m 55%

Cooldown
- 10m 50%

# Run (target: PACE)
Warmup
- 10m 65% Pace

Main Set 4x
- 400mtr 90-95% Pace
- 200mtr freeride

Cooldown
- 10m 55% Pace

# Swim (target: PACE, type: Swim)
Warmup
- 300mtr 60% Pace

Main Set 6x
- 100mtr 85-90% Pace
- 30s rest

Cooldown
- 200mtr 55% Pace
```

**DSL syntax reference:**
- Durations: `5m`, `30s`, `1h2m30s` (note: `m` = minutes)
- Distances: `500mtr`, `2km`, `1mi` (use `mtr` for meters, NOT `m`)
- Power: `75%`, `95-105%` (% of FTP), `220w`, `Z2`
- Pace: `60% Pace`, `Z2 Pace`, `5:00/km Pace`
- HR: `70% HR`, `Z2 HR`, `150bpm HR`
- Repeats: `4x` as section header, steps indented with `-`
- Ramps: `10m ramp 50-75%`
- Freeride: `20m freeride` (ERG mode off)
- Rest: `30s rest`
- Cadence: append `90rpm` to any step

#### 2. Inbound: Intervals.icu → Khepri (Completed Activities)

**Trigger:** Webhook fires on `activity.create` or `activity.update`, or cron poll detects new activity.

```
Activity detected
  → Fetch full activity from /api/v1/athlete/{id}/activities/{activity_id}
  → Match to planned workout by date + sport type
  → Extract actual metrics: duration, distance, TSS, avg power/pace/HR
  → Compute compliance score vs planned metrics
  → Store activity reference + compliance on workout record
  → Recompute weekly and block compliance scores
```

**Activity → Workout matching logic:**
1. Find planned workouts for the activity date
2. Match by sport type (Ride → Bike, Run → Run, Swim → Swim)
3. If multiple workouts of same sport on same day, match by closest duration
4. If no match found, record as "unplanned session" (grey)

#### 3. Inbound: Intervals.icu → Khepri (External Event Modifications)

**Trigger:** Webhook fires on `event.update`, or cron poll detects field changes.

```
Event modification detected
  → Fetch updated event from Intervals.icu
  → Find corresponding Khepri workout by external_id or intervals_event_id
  → Diff fields: name, description, moving_time, start_date_local
  → If changed:
    → Log adaptation: trigger='external_sync', before=snapshot, after=new_values
    → Apply last-write-wins: update Khepri workout record
    → Mark sync_status = 'synced'
```

#### 4. Inbound: Intervals.icu → Khepri (Wellness Data)

**Trigger:** Webhook fires on `wellness.update`, or cron poll.

```
Wellness update detected
  → Fetch from /api/v1/athlete/{id}/wellness/{date}
  → Store/update: CTL, ATL, TSB, sleep, HRV, soreness, stress, mood
  → Used by coach for daily adaptation suggestions
  → Used by compliance tracking for context
```

### Webhook Endpoint Design

**Edge Function:** `intervals-webhook`

```typescript
// POST /functions/v1/intervals-webhook
// Intervals.icu sends: { event_type, athlete_id, resource_id }

interface WebhookPayload {
  event_type: 'activity.create' | 'activity.update' |
              'event.create' | 'event.update' | 'event.delete' |
              'wellness.update';
  athlete_id: string;      // Intervals.icu athlete ID
  resource_id: string;     // ID of the changed resource
  timestamp: string;       // When the change occurred
}

// Processing:
// 1. Validate webhook signature/source
// 2. Look up Khepri athlete by intervals_athlete_id
// 3. Fetch the full resource from Intervals.icu API
// 4. Delegate to sync-engine for processing
// 5. Return 200 OK (fast — do work async if needed)
```

### Cron Reconciliation Design

**Edge Function:** `intervals-sync` (invoked by pg_cron every 30 minutes)

```
For each athlete with active Intervals.icu connection:
  1. Fetch activities for last 2 days
     → Compare against last_synced_at for activities
     → Process any new or updated activities

  2. Fetch events for today ± 7 days
     → Compare against stored event state
     → Detect modifications, deletions

  3. Fetch wellness for last 2 days
     → Update local wellness records

  4. Update last_synced_at timestamps
```

**Rate limit awareness:** ~100 requests/min per API key. At 3 requests per athlete per cycle (activities, events, wellness), we can handle ~33 athletes per minute. For scaling beyond that, stagger athlete sync across the 30-minute window.

### Database Schema Additions

```sql
-- Per-athlete Intervals.icu connection state
ALTER TABLE athletes ADD COLUMN intervals_athlete_id TEXT;
ALTER TABLE athletes ADD COLUMN intervals_webhook_registered BOOLEAN DEFAULT FALSE;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_activities TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_events TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_wellness TIMESTAMPTZ;

-- Per-workout sync state (on the new workouts table, designed in training-plan-redesign)
-- sync_status: 'pending' | 'synced' | 'conflict' | 'not_connected'
-- intervals_event_id: the Intervals.icu event ID after push
-- external_id: stable ID for upsert (format: "khepri-{block_id}-{date}-{sport}")

-- Sync log for debugging
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('push', 'pull')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('workout', 'activity', 'wellness', 'event')),
  resource_id TEXT,           -- Khepri or Intervals.icu ID
  action TEXT NOT NULL,       -- 'create', 'update', 'delete', 'match'
  status TEXT NOT NULL,       -- 'success', 'failed', 'conflict'
  details JSONB,              -- Error messages, diff data, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Adaptation Audit Trail

Every plan modification (coach suggestion, external sync, athlete request) produces an audit record:

```typescript
interface PlanAdaptation {
  id: string;                     // UUID
  block_id: string;               // Which race block this adaptation applies to
  created_at: string;             // When the change was made
  trigger:
    | 'coach_suggestion'          // AI coach recommended a change
    | 'athlete_request'           // Athlete asked for a change
    | 'block_review'              // End-of-block review adjustment
    | 'external_sync';            // Detected change from Intervals.icu
  status:
    | 'suggested'                 // Coach proposed, awaiting athlete decision
    | 'accepted'                  // Athlete approved the change
    | 'rejected'                  // Athlete declined
    | 'rolled_back';              // Support agent reverted the change

  // What changed
  affected_workouts: Array<{
    workout_id: string;
    external_id: string;          // Intervals.icu external_id
    date: string;
    change_type: 'modified' | 'swapped' | 'cancelled' | 'added' | 'rescheduled';
    before: WorkoutSnapshot;      // Full state before change
    after: WorkoutSnapshot;       // Full state after change
  }>;

  // Why it changed
  reason: string;                 // Human-readable explanation
  context?: {
    fatigue_score?: number;
    check_in_id?: string;
    wellness_data?: Record<string, unknown>;
    coach_reasoning?: string;     // AI's reasoning for the suggestion
  };

  // Rollback support
  rolled_back_at?: string;
  rolled_back_by?: 'support' | 'athlete';
  rollback_adaptation_id?: string; // Links to the adaptation that reversed this one
}

interface WorkoutSnapshot {
  name: string;
  sport: string;
  date: string;
  duration_minutes: number;
  description_dsl: string;        // Intervals.icu DSL
  planned_tss?: number;
  structured_data: WorkoutStructure; // Khepri's internal representation
}
```

**Rollback flow (support agent):**
1. Find the adaptation to reverse by ID
2. For each affected workout, restore the `before` snapshot
3. Push restored workouts to Intervals.icu via upsert
4. Create a new adaptation record with `trigger: 'athlete_request'` and link via `rollback_adaptation_id`
5. Mark the original adaptation as `status: 'rolled_back'`

### DSL Validation

Before pushing any workout to Intervals.icu, we validate the DSL:

```typescript
interface DSLValidationResult {
  valid: boolean;
  errors: Array<{
    line: number;
    message: string;        // e.g., "Invalid duration format: '5k' — use '5km' for distance"
    severity: 'error' | 'warning';
  }>;
  parsed_duration_seconds?: number;  // Total duration if parseable
  parsed_distance_meters?: number;   // Total distance if parseable
}

// Validation checks:
// 1. Section headers are valid (Warmup, Main Set, Cooldown, or custom text)
// 2. Steps start with '-' and contain valid duration/distance
// 3. Targets use valid units (%, w, /km, bpm, Z1-Z7, etc.)
// 4. Repeat blocks (Nx) have child steps
// 5. No ambiguous 'm' (must be 'mtr' for meters, 'm' for minutes)
// 6. Target type matches sport (power for Ride, pace for Run/Swim)
```

**Fallback:** If DSL validation fails and cannot be auto-corrected, the workout is pushed with a simplified description (name + duration + intensity summary) rather than failing silently. The sync log records the validation failure for debugging.

## Consequences

### Positive
- Athletes get structured workouts on their devices (Garmin, Zwift) automatically
- Compliance tracking is automated — no manual data entry
- Coach adaptations flow through to devices seamlessly
- Full audit trail enables rollback and data analysis
- System works without Intervals.icu (just without device sync)

### Negative
- Webhook reliability requires polling fallback (added complexity)
- DSL format constraints limit workout description creativity
- Rate limits may require batching for many athletes
- Last-write-wins can surprise users if they edit in both places simultaneously

### Risks
- Intervals.icu API changes could break sync (mitigated by version checking, graceful degradation)
- Webhook format may change (mitigated by polling fallback)
- DSL parser behavior undocumented edge cases (mitigated by validation + testing against real API)

## References

- [Intervals.icu Workout Builder Syntax Quick Guide](https://forum.intervals.icu/t/workout-builder-syntax-quick-guide/123701)
- [Intervals.icu Workout Markdown Format Rules](https://forum.intervals.icu/t/intervals-icu-workout-markdown-format-rules/115629)
- [Intervals.icu API Integration Cookbook](https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090)
- [Intervals.icu OpenAPI Spec](https://intervals.icu/api/v1/docs)
- Product design doc: [Training Plan Redesign](../design/training-plan-redesign.md)
