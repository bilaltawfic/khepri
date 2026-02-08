# Integration Tests - Copilot Review Learnings

**Date:** 2026-02-08
**Task:** P1-B-06 Supabase Integration Tests
**PR:** #19

## Goals
1. Address all Copilot review comments on PR #19
2. Fix integration tests failing in CI
3. Document learnings for future development

## Key Issues Addressed

### CI Test Failures - Root Cause
The integration tests were failing in CI due to JWT signature validation errors. The root cause was:
- **Supabase CLI version mismatch**: Local development used v2.75.0 while CI used v2.76.3
- Different CLI versions generate different JWT signing keys
- Hardcoded demo keys in test setup didn't match CI's generated keys

**Solution:**
1. Pinned Supabase CLI to v2.75.0 in CI workflow
2. Added dynamic key extraction from `supabase status -o json` in CI
3. Added `isLocalSupabaseUrl` guard to only allow hardcoded demo keys for localhost

### Error Assertion Pattern - Query Functions
**Problem:** Tests using `error.code` assertions (e.g., `23514` for check violations) were failing because query functions use `createError()` which wraps the Supabase error and only preserves `message`, not `code`.

**Solution:**
- For **raw database operations** (direct `client.from().insert()`): Use `error.code` assertions
- For **query function wrappers** (e.g., `createAthlete()`): Use `error.message` assertions with `.toContain('duplicate')` or `.toContain('foreign key')`

### Test Setup Patterns
Copilot flagged several patterns that lead to unclear test failures:

1. **beforeAll guards**: Always assert setup succeeded before proceeding
   ```typescript
   if (error || !athlete || !athlete.id) {
     throw new Error(`Failed to create test athlete: ${error?.message ?? 'missing id'}`);
   }
   ```

2. **ID guards for shared arrays**: When pushing IDs to arrays for later tests
   ```typescript
   const goalId = result.data?.id;
   if (!goalId) throw new Error('Expected goal ID to be defined');
   createdGoalIds.push(goalId);
   ```

3. **Eliminate optional chaining for function arguments**: Replace `fn(obj?.id)` with
   ```typescript
   if (!obj) throw new Error('Expected obj to be defined');
   fn(obj.id);
   ```

### Order-Dependent Tests
Integration tests are inherently more coupled than unit tests. Copilot flagged several order-dependent patterns, but we acknowledged these as intentional:
- Integration tests verify full CRUD lifecycle
- Minimum count checks ensure earlier setup worked
- Tests that need specific fixtures now set them up within the test

### Type Assertions
Database return types must match assertions:
- `sleep_hours` is `number | null` -> use `.toBe(7.5)` not `.toBe('7.5')`
- `perf_target_value` is `number | null` -> use `.toBe(280)` not `.toBe('280')`

## Files Changed
- `.github/workflows/integration-test.yml` - Pinned Supabase CLI, dynamic key extraction
- `packages/supabase-client/src/__tests__/integration/setup.ts` - Security guard for demo keys, error handling
- `packages/supabase-client/src/__tests__/integration/athlete.integration.test.ts` - ID guards, self-contained setup
- `packages/supabase-client/src/__tests__/integration/checkins.integration.test.ts` - ID guards, proper beforeAll
- `packages/supabase-client/src/__tests__/integration/constraints.integration.test.ts` - ID guards, proper beforeAll
- `packages/supabase-client/src/__tests__/integration/goals.integration.test.ts` - ID guards, proper beforeAll, type fixes

## Learnings for MEMORY.md
Added to Copilot Code Review Patterns:
- Error code assertions for DB errors
- Test setup assertions
- Shared array guards
- Pin CI tool versions (never use `version: latest`)

## Copilot Review Summary
Responded to all 25 comments:
- **Fixed issues (16):** ID guards, type mismatches, beforeAll assertions, security guards
- **Acknowledged design decisions (5):** Order-dependent tests explained as intentional for integration testing
- **Previously fixed (4):** Jest config, numeric types (already addressed in earlier commits)
