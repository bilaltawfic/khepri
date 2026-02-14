# Training Plan CRUD Queries

**Date:** 2026-02-15
**Branch:** feat/p6-b-02-training-plan-queries
**Task:** P6-B-02 - Add Training Plan CRUD Queries

## Goals

Add comprehensive CRUD query functions for the `training_plans` table to `@khepri/supabase-client`, following established patterns from goals and constraints queries.

## Key Decisions

- Followed the exact pattern from `goals.ts` for consistent API design
- Used `limit(1)` instead of `.single()` for `getActiveTrainingPlan` to avoid errors when zero active plans exist
- Used `as never` workaround for Supabase generic inference limitations on `.insert()` and `.update()`
- Used read-then-write pattern for `addPlanAdaptation` since Supabase JS client lacks `jsonb_array_append`
- Used local mock clients in `addPlanAdaptation` tests since that function makes two separate Supabase calls

## Files Changed

- `packages/supabase-client/src/queries/training-plans.ts` (new) - 11 query functions
- `packages/supabase-client/src/__tests__/queries/training-plans.test.ts` (new) - 30 test cases
- `packages/supabase-client/src/queries/index.ts` (modified) - Added barrel exports
- `packages/supabase-client/src/index.ts` (modified) - Added barrel exports

## Query Functions Implemented

1. `getTrainingPlanById` - Fetch single plan by ID
2. `getAthleteTrainingPlans` - List all plans for athlete, with optional status filter
3. `getActiveTrainingPlan` - Get the active plan (at most one)
4. `getTrainingPlansForGoal` - Plans linked to a goal
5. `createTrainingPlan` - Create new plan
6. `updateTrainingPlan` - Update plan fields
7. `pauseTrainingPlan` - Status transition helper
8. `completeTrainingPlan` - Status transition helper
9. `cancelTrainingPlan` - Status transition helper
10. `addPlanAdaptation` - Append to JSONB adaptations array
11. `deleteTrainingPlan` - Hard delete

## Learnings

- Jest `jest.fn.prototype.mockResolvedValueOnce` is not available in ESM `@jest/globals` context; use `(mock as jest.Mock).mockReturnValueOnce()` instead for dual-purpose mocks
- For functions making multiple Supabase calls, local client mocks per test are cleaner than trying to share stateful module-level mocks
