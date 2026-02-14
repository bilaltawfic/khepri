# P6-B-01: Training Plans Schema Migration

**Branch:** `feat/p6-b-01-training-plans-schema`
**Depends on:** None (standalone schema migration)
**Blocks:** P6-B-02 (Training plan queries), P6-B-06 (Training plan screen)

## Goal

Create database schema for storing structured training plans with periodization phases, weekly templates, and adaptation history.

## Files to Create

- `supabase/migrations/006_training_plans.sql` - Schema migration

## Implementation Steps

### 1. Create Training Plans Table

```sql
-- ============================================================================
-- TRAINING_PLANS TABLE
-- Stores structured multi-week training plans with periodization
-- ============================================================================
CREATE TABLE training_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    -- Plan Metadata
    name TEXT NOT NULL,                          -- e.g., "12-Week Ironman 70.3 Build"
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_weeks INTEGER NOT NULL CHECK (total_weeks BETWEEN 4 AND 52),

    -- Goal Association
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,  -- Optional link to race/performance goal

    -- Plan Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),

    -- Periodization Configuration (JSONB for flexibility)
    periodization JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example structure:
    -- [
    --   { "phase": "base", "weeks": 4, "focus": "aerobic_endurance", "intensity_distribution": [80, 15, 5] },
    --   { "phase": "build", "weeks": 6, "focus": "threshold_work", "intensity_distribution": [70, 20, 10] },
    --   { "phase": "peak", "weeks": 2, "focus": "race_specific", "intensity_distribution": [60, 25, 15] },
    --   { "phase": "taper", "weeks": 2, "focus": "recovery", "intensity_distribution": [90, 5, 5] }
    -- ]

    -- Weekly Structure Template (JSONB)
    weekly_template JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example structure:
    -- {
    --   "monday": { "type": "rest" },
    --   "tuesday": { "type": "workout", "category": "Run", "focus": "intervals" },
    --   "wednesday": { "type": "workout", "category": "Swim", "focus": "endurance" },
    --   "thursday": { "type": "workout", "category": "Bike", "focus": "tempo" },
    --   "friday": { "type": "rest" },
    --   "saturday": { "type": "workout", "category": "Run", "focus": "long_run" },
    --   "sunday": { "type": "workout", "category": "Bike", "focus": "long_ride" }
    -- }

    -- Adaptations Log (JSONB array tracking changes)
    adaptations JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example structure:
    -- [
    --   {
    --     "date": "2026-02-15",
    --     "week": 3,
    --     "reason": "injury_prevention",
    --     "change": "Reduced run volume by 20% due to elevated soreness",
    --     "modified_by": "ai_coach"
    --   }
    -- ]

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Lookup by athlete
CREATE INDEX idx_training_plans_athlete ON training_plans(athlete_id);

-- Active plans for an athlete
CREATE INDEX idx_training_plans_athlete_active ON training_plans(athlete_id, status)
    WHERE status = 'active';

-- Find plans by date range (for calendar integration)
CREATE INDEX idx_training_plans_dates ON training_plans(start_date, end_date);

-- Lookup by associated goal
CREATE INDEX idx_training_plans_goal ON training_plans(goal_id)
    WHERE goal_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Users can only access plans for their athlete profile
-- ============================================================================

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;

-- SELECT - users can view their own plans
CREATE POLICY "Users can view own training plans"
    ON training_plans FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM athletes
        WHERE athletes.id = training_plans.athlete_id
        AND athletes.auth_user_id = auth.uid()
    ));

-- INSERT - users can create plans for their athlete profile
CREATE POLICY "Users can insert own training plans"
    ON training_plans FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM athletes
        WHERE athletes.id = training_plans.athlete_id
        AND athletes.auth_user_id = auth.uid()
    ));

-- UPDATE - users can update their own plans
CREATE POLICY "Users can update own training plans"
    ON training_plans FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM athletes
        WHERE athletes.id = training_plans.athlete_id
        AND athletes.auth_user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM athletes
        WHERE athletes.id = training_plans.athlete_id
        AND athletes.auth_user_id = auth.uid()
    ));

-- DELETE - users can delete their own plans
CREATE POLICY "Users can delete own training plans"
    ON training_plans FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM athletes
        WHERE athletes.id = training_plans.athlete_id
        AND athletes.auth_user_id = auth.uid()
    ));

-- ============================================================================
-- TRIGGERS
-- Automatically update timestamps
-- ============================================================================

-- Use existing update_updated_at_column function from 001_initial_schema.sql
CREATE TRIGGER update_training_plans_updated_at
    BEFORE UPDATE ON training_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VALIDATION CONSTRAINTS
-- Ensure data integrity
-- ============================================================================

-- Ensure end_date is after start_date
ALTER TABLE training_plans
    ADD CONSTRAINT training_plans_date_order
    CHECK (end_date >= start_date);

-- Ensure total_weeks matches date range (approximately)
-- Note: This is a soft check - allows for slight variations due to partial weeks
CREATE OR REPLACE FUNCTION validate_training_plan_weeks()
RETURNS TRIGGER AS $$
DECLARE
    expected_weeks INTEGER;
BEGIN
    -- Calculate expected weeks from date range (DATE - DATE returns integer days)
    expected_weeks := CEIL((NEW.end_date - NEW.start_date)::NUMERIC / 7.0);

    -- Allow ±1 week tolerance for rounding
    IF ABS(expected_weeks - NEW.total_weeks) > 1 THEN
        RAISE EXCEPTION 'total_weeks (%) does not match date range (% to %, ~% weeks)',
            NEW.total_weeks, NEW.start_date, NEW.end_date, expected_weeks;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_training_plan_weeks_trigger
    BEFORE INSERT OR UPDATE ON training_plans
    FOR EACH ROW
    EXECUTE FUNCTION validate_training_plan_weeks();

-- ============================================================================
-- COMMENTS
-- Documentation for the schema
-- ============================================================================

COMMENT ON TABLE training_plans IS 'Structured multi-week training plans with periodization';

COMMENT ON COLUMN training_plans.name IS 'User-friendly plan name';
COMMENT ON COLUMN training_plans.total_weeks IS 'Total duration in weeks (4-52)';
COMMENT ON COLUMN training_plans.goal_id IS 'Optional link to associated race or performance goal';
COMMENT ON COLUMN training_plans.status IS 'Plan lifecycle: active, completed, paused, cancelled';
COMMENT ON COLUMN training_plans.periodization IS 'Array of periodization phases with focus and intensity distribution';
COMMENT ON COLUMN training_plans.weekly_template IS 'Default weekly structure (which days are workouts vs. rest)';
COMMENT ON COLUMN training_plans.adaptations IS 'History of plan modifications (injuries, fatigue, life events)';
```

### 2. Add Sample Data Comments

```sql
-- ============================================================================
-- EXAMPLE DATA STRUCTURES
-- ============================================================================

-- Example periodization phase:
-- {
--   "phase": "base",           -- Phase name: base, build, peak, taper, recovery
--   "weeks": 4,                 -- Duration of this phase
--   "focus": "aerobic_endurance", -- Training focus for this phase
--   "intensity_distribution": [80, 15, 5]  -- [Zone1-2%, Zone3-4%, Zone5%]
-- }

-- Example weekly template:
-- {
--   "monday": { "type": "rest" },
--   "tuesday": { "type": "workout", "category": "Run", "focus": "intervals", "target_tss": 70 },
--   "wednesday": { "type": "workout", "category": "Swim", "focus": "endurance", "target_tss": 50 },
--   "thursday": { "type": "workout", "category": "Bike", "focus": "tempo", "target_tss": 75 },
--   "friday": { "type": "rest" },
--   "saturday": { "type": "workout", "category": "Run", "focus": "long_run", "target_tss": 80 },
--   "sunday": { "type": "workout", "category": "Bike", "focus": "long_ride", "target_tss": 120 }
-- }

-- Example adaptation log entry:
-- {
--   "date": "2026-02-15",
--   "week": 3,
--   "reason": "injury_prevention",
--   "change": "Reduced run volume by 20% due to elevated soreness in left knee",
--   "modified_by": "ai_coach"
-- }
```

## Testing Requirements

### Migration Tests

1. **Run migration on clean database**
   ```bash
   supabase db reset
   ```
   - ✅ Migration applies without errors
   - ✅ Table created with correct columns
   - ✅ Indexes created
   - ✅ RLS policies applied

2. **Test constraints**
   ```sql
   -- Should fail: end_date before start_date
   INSERT INTO training_plans (athlete_id, name, start_date, end_date, total_weeks)
   VALUES ('...', 'Test', '2026-03-01', '2026-02-01', 4);

   -- Should fail: total_weeks doesn't match date range
   INSERT INTO training_plans (athlete_id, name, start_date, end_date, total_weeks)
   VALUES ('...', 'Test', '2026-02-01', '2026-05-01', 4);

   -- Should succeed
   INSERT INTO training_plans (athlete_id, name, start_date, end_date, total_weeks)
   VALUES ('...', '12-Week Build', '2026-02-01', '2026-04-25', 12);
   ```

3. **Test RLS policies**
   - ✅ User can only see their own plans
   - ✅ User cannot access other athletes' plans
   - ✅ User can create plans for their athlete profile only

4. **Test JSONB structure**
   ```sql
   -- Insert with valid JSONB structures
   INSERT INTO training_plans (
       athlete_id, name, start_date, end_date, total_weeks,
       periodization, weekly_template
   ) VALUES (
       '...',
       'Test Plan',
       '2026-02-01',
       '2026-04-25',
       12,
       '[{"phase":"base","weeks":4,"focus":"aerobic_endurance","intensity_distribution":[80,15,5]}]'::jsonb,
       '{"monday":{"type":"rest"},"tuesday":{"type":"workout","category":"Run"}}'::jsonb
   );
   ```

## Verification

Task is complete when:
- ✅ Migration file created and numbered correctly (006)
- ✅ Migration runs successfully on clean database
- ✅ All constraints enforce data integrity
- ✅ RLS policies restrict access appropriately
- ✅ Indexes created for query performance
- ✅ Comments document the schema clearly
- ✅ `supabase db reset` runs without errors

## Notes

- **JSONB flexibility:** Using JSONB for periodization, weekly_template, and adaptations allows the AI coach to store structured data without rigid schema changes
- **Extensibility:** The schema can accommodate various training methodologies (linear periodization, block periodization, etc.)
- **Auditability:** The adaptations log creates a history of plan modifications for learning and analysis
- **Optional goal link:** Plans can exist without a goal (e.g., "general fitness" mode)

## Related Tasks

- **Next:** P6-B-02 - Add training plan queries to supabase-client
- **Parallel:** P6-A-01 - Calendar MCP tools (independent)
- **Parallel:** P6-B-03 - Periodization logic (independent, will use this schema)
