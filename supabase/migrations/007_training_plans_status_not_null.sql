-- Khepri: Add NOT NULL constraint to training_plans.status
-- Migration: 007_training_plans_status_not_null.sql
-- Description: The column has DEFAULT 'active' and a CHECK constraint
--   but was missing NOT NULL. This migration backfills any NULL rows
--   and adds the constraint.

UPDATE training_plans SET status = 'active' WHERE status IS NULL;
ALTER TABLE training_plans ALTER COLUMN status SET NOT NULL;
