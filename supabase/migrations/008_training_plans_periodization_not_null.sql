-- Khepri: Make training_plans.periodization NOT NULL
-- Migration: 008_training_plans_periodization_not_null.sql
-- Description: Backfills any existing plans that have NULL periodization
--   with a default empty structure, then adds NOT NULL constraint.
--   New plans are always created with periodization data from the app.

-- Backfill existing rows with NULL periodization
-- Uses a minimal valid structure so the app can still render (empty phases/volumes)
UPDATE training_plans
SET periodization = jsonb_build_object(
    'total_weeks', total_weeks,
    'phases', '[]'::jsonb,
    'weekly_volumes', '[]'::jsonb
)
WHERE periodization IS NULL;

-- Add NOT NULL constraint
ALTER TABLE training_plans ALTER COLUMN periodization SET NOT NULL;

-- Drop old default ('[]'::jsonb from 001_initial_schema) so inserts must provide a value
ALTER TABLE training_plans ALTER COLUMN periodization DROP DEFAULT;

-- Ensure periodization is always an object (not array or scalar)
ALTER TABLE training_plans ADD CONSTRAINT training_plans_periodization_is_object
  CHECK (jsonb_typeof(periodization) = 'object');

-- Update column comment
COMMENT ON COLUMN training_plans.periodization IS 'Periodization plan with phases and weekly volumes (required, must be a JSON object)';
