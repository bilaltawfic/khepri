# Goals and Constraints Query Functions Implementation

**Date**: 2026-02-08
**Branch**: feat/p1-b-05-goals-constraints-queries
**PR**: #18

## Goals

Implement query functions for the `goals` and `constraints` database tables as specified in `plans/phase-1/prompts/p1-b-05-goals-constraints-queries.md`.

## Key Decisions

1. **QueryResult<T> pattern**: Followed existing pattern from athlete.ts for consistent error handling
2. **Date filtering for constraints**: Used Supabase `.or()` for constraints with null end_date or future end_date
3. **Chainable mock pattern**: Used Jest mock pattern that returns `this` to handle Supabase's chainable API
4. **Status transitions**: Implemented `completeGoal` and `cancelGoal` as dedicated functions rather than generic status updates

## Files Changed

### Created
- `packages/supabase-client/src/queries/goals.ts` - 9 goal query functions
- `packages/supabase-client/src/queries/constraints.ts` - 10 constraint query functions
- `packages/supabase-client/src/__tests__/queries/goals.test.ts` - 10 test cases
- `packages/supabase-client/src/__tests__/queries/constraints.test.ts` - 10 test cases

### Modified
- `packages/supabase-client/src/queries/index.ts` - Added exports for new query functions
- `packages/supabase-client/src/index.ts` - Added exports from package entry point

## Query Functions Implemented

### Goals (9 functions)
- `getActiveGoals` - Get all active goals for an athlete
- `getGoalsByType` - Filter goals by type (race, time_goal, distance_goal, fitness_goal)
- `getGoalById` - Get single goal by ID
- `getUpcomingRaceGoals` - Get race goals with future target dates
- `createGoal` - Create new goal
- `updateGoal` - Update goal fields
- `completeGoal` - Mark goal as completed
- `cancelGoal` - Mark goal as cancelled
- `deleteGoal` - Hard delete goal

### Constraints (10 functions)
- `getActiveConstraints` - Get active constraints not yet expired
- `getConstraintsByType` - Filter by type (injury, travel, equipment, time, other)
- `getActiveInjuries` - Get active injury constraints
- `getCurrentTravelConstraints` - Get travel constraints covering today
- `getConstraintById` - Get single constraint by ID
- `createConstraint` - Create new constraint
- `updateConstraint` - Update constraint fields
- `resolveConstraint` - Mark constraint as resolved
- `deleteConstraint` - Hard delete constraint

## Learnings

1. **Branch switching hazard**: Accidentally switched branches mid-work and lost uncommitted changes. Always commit work frequently or stash before switching.
2. **Biome auto-fix**: Running `pnpm biome check --fix --unsafe .` resolves most formatting issues automatically.
3. **Supabase OR conditions**: The `.or()` method takes a string with dot notation for null checks: `.or('end_date.is.null,end_date.gte.2026-02-08')`.

## Test Results

```
Test Suites: 4 passed, 4 total
Tests:       55 passed, 55 total
```
