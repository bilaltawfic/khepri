# P6-B-02: Add Training Plan CRUD Queries

**Branch:** `feat/p6-b-02-training-plan-queries`
**Depends on:** P6-B-01 (✅ Complete - training_plans schema), P6-B-03 (✅ Complete - periodization logic)
**Blocks:** P6-B-04 (plan generation Edge Function), P6-B-06 (training plan mobile screen)

## Goal

Add comprehensive CRUD query functions for the `training_plans` table to the `@khepri/supabase-client` package, following the established patterns from goals, constraints, and conversations queries. These queries will be consumed by the plan generation Edge Function (P6-B-04) and the mobile training plan screen (P6-B-06).

## Files to Create

- `packages/supabase-client/src/queries/training-plans.ts` — Query functions
- `packages/supabase-client/src/__tests__/queries/training-plans.test.ts` — Unit tests

## Files to Modify

- `packages/supabase-client/src/queries/index.ts` — Add barrel exports
- `packages/supabase-client/src/index.ts` — Add barrel exports

## Existing Types (No Changes Needed)

All types already exist in `packages/supabase-client/src/types.ts`:
- `TrainingPlanRow` (line 698) — Row type
- `TrainingPlanInsert` (line 701) — Insert type
- `TrainingPlanUpdate` (line 704) — Update type (omits `id`, `athlete_id`, `created_at`)
- `PlanStatus` (line 43) — `'active' | 'paused' | 'completed' | 'cancelled'`
- `TrainingPhase` (line 60) — JSONB periodization phase structure
- `PlanAdjustment` (line 85) — JSONB adaptation entry

These are already re-exported from `index.ts` (lines 176-183).

## Implementation Steps

### 1. Create `queries/training-plans.ts`

Follow the established patterns from `goals.ts` and `constraints.ts`.

```typescript
/**
 * Training plan query functions
 *
 * CRUD operations and specialized queries for athlete training plans.
 */

import type {
  Json,
  KhepriSupabaseClient,
  PlanAdjustment,
  PlanStatus,
  TrainingPlanInsert,
  TrainingPlanRow,
  TrainingPlanUpdate,
} from '../types.js';
import { type QueryResult, createError } from './athlete.js';
```

#### Query Functions to Implement

**1a. `getTrainingPlanById`** — Fetch a single plan by ID

```typescript
export async function getTrainingPlanById(
  client: KhepriSupabaseClient,
  planId: string
): Promise<QueryResult<TrainingPlanRow>> {
  const { data, error } = await client
    .from('training_plans')
    .select('*')
    .eq('id', planId)
    .single();

  return {
    data,
    error: error ? createError(error) : null,
  };
}
```

**1b. `getAthleteTrainingPlans`** — Fetch all plans for an athlete, most recent first

```typescript
export async function getAthleteTrainingPlans(
  client: KhepriSupabaseClient,
  athleteId: string,
  options?: { status?: PlanStatus }
): Promise<QueryResult<TrainingPlanRow[]>> {
  let query = client
    .from('training_plans')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('start_date', { ascending: false });

  if (options?.status != null) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data ?? [], error: null };
}
```

**1c. `getActiveTrainingPlan`** — Fetch the active plan for an athlete (should be at most one)

```typescript
export async function getActiveTrainingPlan(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<TrainingPlanRow | null>> {
  const { data, error } = await client
    .from('training_plans')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1);

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data?.[0] ?? null, error: null };
}
```

**Note:** Uses `limit(1)` instead of `.single()` because there may be zero active plans (which `.single()` would treat as an error).

**1d. `getTrainingPlansForGoal`** — Fetch all plans linked to a specific goal

```typescript
export async function getTrainingPlansForGoal(
  client: KhepriSupabaseClient,
  goalId: string
): Promise<QueryResult<TrainingPlanRow[]>> {
  const { data, error } = await client
    .from('training_plans')
    .select('*')
    .eq('goal_id', goalId)
    .order('start_date', { ascending: false });

  if (error) {
    return { data: null, error: createError(error) };
  }

  return { data: data ?? [], error: null };
}
```

**1e. `createTrainingPlan`** — Create a new training plan

```typescript
export async function createTrainingPlan(
  client: KhepriSupabaseClient,
  data: TrainingPlanInsert
): Promise<QueryResult<TrainingPlanRow>> {
  const { data: plan, error } = await client
    .from('training_plans')
    .insert(data as never)  // `as never` due to Supabase generic inference limitation
    .select()
    .single();

  return {
    data: plan,
    error: error ? createError(error) : null,
  };
}
```

**1f. `updateTrainingPlan`** — Update plan fields

```typescript
export async function updateTrainingPlan(
  client: KhepriSupabaseClient,
  planId: string,
  data: TrainingPlanUpdate
): Promise<QueryResult<TrainingPlanRow>> {
  const { data: plan, error } = await client
    .from('training_plans')
    .update(data as never)  // `as never` due to Supabase generic inference limitation
    .eq('id', planId)
    .select()
    .single();

  return {
    data: plan,
    error: error ? createError(error) : null,
  };
}
```

**1g. Status transition helpers** — Follow the `completeGoal`/`cancelGoal` pattern from goals.ts

```typescript
/** Pause an active training plan */
export async function pauseTrainingPlan(
  client: KhepriSupabaseClient,
  planId: string
): Promise<QueryResult<TrainingPlanRow>> {
  return updateTrainingPlan(client, planId, { status: 'paused' });
}

/** Mark a training plan as completed */
export async function completeTrainingPlan(
  client: KhepriSupabaseClient,
  planId: string
): Promise<QueryResult<TrainingPlanRow>> {
  return updateTrainingPlan(client, planId, { status: 'completed' });
}

/** Cancel a training plan */
export async function cancelTrainingPlan(
  client: KhepriSupabaseClient,
  planId: string
): Promise<QueryResult<TrainingPlanRow>> {
  return updateTrainingPlan(client, planId, { status: 'cancelled' });
}
```

**Note:** Status validation is not done client-side. The database CHECK constraint on `status` ensures only valid values. If a status transition is invalid (e.g., completing an already-cancelled plan), the Edge Function / mobile app layer should enforce business rules. Keep query functions thin.

**1h. `addPlanAdaptation`** — Append an entry to the adaptations JSONB array

```typescript
/**
 * Add an adaptation record to a training plan.
 *
 * Fetches the current adaptations array, appends the new entry,
 * and writes back the full array. Uses a read-then-write pattern
 * because Supabase JS client does not support `jsonb_array_append`.
 */
export async function addPlanAdaptation(
  client: KhepriSupabaseClient,
  planId: string,
  adaptation: PlanAdjustment
): Promise<QueryResult<TrainingPlanRow>> {
  // 1. Fetch current adaptations
  const { data: current, error: fetchError } = await client
    .from('training_plans')
    .select('adaptations')
    .eq('id', planId)
    .single();

  if (fetchError) {
    return { data: null, error: createError(fetchError) };
  }

  // 2. Append new adaptation
  const existing = Array.isArray(current?.adaptations) ? current.adaptations : [];
  const updated = [...existing, adaptation];

  // 3. Write back
  const { data: plan, error: updateError } = await client
    .from('training_plans')
    .update({ adaptations: updated as unknown as Json } as never)
    .eq('id', planId)
    .select()
    .single();

  return {
    data: plan,
    error: updateError ? createError(updateError) : null,
  };
}
```

**1i. `deleteTrainingPlan`** — Hard delete

```typescript
export async function deleteTrainingPlan(
  client: KhepriSupabaseClient,
  planId: string
): Promise<QueryResult<null>> {
  const { error } = await client.from('training_plans').delete().eq('id', planId);

  return {
    data: null,
    error: error ? createError(error) : null,
  };
}
```

### 2. Update Barrel Exports

#### 2a. `queries/index.ts` — Add training plan section

After the embeddings section, add:

```typescript
// Training plan queries
export {
  addPlanAdaptation,
  cancelTrainingPlan,
  completeTrainingPlan,
  createTrainingPlan,
  deleteTrainingPlan,
  getActiveTrainingPlan,
  getAthleteTrainingPlans,
  getTrainingPlanById,
  getTrainingPlansForGoal,
  pauseTrainingPlan,
  updateTrainingPlan,
} from './training-plans.js';
```

#### 2b. `index.ts` — Add training plan query section

After the embeddings section (before the TYPES section), add:

```typescript
// Training plan queries
export {
  addPlanAdaptation,
  cancelTrainingPlan,
  completeTrainingPlan,
  createTrainingPlan,
  deleteTrainingPlan,
  getActiveTrainingPlan,
  getAthleteTrainingPlans,
  getTrainingPlanById,
  getTrainingPlansForGoal,
  pauseTrainingPlan,
  updateTrainingPlan,
} from './queries/index.js';
```

### 3. Unit Tests

Create `__tests__/queries/training-plans.test.ts` following the mock patterns from `goals.test.ts`.

#### Mock Setup

Follow the established mock chaining pattern used in other query test files. The exact mock setup depends on which chaining methods each query uses:

```typescript
import {
  createTrainingPlan,
  getTrainingPlanById,
  getAthleteTrainingPlans,
  getActiveTrainingPlan,
  getTrainingPlansForGoal,
  updateTrainingPlan,
  pauseTrainingPlan,
  completeTrainingPlan,
  cancelTrainingPlan,
  addPlanAdaptation,
  deleteTrainingPlan,
} from '../../queries/training-plans.js';
import type { KhepriSupabaseClient } from '../../types.js';
```

#### Test Cases

**getTrainingPlanById:**
- Returns plan when found
- Returns error when not found
- Returns error on query failure

**getAthleteTrainingPlans:**
- Returns plans ordered by start_date descending
- Returns empty array when no plans exist
- Filters by status when option provided
- Returns error on query failure

**getActiveTrainingPlan:**
- Returns the active plan when one exists
- Returns null (not error) when no active plan exists
- Returns error on query failure

**getTrainingPlansForGoal:**
- Returns plans linked to the goal
- Returns empty array when no plans for goal

**createTrainingPlan:**
- Creates plan with all fields and returns it
- Returns error on constraint violation (e.g., end_date < start_date)

**updateTrainingPlan:**
- Updates specified fields and returns updated plan
- Returns error when plan not found

**pauseTrainingPlan / completeTrainingPlan / cancelTrainingPlan:**
- Delegates to updateTrainingPlan with correct status value

**addPlanAdaptation:**
- Appends adaptation to existing array
- Handles empty/null existing adaptations array
- Returns error when plan not found (fetch step fails)
- Returns error when update step fails

**deleteTrainingPlan:**
- Returns null data and no error on success
- Returns error when plan not found

## Testing

### Verification Checklist
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm lint` — no linting errors
- [ ] `pnpm build` — builds successfully
- [ ] `pnpm typecheck` — type checking passes
- [ ] All 11 query functions exported from `queries/index.ts`
- [ ] All 11 query functions re-exported from main `index.ts`
- [ ] Unit tests cover all query functions with success, error, and edge cases
- [ ] `.js` extensions used in all import paths (ESM convention)
- [ ] `as never` used for `.insert()` and `.update()` calls (Supabase generic workaround)

## PR Details

- **Branch:** `feat/p6-b-02-training-plan-queries`
- **Title:** `feat(supabase): add training plan CRUD queries`
- **Scope:** ~250-350 lines (queries + tests)
- **Conversation log:** `claude-convos/YYYY-MM-DD/` (worker creates this)
