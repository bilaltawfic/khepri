# P9-A-08 to P9-A-11: Supabase Client Queries for Season-Based Planning

## Goal

Add TypeScript query functions for the new season-based planning tables (`seasons`, `race_blocks`, `workouts`, `plan_adaptations`) to `@khepri/supabase-client`. Follow existing patterns from `training-plans.ts`.

**Parent plan:** [p9a-data-model.md](./p9a-data-model.md)
**Design doc:** [docs/design/training-plan-redesign.md](../../../docs/design/training-plan-redesign.md)
**Depends on:** P9-A-01 to P9-A-07 (migrations) + P9-A-12 (core types)
**Blocks:** P9-B through P9-I (all downstream sub-phases need these queries)

## Tasks Covered

| ID | Task |
|----|------|
| P9-A-08 | Add seasons queries to supabase-client |
| P9-A-09 | Add race_blocks queries to supabase-client |
| P9-A-10 | Add workouts queries to supabase-client |
| P9-A-11 | Add plan_adaptations queries to supabase-client |

## Files to Create

| File | Purpose |
|------|---------|
| `packages/supabase-client/src/queries/seasons.ts` | Season CRUD + one-active enforcement |
| `packages/supabase-client/src/queries/race-blocks.ts` | RaceBlock CRUD + lifecycle transitions |
| `packages/supabase-client/src/queries/workouts.ts` | Workout CRUD + bulk insert + compliance updates |
| `packages/supabase-client/src/queries/plan-adaptations.ts` | Adaptation CRUD + rollback support |
| `packages/supabase-client/src/queries/__tests__/seasons.test.ts` | Unit tests |
| `packages/supabase-client/src/queries/__tests__/race-blocks.test.ts` | Unit tests |
| `packages/supabase-client/src/queries/__tests__/workouts.test.ts` | Unit tests |
| `packages/supabase-client/src/queries/__tests__/plan-adaptations.test.ts` | Unit tests |

## Files to Modify

| File | Change |
|------|--------|
| `packages/supabase-client/src/types.ts` | Add Row/Insert/Update types for new tables |
| `packages/supabase-client/src/queries/index.ts` | Add barrel exports for new query modules |
| `packages/supabase-client/src/index.ts` | Add barrel exports (if not already re-exporting from queries/index) |

## Implementation Steps

### 1. Add types to `packages/supabase-client/src/types.ts`

Add after existing type definitions, following the same pattern:

```typescript
// =============================================================================
// SEASON TYPES
// =============================================================================

export type SeasonStatus = 'active' | 'completed' | 'archived';
export type BlockStatus = 'draft' | 'locked' | 'in_progress' | 'completed' | 'cancelled';
export type WorkoutSport = 'swim' | 'bike' | 'run' | 'strength' | 'rest';
export type WorkoutSyncStatus = 'pending' | 'synced' | 'conflict' | 'not_connected';
export type IntervalsTarget = 'POWER' | 'PACE' | 'HR' | 'AUTO';
export type AdaptationTrigger = 'coach_suggestion' | 'athlete_request' | 'block_review' | 'external_sync';
export type AdaptationStatus = 'suggested' | 'accepted' | 'rejected' | 'rolled_back';

// Season row types
export interface SeasonRow {
  readonly id: string;
  readonly athlete_id: string;
  readonly name: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly status: SeasonStatus;
  readonly preferences: Json;
  readonly skeleton: Json | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface SeasonInsert {
  readonly athlete_id: string;
  readonly name: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly status?: SeasonStatus;
  readonly preferences?: Json;
  readonly skeleton?: Json | null;
}

export interface SeasonUpdate {
  readonly name?: string;
  readonly start_date?: string;
  readonly end_date?: string;
  readonly status?: SeasonStatus;
  readonly preferences?: Json;
  readonly skeleton?: Json | null;
}

// RaceBlock row types
export interface RaceBlockRow { ... }
export interface RaceBlockInsert { ... }
export interface RaceBlockUpdate { ... }

// Workout row types
export interface WorkoutRow { ... }
export interface WorkoutInsert { ... }
export interface WorkoutUpdate { ... }

// PlanAdaptation row types
export interface PlanAdaptationRow { ... }
export interface PlanAdaptationInsert { ... }
```

### 2. Create `packages/supabase-client/src/queries/seasons.ts`

Follow the `training-plans.ts` pattern: ESM `.js` imports, `QueryResult<T>` returns, `createError()`.

```typescript
import type { KhepriSupabaseClient, SeasonInsert, SeasonRow, SeasonUpdate } from '../types.js';
import { type QueryResult, createError } from './athlete.js';

/** Get the active season for an athlete (at most one due to DB constraint) */
export async function getActiveSeason(
  client: KhepriSupabaseClient,
  athleteId: string,
): Promise<QueryResult<SeasonRow | null>> {
  const { data, error } = await client
    .from('seasons')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .limit(1);

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data?.[0] ?? null, error: null };
}

/** Get a season by ID */
export async function getSeasonById(
  client: KhepriSupabaseClient,
  seasonId: string,
): Promise<QueryResult<SeasonRow>> {
  const { data, error } = await client
    .from('seasons')
    .select('*')
    .eq('id', seasonId)
    .single();

  return { data, error: error ? createError(error) : null };
}

/** Get all seasons for an athlete */
export async function getAthleteSeasons(
  client: KhepriSupabaseClient,
  athleteId: string,
): Promise<QueryResult<SeasonRow[]>> {
  const { data, error } = await client
    .from('seasons')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('start_date', { ascending: false });

  if (error) {
    return { data: null, error: createError(error) };
  }
  return { data: data ?? [], error: null };
}

/** Create a new season */
export async function createSeason(
  client: KhepriSupabaseClient,
  data: SeasonInsert,
): Promise<QueryResult<SeasonRow>> {
  const { data: season, error } = await client
    .from('seasons')
    .insert(data as never)
    .select()
    .single();

  return { data: season, error: error ? createError(error) : null };
}

/** Update a season */
export async function updateSeason(
  client: KhepriSupabaseClient,
  seasonId: string,
  data: SeasonUpdate,
): Promise<QueryResult<SeasonRow>> {
  const { data: season, error } = await client
    .from('seasons')
    .update(data as never)
    .eq('id', seasonId)
    .select()
    .single();

  return { data: season, error: error ? createError(error) : null };
}

/** Archive a season (sets status to 'archived') */
export async function archiveSeason(
  client: KhepriSupabaseClient,
  seasonId: string,
): Promise<QueryResult<SeasonRow>> {
  return updateSeason(client, seasonId, { status: 'archived' });
}

/** Complete a season (sets status to 'completed') */
export async function completeSeason(
  client: KhepriSupabaseClient,
  seasonId: string,
): Promise<QueryResult<SeasonRow>> {
  return updateSeason(client, seasonId, { status: 'completed' });
}
```

### 3. Create `packages/supabase-client/src/queries/race-blocks.ts`

Key functions:
- `getRaceBlockById(client, blockId)` → `QueryResult<RaceBlockRow>`
- `getSeasonRaceBlocks(client, seasonId)` → `QueryResult<RaceBlockRow[]>`
- `getActiveBlock(client, athleteId)` → `QueryResult<RaceBlockRow | null>` (status = 'in_progress')
- `createRaceBlock(client, data)` → `QueryResult<RaceBlockRow>`
- `updateRaceBlock(client, blockId, data)` → `QueryResult<RaceBlockRow>`
- `lockBlock(client, blockId)` → sets status='locked', locked_at=now()
- `startBlock(client, blockId)` → sets status='in_progress'
- `completeBlock(client, blockId)` → sets status='completed'
- `cancelBlock(client, blockId)` → sets status='cancelled'

### 4. Create `packages/supabase-client/src/queries/workouts.ts`

Key functions:
- `getWorkoutById(client, workoutId)` → `QueryResult<WorkoutRow>`
- `getBlockWorkouts(client, blockId)` → `QueryResult<WorkoutRow[]>` (ordered by date)
- `getWorkoutsByDate(client, athleteId, date)` → `QueryResult<WorkoutRow[]>`
- `getWorkoutsForDateRange(client, athleteId, startDate, endDate)` → `QueryResult<WorkoutRow[]>`
- `getWorkoutByExternalId(client, externalId)` → `QueryResult<WorkoutRow | null>`
- `createWorkout(client, data)` → `QueryResult<WorkoutRow>`
- `bulkInsertWorkouts(client, workouts)` → `QueryResult<WorkoutRow[]>` (for block generation)
- `updateWorkout(client, workoutId, data)` → `QueryResult<WorkoutRow>`
- `updateWorkoutActuals(client, workoutId, actuals)` → update actual_* fields + completed_at
- `updateWorkoutCompliance(client, workoutId, compliance)` → update compliance JSONB
- `updateWorkoutSyncStatus(client, workoutId, syncStatus, intervalsEventId?)` → update sync fields
- `deleteBlockWorkouts(client, blockId)` → delete all workouts for a block (for regeneration)

### 5. Create `packages/supabase-client/src/queries/plan-adaptations.ts`

Key functions:
- `getAdaptationById(client, adaptationId)` → `QueryResult<PlanAdaptationRow>`
- `getBlockAdaptations(client, blockId)` → `QueryResult<PlanAdaptationRow[]>` (ordered by created_at DESC)
- `getPendingAdaptations(client, athleteId)` → `QueryResult<PlanAdaptationRow[]>` (status = 'suggested')
- `createAdaptation(client, data)` → `QueryResult<PlanAdaptationRow>`
- `acceptAdaptation(client, adaptationId)` → sets status='accepted'
- `rejectAdaptation(client, adaptationId)` → sets status='rejected'
- `rollbackAdaptation(client, adaptationId, rolledBackBy)` → sets status='rolled_back', rolled_back_at, rolled_back_by

### 6. Update barrel exports

Add to `packages/supabase-client/src/queries/index.ts`:
```typescript
// Season queries
export { getActiveSeason, getSeasonById, getAthleteSeasons, createSeason, updateSeason, archiveSeason, completeSeason } from './seasons.js';

// Race block queries
export { getRaceBlockById, getSeasonRaceBlocks, getActiveBlock, createRaceBlock, updateRaceBlock, lockBlock, startBlock, completeBlock, cancelBlock } from './race-blocks.js';

// Workout queries
export { getWorkoutById, getBlockWorkouts, getWorkoutsByDate, getWorkoutsForDateRange, getWorkoutByExternalId, createWorkout, bulkInsertWorkouts, updateWorkout, updateWorkoutActuals, updateWorkoutCompliance, updateWorkoutSyncStatus, deleteBlockWorkouts } from './workouts.js';

// Plan adaptation queries
export { getAdaptationById, getBlockAdaptations, getPendingAdaptations, createAdaptation, acceptAdaptation, rejectAdaptation, rollbackAdaptation } from './plan-adaptations.js';
```

## Code Patterns to Follow

1. **ESM imports with `.js` extension** — all local imports use `.js`
2. **`QueryResult<T>` return type** — `{ data: T | null; error: ... | null }`
3. **`createError(error)`** — wraps Supabase errors into consistent format
4. **`as never` cast on insert/update** — works around Supabase client type strictness
5. **`data?.[0] ?? null`** — for queries that may return 0 rows (use `limit(1)` not `single()`)
6. **`!= null`** checks — not truthy checks, per project convention (SonarCloud S7735)
7. **No default exports** — named exports only

## Testing Requirements

Mock the Supabase client (follow existing test patterns in the package):
- Each query function called with correct table/columns/filters
- Error paths return `{ data: null, error }` with `createError`
- Success paths return correct shape
- Lifecycle transitions (lock, start, complete, cancel) pass correct status values
- Bulk insert sends array to `.insert()`
- `getActiveSeason` returns `null` (not error) when no active season

## Verification Checklist

- [ ] All 4 query files created with correct patterns
- [ ] Types added to `types.ts` for all new tables
- [ ] Barrel exports updated in `queries/index.ts`
- [ ] `pnpm test` passes in `packages/supabase-client`
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] All query functions have tests
