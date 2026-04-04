# P9-A-01 to P9-A-07: Database Migrations for Season-Based Planning

## Goal

Create 4 SQL migrations that add the `seasons`, `race_blocks`, `workouts`, `plan_adaptations`, and `sync_log` tables, plus alter `goals` (add `season_id` FK) and `athletes` (add Intervals.icu sync columns).

**Parent plan:** [p9a-data-model.md](./p9a-data-model.md)
**Design doc:** [docs/design/training-plan-redesign.md](../../../docs/design/training-plan-redesign.md)
**Depends on:** Nothing
**Blocks:** P9-A-08 through P9-A-11 (queries need the tables)

## Tasks Covered

| ID | Task |
|----|------|
| P9-A-01 | Create seasons table migration |
| P9-A-02 | Create race_blocks table migration |
| P9-A-03 | Create workouts table migration |
| P9-A-04 | Create plan_adaptations table migration |
| P9-A-05 | Create sync_log table migration |
| P9-A-06 | Add season_id FK to goals table |
| P9-A-07 | Add Intervals.icu sync columns to athletes |

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/010_seasons.sql` | seasons + race_blocks tables |
| `supabase/migrations/011_workouts.sql` | workouts table |
| `supabase/migrations/012_plan_adaptations.sql` | plan_adaptations + sync_log tables |
| `supabase/migrations/013_season_goals_and_sync.sql` | goals.season_id FK + athletes sync columns |

## Implementation Steps

### 1. Create `supabase/migrations/010_seasons.sql`

Tables: `seasons`, `race_blocks`

```sql
-- ============================================================
-- 010_seasons.sql — Season-based planning tables
-- ============================================================

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived')),
  preferences JSONB NOT NULL DEFAULT '{}',
  skeleton JSONB,
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
  phases JSONB NOT NULL DEFAULT '[]',
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

-- Use existing trigger function from 001_initial_schema.sql
CREATE TRIGGER seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER race_blocks_updated_at BEFORE UPDATE ON race_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Create `supabase/migrations/011_workouts.sql`

```sql
-- ============================================================
-- 011_workouts.sql — Individual workout sessions
-- ============================================================

CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES race_blocks(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number >= 1),
  name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('swim', 'bike', 'run', 'strength', 'rest')),
  workout_type TEXT,
  planned_duration_minutes INTEGER NOT NULL CHECK (planned_duration_minutes >= 0),
  planned_tss NUMERIC(6,1),
  planned_distance_meters INTEGER,
  structure JSONB NOT NULL,
  description_dsl TEXT NOT NULL DEFAULT '',
  intervals_target TEXT NOT NULL DEFAULT 'AUTO'
    CHECK (intervals_target IN ('POWER', 'PACE', 'HR', 'AUTO')),
  sync_status TEXT NOT NULL DEFAULT 'not_connected'
    CHECK (sync_status IN ('pending', 'synced', 'conflict', 'not_connected')),
  external_id TEXT NOT NULL,
  intervals_event_id TEXT,
  actual_duration_minutes INTEGER,
  actual_tss NUMERIC(6,1),
  actual_distance_meters INTEGER,
  actual_avg_power INTEGER,
  actual_avg_pace_sec_per_km NUMERIC(6,1),
  actual_avg_hr INTEGER,
  completed_at TIMESTAMPTZ,
  intervals_activity_id TEXT,
  compliance JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workouts_block ON workouts(block_id);
CREATE INDEX idx_workouts_athlete_date ON workouts(athlete_id, date);
CREATE UNIQUE INDEX idx_workouts_unique_external ON workouts(external_id);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY workouts_athlete_access ON workouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM athletes WHERE athletes.id = workouts.athlete_id
            AND athletes.auth_user_id = auth.uid())
  );

CREATE TRIGGER workouts_updated_at BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Create `supabase/migrations/012_plan_adaptations.sql`

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
  affected_workouts JSONB NOT NULL DEFAULT '[]',
  reason TEXT NOT NULL,
  context JSONB,
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

-- RLS: service role only — Edge Functions access this table via service role
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_log_service_role_only ON sync_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

### 4. Create `supabase/migrations/013_season_goals_and_sync.sql`

```sql
-- ============================================================
-- 013_season_goals_and_sync.sql — Link goals to seasons + sync state
-- ============================================================

-- Add season_id to goals (nullable for backwards compatibility)
ALTER TABLE goals ADD COLUMN season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;
CREATE INDEX idx_goals_season ON goals(season_id);

-- Add Intervals.icu sync state to athletes
-- Note: intervals_icu_athlete_id already exists in 001_initial_schema.sql — reuse it
ALTER TABLE athletes ADD COLUMN intervals_webhook_registered BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_activities TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_events TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_wellness TIMESTAMPTZ;
```

## Key Design Decisions

1. **Trigger function:** Use existing `update_updated_at_column()` from `001_initial_schema.sql` (not `update_updated_at()` — typo in parent plan)
2. **RLS on sync_log with service-role-only policy:** Only accessed via Edge Functions with service role
3. **`external_id` on workouts:** Stable identifier (`khepri-{block_id}-{date}-{sport}`) for Intervals.icu sync deduplication
4. **JSONB columns:** `preferences`, `skeleton`, `phases`, `structure`, `compliance`, `affected_workouts`, `context` — flexible schema for nested data
5. **One-active-season:** Partial unique index on `(athlete_id) WHERE status = 'active'`

## Testing Requirements

- All 4 migrations run in order without errors: `supabase db reset`
- Constraints enforce valid data:
  - Invalid season status rejected
  - Invalid block status rejected
  - Season end_date must be >= start_date
  - Block total_weeks must be 1-52
  - Workout planned_duration_minutes must be >= 0
  - Workout sport must be one of valid sports
- One-active-season unique index enforced
- RLS policies allow athlete's own data, block other athletes
- Indexes exist on all FK columns and common query patterns

## Verification Checklist

- [ ] `supabase db reset` succeeds with all migrations
- [ ] `seasons` table: one-active constraint works (insert second active fails)
- [ ] `race_blocks` table: status transitions via UPDATE work, invalid status rejected
- [ ] `workouts` table: unique external_id enforced, sport CHECK constraint works
- [ ] `plan_adaptations` table: trigger CHECK constraint works
- [ ] `sync_log` table: no RLS, direction/resource_type/action/status CHECKs work
- [ ] `goals.season_id` FK works, ON DELETE SET NULL
- [ ] `athletes` sync columns added
- [ ] All updated_at triggers fire on UPDATE
