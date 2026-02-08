# P1-B-03: Athlete Query Functions Implementation

**Date:** 2026-02-08
**Task:** Implement typed query functions for athletes table
**PR:** #16 (feat/p1-b-03-athlete-queries)

## Goals

Implement the plan from `plans/phase-1/prompts/p1-b-03-athlete-queries.md`:
- Create typed query functions for athletes table
- Create unit tests with mock Supabase client
- Keep PR small (<200 lines)

## Files Created/Modified

### Created
- `packages/supabase-client/src/queries/athlete.ts` - 6 query functions:
  - `getAthleteByAuthUser` - lookup by Supabase auth user ID
  - `getAthleteById` - lookup by athlete table primary key
  - `createAthlete` - create new athlete profile
  - `updateAthlete` - update athlete fields
  - `getAthleteFitnessNumbers` - get fitness metrics subset
  - `updateIntervalsConnection` - update Intervals.icu connection status
- `packages/supabase-client/src/queries/index.ts` - barrel export
- `packages/supabase-client/src/__tests__/queries/athlete.test.ts` - 14 unit tests

### Modified
- `packages/supabase-client/src/index.ts` - added query exports

## Key Decisions

### 1. QueryResult<T> Type Pattern
Created a standardized result type that mirrors Supabase's pattern:
```typescript
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}
```

### 2. Chainable Mock Setup
Jest mock needed to support Supabase's chainable API patterns:
```typescript
// Support both .eq().single() and .eq().select().single()
const mockEq = jest.fn(() => ({
  select: mockSelectAfterEq,
  single: mockSingle
}));
```

### 3. ESM Mocking
Used Jest's ESM-compatible mocking with `.js` extensions in imports per project conventions.

## Problems Encountered

### 1. Mock Chain Incomplete
**Error:** `client.from(...).update(...).eq(...).select is not a function`

**Root Cause:** Original mock for `mockEq` only returned `{ single: mockSingle }`, but `updateAthlete` uses `.update().eq().select().single()` chain.

**Fix:** Extended `mockEq` to return both `select` and `single`.

### 2. Wrong Branch Commit
Initially committed to wrong branch (`feat/p1-b-05-goals-constraints-queries`).

**Fix:** Used git cherry-pick to move commit to correct branch:
```bash
git stash
git checkout feat/p1-b-03-athlete-queries
git cherry-pick <commit-hash>
```

### 3. Parallel Agent Coordination
Other parallel agents (P1-B-04, P1-B-05) modified shared files:
- `queries/index.ts` - added goals.js and constraints.js exports
- `types.ts` - modified Database schema

This caused build failures on the main development branch. Files from parallel agents have type errors that need to be fixed separately.

## Learnings

1. **Supabase mock chains need to support all query patterns** - Different operations (select, insert, update) have different chain patterns. The mock must return the right methods at each step.

2. **Parallel agent work requires careful coordination** - When multiple agents work on related files, changes can conflict. The barrel export pattern in `index.ts` is particularly susceptible.

3. **ESM Jest requires `.js` extensions** - Per project conventions, all imports in test files must use `.js` extensions.

## Status

- PR #16 created and pushed
- All 14 athlete query tests passing
- Waiting for Copilot review
