-- Khepri: Remove 'paused' from training plan statuses
-- Migration: 009_remove_paused_status.sql
-- Description: Removes 'paused' as a valid training plan status.
--   From a training perspective, pausing doesn't make sense — if an athlete
--   misses time, they resume at the current point in the plan timeline.

-- Update any existing 'paused' rows to 'active' before tightening the constraint
UPDATE training_plans SET status = 'active' WHERE status = 'paused';

-- Drop the old constraint and add updated one without 'paused'
ALTER TABLE training_plans DROP CONSTRAINT IF EXISTS training_plans_status_check;

ALTER TABLE training_plans
    ADD CONSTRAINT training_plans_status_check
    CHECK (status IN ('active', 'completed', 'cancelled'));

-- Update documentation comment
COMMENT ON COLUMN training_plans.status IS 'Plan lifecycle: active, completed, cancelled';
