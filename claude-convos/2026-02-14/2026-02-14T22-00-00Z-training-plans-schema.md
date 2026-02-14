# Training Plans Schema Enhancement

**Date:** 2026-02-14
**Branch:** feat/p6-b-01-training-plans-schema
**Task:** P6-B-01 - Training Plans Schema Migration

## Goals

- Enhance the existing `training_plans` table with clearer column names, periodization structure, adaptation history tracking, and date validation constraints.

## Key Decisions

1. **ALTER TABLE instead of CREATE TABLE**: The `training_plans` table already existed in `001_initial_schema.sql`. Rather than dropping and recreating, used ALTER TABLE to rename columns and add constraints, preserving any existing data.

2. **Column renames for domain clarity**:
   - `title` -> `name` (consistent with plan naming conventions)
   - `duration_weeks` -> `total_weeks` (clearer intent)
   - `target_goal_id` -> `goal_id` (simpler reference)
   - `phases` -> `periodization` (domain-specific terminology)
   - `adjustments_log` -> `adaptations` (shorter, clearer)

3. **Removed 'draft' status**: Plans now start as 'active' directly (active, completed, paused, cancelled).

4. **Added validation trigger**: `validate_training_plan_weeks()` ensures `total_weeks` approximately matches the date range with +/-1 week tolerance.

5. **Optimized indexes**: Replaced generic status index with partial index on active plans, added partial goal index.

6. **RLS policy upgrade**: Replaced `IN (SELECT ...)` pattern with more efficient `EXISTS (...)` pattern.

## Files Changed

- `supabase/migrations/006_training_plans.sql` - New migration (ALTER TABLE enhancements)
- `packages/supabase-client/src/types.ts` - Updated Database types for renamed columns
- `packages/ai-client/src/types.ts` - Updated TrainingPlan interface, removed 'draft' from PlanStatus
- `packages/ai-client/src/context-builder.ts` - Updated field references (periodization, name, totalWeeks)
- `packages/ai-client/src/__tests__/context-builder.test.ts` - Updated mock data
- `supabase/seed/seed.sql` - Updated commented seed data column names

## Learnings

- When a plan specifies CREATE TABLE but the table already exists, write the migration as ALTER TABLE statements instead.
- DECLARE blocks in PL/pgSQL trigger functions must come before BEGIN, not nested inside.
