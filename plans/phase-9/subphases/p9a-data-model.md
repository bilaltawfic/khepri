# P9A: Data Model — Seasons, Race Blocks, Workouts, Adaptations

## Goal

Create the database schema and TypeScript types/queries for the season-based planning system. This is the foundation all other Phase 9 sub-phases depend on.

**Design doc:** [docs/design/training-plan-redesign.md](../../../docs/design/training-plan-redesign.md)
**ADR:** [docs/adr/001-intervals-icu-sync-architecture.md](../../../docs/adr/001-intervals-icu-sync-architecture.md)
**Wave:** 1 (must go first)
**Depends on:** Nothing
**Blocks:** 9B, 9C, 9D, 9F (all of Wave 2)

## Context

The current `training_plans` table stores a generic periodization skeleton with volume multipliers. The redesign replaces this with:
- **seasons** — annual container (one active per athlete)
- **race_blocks** — training blocks within a season (draft → locked → in_progress → completed)
- **workouts** — individual daily sessions with structured data + Intervals.icu DSL
- **plan_adaptations** — full audit trail for every plan modification
- **sync_log** — debug log for Intervals.icu sync operations

The existing `goals` table gains a `season_id` FK. The `athletes` table gains sync state columns.

## Tasks

| ID | Task | Status |
|----|------|--------|
| P9-A-01 | Create seasons table migration | ⬜ |
| P9-A-02 | Create race_blocks table migration | ⬜ |
| P9-A-03 | Create workouts table migration | ⬜ |
| P9-A-04 | Create plan_adaptations table migration | ⬜ |
| P9-A-05 | Create sync_log table migration | ⬜ |
| P9-A-06 | Add season_id FK to goals table | ⬜ |
| P9-A-07 | Add Intervals.icu sync columns to athletes | ⬜ |
| P9-A-08 | Add seasons queries to supabase-client | ⬜ |
| P9-A-09 | Add race_blocks queries to supabase-client | ⬜ |
| P9-A-10 | Add workouts queries to supabase-client | ⬜ |
| P9-A-11 | Add plan_adaptations queries to supabase-client | ⬜ |
| P9-A-12 | Add Season, RaceBlock, Workout, Adaptation types to core | ⬜ |

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/010_seasons.sql` | seasons + race_blocks tables |
| `supabase/migrations/011_workouts.sql` | workouts table |
| `supabase/migrations/012_plan_adaptations.sql` | plan_adaptations + sync_log tables |
| `supabase/migrations/013_season_goals_and_sync.sql` | goals.season_id FK + athletes sync columns |
| `packages/core/src/types/season.ts` | Season, RaceBlock, SeasonPreferences, SeasonSkeleton types |
| `packages/core/src/types/workout.ts` | Workout, WorkoutStructure, WorkoutSection, WorkoutStep types |
| `packages/core/src/types/adaptation.ts` | PlanAdaptation, WorkoutSnapshot, ComplianceResult types |
| `packages/supabase-client/src/queries/seasons.ts` | Season CRUD + one-active enforcement |
| `packages/supabase-client/src/queries/race-blocks.ts` | RaceBlock CRUD + lifecycle transitions |
| `packages/supabase-client/src/queries/workouts.ts` | Workout CRUD + bulk insert + compliance updates |
| `packages/supabase-client/src/queries/plan-adaptations.ts` | Adaptation CRUD + rollback support |

## Files to Modify

| File | Change |
|------|--------|
| `packages/core/src/index.ts` | Export new types from season.ts, workout.ts, adaptation.ts |
| `packages/supabase-client/src/types.ts` | Add row/insert/update types from generated DB types |
| `packages/supabase-client/src/index.ts` | Export new query modules |
| `packages/supabase-client/src/queries/index.ts` | Export new query functions |

## Implementation Details

### Migration 010: seasons + race_blocks

```sql
-- ============================================================
-- 010_seasons.sql — Season-based planning tables
-- ============================================================

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- e.g., "2026 Triathlon Season"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,                      -- defaults to Dec 31 of current year
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived')),
  preferences JSONB NOT NULL DEFAULT '{}',     -- SeasonPreferences
  skeleton JSONB,                              -- SeasonSkeleton (null until generated)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT seasons_date_range CHECK (end_date >= start_date)
);

-- One active season per athlete
CREATE UNIQUE INDEX idx_seasons_one_active
  ON seasons (athlete_id)
  WHERE status = 'active';

-- RLS
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY seasons_athlete_access ON seasons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM athletes WHERE athletes.id = seasons.athlete_id
            AND athletes.auth_user_id = auth.uid())
  );

CREATE TABLE race_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_weeks INTEGER NOT NULL CHECK (total_weeks BETWEEN 1 AND 52),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'locked', 'in_progress', 'completed', 'cancelled')),
  phases JSONB NOT NULL DEFAULT '[]',          -- BlockPhase[]
  locked_at TIMESTAMPTZ,
  pushed_to_intervals_at TIMESTAMPTZ,
  weekly_compliance JSONB NOT NULL DEFAULT '[]',
  overall_compliance JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT race_blocks_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_race_blocks_season ON race_blocks(season_id);
CREATE INDEX idx_race_blocks_athlete_status ON race_blocks(athlete_id, status);

ALTER TABLE race_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY race_blocks_athlete_access ON race_blocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM athletes WHERE athletes.id = race_blocks.athlete_id
            AND athletes.auth_user_id = auth.uid())
  );

-- Updated_at triggers
CREATE TRIGGER seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER race_blocks_updated_at BEFORE UPDATE ON race_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Migration 011: workouts

```sql
-- ============================================================
-- 011_workouts.sql — Individual workout sessions
-- ============================================================

CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES race_blocks(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- Scheduling
  date DATE NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number >= 1),

  -- Identity
  name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('swim', 'bike', 'run', 'strength', 'rest')),
  workout_type TEXT,                           -- e.g., 'intervals', 'endurance', 'tempo'

  -- Planned metrics
  planned_duration_minutes INTEGER NOT NULL CHECK (planned_duration_minutes >= 0),
  planned_tss NUMERIC(6,1),
  planned_distance_meters INTEGER,

  -- Workout content
  structure JSONB NOT NULL,                    -- WorkoutStructure (for app display)
  description_dsl TEXT NOT NULL DEFAULT '',    -- Intervals.icu DSL string (for sync)
  intervals_target TEXT NOT NULL DEFAULT 'AUTO'
    CHECK (intervals_target IN ('POWER', 'PACE', 'HR', 'AUTO')),

  -- Sync state
  sync_status TEXT NOT NULL DEFAULT 'not_connected'
    CHECK (sync_status IN ('pending', 'synced', 'conflict', 'not_connected')),
  external_id TEXT NOT NULL,                   -- Stable: "khepri-{block_id}-{date}-{sport}"
  intervals_event_id TEXT,

  -- Actual results (from Intervals.icu)
  actual_duration_minutes INTEGER,
  actual_tss NUMERIC(6,1),
  actual_distance_meters INTEGER,
  actual_avg_power INTEGER,
  actual_avg_pace_sec_per_km NUMERIC(6,1),
  actual_avg_hr INTEGER,
  completed_at TIMESTAMPTZ,
  intervals_activity_id TEXT,

  -- Compliance (computed)
  compliance JSONB,                            -- ComplianceResult

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workouts_block ON workouts(block_id);
CREATE INDEX idx_workouts_athlete_date ON workouts(athlete_id, date);
CREATE INDEX idx_workouts_external_id ON workouts(external_id);
CREATE UNIQUE INDEX idx_workouts_unique_external ON workouts(external_id);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY workouts_athlete_access ON workouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM athletes WHERE athletes.id = workouts.athlete_id
            AND athletes.auth_user_id = auth.uid())
  );

CREATE TRIGGER workouts_updated_at BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Migration 012: plan_adaptations + sync_log

```sql
-- ============================================================
-- 012_plan_adaptations.sql — Audit trail + sync log
-- ============================================================

CREATE TABLE plan_adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES race_blocks(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL
    CHECK (trigger IN ('coach_suggestion', 'athlete_request', 'block_review', 'external_sync')),
  status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'accepted', 'rejected', 'rolled_back')),
  affected_workouts JSONB NOT NULL DEFAULT '[]',  -- Array of { workout_id, before, after, change_type }
  reason TEXT NOT NULL,
  context JSONB,                                   -- { fatigue_score, check_in_id, wellness_data, coach_reasoning }
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by TEXT CHECK (rolled_back_by IN ('support', 'athlete') OR rolled_back_by IS NULL),
  rollback_adaptation_id UUID REFERENCES plan_adaptations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_adaptations_block ON plan_adaptations(block_id);
CREATE INDEX idx_adaptations_athlete ON plan_adaptations(athlete_id, created_at DESC);

ALTER TABLE plan_adaptations ENABLE ROW LEVEL SECURITY;
CREATE POLICY adaptations_athlete_access ON plan_adaptations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM athletes WHERE athletes.id = plan_adaptations.athlete_id
            AND athletes.auth_user_id = auth.uid())
  );

CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('push', 'pull')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('workout', 'activity', 'wellness', 'event')),
  resource_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'match')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'conflict')),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_log_athlete ON sync_log(athlete_id, created_at DESC);

-- No RLS on sync_log — accessed by Edge Functions (service role)
```

### Migration 013: goals.season_id + athletes sync columns

```sql
-- ============================================================
-- 013_season_goals_and_sync.sql
-- ============================================================

-- Add season_id to goals (nullable for backwards compatibility with existing goals)
ALTER TABLE goals ADD COLUMN season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;
CREATE INDEX idx_goals_season ON goals(season_id);

-- Add Intervals.icu sync state to athletes
ALTER TABLE athletes ADD COLUMN intervals_athlete_id TEXT;
ALTER TABLE athletes ADD COLUMN intervals_webhook_registered BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_activities TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_events TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_wellness TIMESTAMPTZ;
```

### Core Types Pattern

Follow existing pattern: derive from const arrays, use `readonly`, type guards accept `unknown`.

```typescript
// packages/core/src/types/season.ts
export const SEASON_STATUSES = ['active', 'completed', 'archived'] as const;
export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export const BLOCK_STATUSES = ['draft', 'locked', 'in_progress', 'completed', 'cancelled'] as const;
export type BlockStatus = (typeof BLOCK_STATUSES)[number];

export const SPORTS = ['swim', 'bike', 'run', 'strength', 'rest'] as const;
export type Sport = (typeof SPORTS)[number];
// ... etc
```

### Query Pattern

Follow `training-plans.ts` pattern: ESM `.js` imports, `QueryResult<T>` returns, `createError()`, `!= null` checks.

```typescript
// packages/supabase-client/src/queries/seasons.ts
import type { KhepriSupabaseClient, SeasonRow, SeasonInsert } from '../types.js';
import { type QueryResult, createError } from './athlete.js';

export async function getActiveSeason(
  client: KhepriSupabaseClient,
  athleteId: string,
): Promise<QueryResult<SeasonRow | null>> {
  const { data, error } = await client
    .from('seasons')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .limit(1);

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data?.[0] ?? null, error: null };
}
```

## Testing Requirements

### Unit Tests (packages/core)
- Type guards for all new const-derived types (SeasonStatus, BlockStatus, Sport, etc.)
- Season date validation (end >= start)
- Block status transition validation (draft → locked is valid, completed → draft is not)

### Integration Tests (packages/supabase-client)
- Season CRUD: create, read, update status, archive
- One-active constraint: creating second active season fails
- Race block CRUD: create, lifecycle transitions
- Workout CRUD: create, bulk insert, update compliance, update actuals
- Adaptation CRUD: create, accept, reject, rollback
- Goals with season_id: create goal linked to season, query by season

### Migration Tests
- All migrations run in order without errors
- Constraints enforce valid data (invalid status rejected, dates validated)
- RLS policies allow athlete's own data, block other athletes
- Indexes exist for performance-critical queries

## Verification Checklist

- [ ] All migrations run: `supabase db reset` succeeds
- [ ] `pnpm test` passes (all packages)
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] One-active-season constraint enforced in DB
- [ ] Block lifecycle transitions validated
- [ ] RLS prevents cross-athlete data access
- [ ] Barrel exports updated in core and supabase-client
