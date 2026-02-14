-- Khepri: Enhanced Training Plans Schema
-- Migration: 006_training_plans.sql
-- Description: Enhances the training_plans table (created in 001_initial_schema.sql)
--   with renamed columns for clarity, periodization structure, adaptation history,
--   date validation constraints, and optimized indexes.

-- ============================================================================
-- COLUMN RENAMES
-- Rename columns for consistency with AI coaching domain language
-- ============================================================================

ALTER TABLE training_plans RENAME COLUMN title TO name;
ALTER TABLE training_plans RENAME COLUMN duration_weeks TO total_weeks;
ALTER TABLE training_plans RENAME COLUMN target_goal_id TO goal_id;
ALTER TABLE training_plans
    RENAME CONSTRAINT training_plans_target_goal_id_fkey
    TO training_plans_goal_id_fkey;
ALTER TABLE training_plans RENAME COLUMN phases TO periodization;
ALTER TABLE training_plans RENAME COLUMN adjustments_log TO adaptations;

-- ============================================================================
-- STATUS CONSTRAINT UPDATE
-- Remove 'draft' status; plans start as 'active'
-- ============================================================================

-- Drop the old status check constraint
ALTER TABLE training_plans DROP CONSTRAINT IF EXISTS training_plans_status_check;

-- Update any existing rows with 'draft' status to 'active' (must happen before new constraint)
UPDATE training_plans SET status = 'active' WHERE status = 'draft';

-- Add the updated constraint (without 'draft')
ALTER TABLE training_plans
    ADD CONSTRAINT training_plans_status_check
    CHECK (status IN ('active', 'completed', 'paused', 'cancelled'));

-- Set default to 'active' explicitly (in case the old default was different)
ALTER TABLE training_plans ALTER COLUMN status SET DEFAULT 'active';

-- ============================================================================
-- DATE VALIDATION CONSTRAINT
-- Ensure end_date is after start_date
-- ============================================================================

ALTER TABLE training_plans
    ADD CONSTRAINT training_plans_date_order
    CHECK (end_date >= start_date);

-- ============================================================================
-- WEEKS VALIDATION TRIGGER
-- Ensure total_weeks approximately matches the date range (tolerance of 1 week)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_training_plan_weeks()
RETURNS TRIGGER AS $$
DECLARE
    expected_weeks INTEGER;
BEGIN
    expected_weeks := CEIL((NEW.end_date - NEW.start_date)::NUMERIC / 7.0);

    -- Allow +/-1 week tolerance for rounding
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
-- OPTIMIZED INDEXES
-- Replace generic indexes with more targeted partial indexes
-- ============================================================================

-- Drop the old generic status index (replaced with partial index below)
DROP INDEX IF EXISTS idx_training_plans_status;

-- Active plans for an athlete (most common query pattern)
CREATE INDEX idx_training_plans_athlete_active
    ON training_plans(athlete_id, status)
    WHERE status = 'active';

-- Lookup by associated goal (only where goal is set)
CREATE INDEX idx_training_plans_goal
    ON training_plans(goal_id)
    WHERE goal_id IS NOT NULL;

-- ============================================================================
-- RLS POLICY UPDATE
-- Replace IN (SELECT ...) pattern with more efficient EXISTS pattern
-- ============================================================================

-- Drop existing policies from 001_initial_schema.sql
DROP POLICY IF EXISTS "Users can view their own training plans" ON training_plans;
DROP POLICY IF EXISTS "Users can insert their own training plans" ON training_plans;
DROP POLICY IF EXISTS "Users can update their own training plans" ON training_plans;
DROP POLICY IF EXISTS "Users can delete their own training plans" ON training_plans;

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
-- COMMENTS
-- Documentation for the enhanced schema
-- ============================================================================

COMMENT ON TABLE training_plans IS 'Structured multi-week training plans with periodization';

COMMENT ON COLUMN training_plans.name IS 'User-friendly plan name, e.g. "12-Week Ironman 70.3 Build"';
COMMENT ON COLUMN training_plans.total_weeks IS 'Total duration in weeks (4-52)';
COMMENT ON COLUMN training_plans.goal_id IS 'Optional link to associated race or performance goal';
COMMENT ON COLUMN training_plans.status IS 'Plan lifecycle: active, completed, paused, cancelled';
COMMENT ON COLUMN training_plans.periodization IS 'Array of periodization phases with focus and intensity distribution';
COMMENT ON COLUMN training_plans.weekly_template IS 'Default weekly structure (which days are workouts vs. rest)';
COMMENT ON COLUMN training_plans.adaptations IS 'History of plan modifications (injuries, fatigue, life events)';

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
