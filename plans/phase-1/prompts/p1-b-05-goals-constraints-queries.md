# P1-B-05: Add Goals and Constraints Queries

## Task Overview

Create query functions for the `goals` and `constraints` tables:
- `packages/supabase-client/src/queries/goals.ts`
- `packages/supabase-client/src/queries/constraints.ts`

## Prerequisites

- PR #15 must be merged first (contains the types and client)
- Branch from `main` after PR #15 is merged

## Branch Name

```
feat/p1-b-05-goals-constraints-queries
```

## Files to Create

### 1. `packages/supabase-client/src/queries/goals.ts`

```typescript
/**
 * Goal query functions
 */

import type {
  KhepriSupabaseClient,
  GoalRow,
  GoalInsert,
  GoalUpdate,
  GoalType,
  GoalStatus,
  GoalPriority,
} from '../types.js';

// Query result type for consistency
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Get all active goals for an athlete
 * Active = status is 'active' (not completed or cancelled)
 */
export async function getActiveGoals(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<GoalRow[]>> {
  // Implementation: .from('goals').select('*').eq('athlete_id', athleteId).eq('status', 'active').order('priority', { ascending: true })
}

/**
 * Get goals by type (race, performance, fitness, health)
 */
export async function getGoalsByType(
  client: KhepriSupabaseClient,
  athleteId: string,
  goalType: GoalType
): Promise<QueryResult<GoalRow[]>> {
  // Implementation
}

/**
 * Get a single goal by ID
 */
export async function getGoalById(
  client: KhepriSupabaseClient,
  goalId: string
): Promise<QueryResult<GoalRow>> {
  // Implementation
}

/**
 * Get upcoming race goals (target_date in future, ordered by date)
 */
export async function getUpcomingRaceGoals(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<GoalRow[]>> {
  const today = new Date().toISOString().split('T')[0];
  // Implementation: goal_type = 'race' AND target_date >= today AND status = 'active', order by target_date ascending
}

/**
 * Create a new goal
 */
export async function createGoal(
  client: KhepriSupabaseClient,
  data: GoalInsert
): Promise<QueryResult<GoalRow>> {
  // Implementation: .from('goals').insert(data).select().single()
}

/**
 * Update an existing goal
 */
export async function updateGoal(
  client: KhepriSupabaseClient,
  goalId: string,
  data: GoalUpdate
): Promise<QueryResult<GoalRow>> {
  // Implementation
}

/**
 * Mark a goal as completed
 */
export async function completeGoal(
  client: KhepriSupabaseClient,
  goalId: string
): Promise<QueryResult<GoalRow>> {
  // Implementation: update status to 'completed'
}

/**
 * Cancel a goal
 */
export async function cancelGoal(
  client: KhepriSupabaseClient,
  goalId: string
): Promise<QueryResult<GoalRow>> {
  // Implementation: update status to 'cancelled'
}

/**
 * Delete a goal (hard delete)
 */
export async function deleteGoal(
  client: KhepriSupabaseClient,
  goalId: string
): Promise<QueryResult<null>> {
  // Implementation: .from('goals').delete().eq('id', goalId)
}
```

### 2. `packages/supabase-client/src/queries/constraints.ts`

```typescript
/**
 * Constraint query functions (injuries, travel, availability)
 */

import type {
  KhepriSupabaseClient,
  ConstraintRow,
  ConstraintInsert,
  ConstraintUpdate,
  ConstraintType,
  ConstraintStatus,
} from '../types.js';

// Query result type for consistency
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Get all active constraints for an athlete
 * Active = status is 'active' AND (end_date is null OR end_date >= today)
 */
export async function getActiveConstraints(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<ConstraintRow[]>> {
  const today = new Date().toISOString().split('T')[0];
  // Implementation: status = 'active' AND (end_date is null OR end_date >= today)
}

/**
 * Get constraints by type (injury, travel, availability)
 */
export async function getConstraintsByType(
  client: KhepriSupabaseClient,
  athleteId: string,
  constraintType: ConstraintType
): Promise<QueryResult<ConstraintRow[]>> {
  // Implementation
}

/**
 * Get active injuries only
 */
export async function getActiveInjuries(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<ConstraintRow[]>> {
  // Implementation: constraint_type = 'injury' AND status = 'active'
}

/**
 * Get current travel constraints (overlapping with today)
 */
export async function getCurrentTravelConstraints(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<ConstraintRow[]>> {
  const today = new Date().toISOString().split('T')[0];
  // Implementation: constraint_type = 'travel' AND start_date <= today AND (end_date is null OR end_date >= today)
}

/**
 * Get a single constraint by ID
 */
export async function getConstraintById(
  client: KhepriSupabaseClient,
  constraintId: string
): Promise<QueryResult<ConstraintRow>> {
  // Implementation
}

/**
 * Create a new constraint
 */
export async function createConstraint(
  client: KhepriSupabaseClient,
  data: ConstraintInsert
): Promise<QueryResult<ConstraintRow>> {
  // Implementation
}

/**
 * Update an existing constraint
 */
export async function updateConstraint(
  client: KhepriSupabaseClient,
  constraintId: string,
  data: ConstraintUpdate
): Promise<QueryResult<ConstraintRow>> {
  // Implementation
}

/**
 * Mark a constraint as resolved
 */
export async function resolveConstraint(
  client: KhepriSupabaseClient,
  constraintId: string
): Promise<QueryResult<ConstraintRow>> {
  // Implementation: update status to 'resolved'
}

/**
 * Delete a constraint (hard delete)
 */
export async function deleteConstraint(
  client: KhepriSupabaseClient,
  constraintId: string
): Promise<QueryResult<null>> {
  // Implementation
}
```

### 3. Update `packages/supabase-client/src/queries/index.ts`

```typescript
export * from './athlete.js';
export * from './checkins.js';
export * from './goals.js';
export * from './constraints.js';
```

### 4. Test Files

Create two test files:
- `packages/supabase-client/src/__tests__/queries/goals.test.ts`
- `packages/supabase-client/src/__tests__/queries/constraints.test.ts`

## Test Cases for Goals

1. `getActiveGoals` - returns active goals ordered by priority
2. `getActiveGoals` - returns empty array when no active goals
3. `getGoalsByType` - filters by goal type
4. `getGoalById` - returns goal when found
5. `getUpcomingRaceGoals` - returns future race goals ordered by date
6. `createGoal` - creates and returns new goal
7. `updateGoal` - updates and returns goal
8. `completeGoal` - sets status to completed
9. `cancelGoal` - sets status to cancelled
10. `deleteGoal` - removes goal from database

## Test Cases for Constraints

1. `getActiveConstraints` - returns active constraints within date range
2. `getActiveConstraints` - includes constraints with null end_date
3. `getConstraintsByType` - filters by constraint type
4. `getActiveInjuries` - returns only active injuries
5. `getCurrentTravelConstraints` - returns overlapping travel constraints
6. `getConstraintById` - returns constraint when found
7. `createConstraint` - creates and returns new constraint
8. `updateConstraint` - updates and returns constraint
9. `resolveConstraint` - sets status to resolved
10. `deleteConstraint` - removes constraint from database

## Complex Query Pattern

For queries with OR conditions (like end_date is null OR end_date >= today):

```typescript
// Supabase doesn't have direct OR, use .or() method
const { data, error } = await client
  .from('constraints')
  .select('*')
  .eq('athlete_id', athleteId)
  .eq('status', 'active')
  .or(`end_date.is.null,end_date.gte.${today}`);
```

## PR Guidelines

1. Create branch from `main` (after PR #15 merged)
2. Keep PR small (<200 lines) - this PR may be larger, that's OK
3. Run `pnpm lint` and `pnpm test` before pushing
4. Wait for Copilot review (~3 min for small PRs)
5. Address all review comments
6. Log conversation to `claude-convos/2026-02-08/`

## Commit Message Format

```
feat(supabase): add goals and constraints query functions

- Add goal CRUD: getActiveGoals, createGoal, updateGoal, completeGoal, cancelGoal
- Add getGoalsByType, getUpcomingRaceGoals, deleteGoal
- Add constraint CRUD: getActiveConstraints, createConstraint, updateConstraint
- Add getActiveInjuries, getCurrentTravelConstraints, resolveConstraint
- Add unit tests for all query functions

Co-Authored-By: Claude <agent>
```
