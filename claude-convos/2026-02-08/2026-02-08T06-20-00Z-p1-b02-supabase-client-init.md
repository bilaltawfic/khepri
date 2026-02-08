# P1-B-02: Supabase Client Initialization

**Date:** 2026-02-08
**PR:** #15

## Goals

Implement `packages/supabase-client/` with:
- Typed Supabase client factory functions
- Database schema types matching SQL migrations
- Environment variable configuration helpers

## Key Decisions

### 1. Type System Design
- Used utility types (`InsertType<T>`, `UpdateType<T>`) to reduce code duplication
- Initial implementation had ~460 lines, refactored to ~250 lines
- Achieved 0% code duplication (SonarCloud quality gate passed)

### 2. Nullability Alignment
- Fields with `DEFAULT` but no `NOT NULL` in SQL schema are typed as nullable
- Affected fields: `preferred_units`, `timezone`, `daily_checkin_time`, `intervals_icu_connected`, `priority`, `status`
- Added JSDoc comments explaining why these are nullable

### 3. JSONB Type Representation
- Created `Json` type alias for JSONB columns: `string | number | boolean | null | object | array`
- More accurate than `Record<string, unknown>` which is too restrictive

### 4. Non-Node Environment Guards
- Added `typeof process === 'undefined'` guards for browser/React Native/Edge compatibility
- `createSupabaseClientFromEnv()` throws clear error directing users to explicit config
- `getSupabaseConfigStatus()` returns all false when process.env unavailable

### 5. ESM-Compatible Jest Mocking
- Used `jest.unstable_mockModule()` with dynamic imports
- Pattern required for ESM modules in Jest

## Copilot Review Summary

### Round 1 (5 comments - all resolved)
1. **Nullability mismatch** - Athletes fields with DEFAULT but no NOT NULL were typed as required
2. **Goals nullability** - priority and status should be nullable
3. **Constraints status** - should be nullable
4. **Training plans status** - should be nullable
5. **JSONB typing** - `Record<string, unknown>` too restrictive, need `Json` type

### Round 2 (5 comments - all resolved)
1. **process.env guard in createSupabaseClientFromEnv** - Added guard for non-Node runtimes
2. **process.env guard in getSupabaseConfigStatus** - Returns all false when unavailable
3. **JSDoc top-level await** - Wrapped example in async function
4. **Package description** - Added training plans to description
5. **UpdateType comment** - Changed "can't update" to "should not be updated"

### Round 3 (5 comments - all resolved)
1. **Test count discrepancy** - Copilot miscounted (said 18, actually 17). Confirmed correct with Jest output.
2. **Json type allows undefined** - Removed `undefined` from object branch, now `{ [key: string]: Json }`
3. **Header claims "exact match"** - Rewrote to clarify types are application-level contracts, not exact DB mirror
4. **soreness_areas should be Json** - Added JSDoc noting it's a structured type validated on write
5. **training_plans JSONB fields** - Added JSDoc to phases, weekly_template, adjustments_log explaining design choice

**Design Decision**: Keep structured types for JSONB (better DX) rather than raw `Json | null`. We control the write path and validate structure there. Header now documents this trade-off.

## Files Changed

- `packages/supabase-client/src/client.ts` - Client factory with env guards
- `packages/supabase-client/src/types.ts` - Database types with utility types
- `packages/supabase-client/src/index.ts` - Public exports with JSDoc examples
- `packages/supabase-client/src/__tests__/client.test.ts` - 17 unit tests
- `docs/database-schema.md` - Mermaid ER diagram and schema documentation

## Learnings

1. **SonarCloud Duplication**: Repetitive Row/Insert/Update interfaces trigger duplication warnings. Use utility types to generate them from Row types.

2. **SQL Nullability**: `DEFAULT 'value'` without `NOT NULL` means the column IS nullable (can be explicitly set to NULL). Type accordingly.

3. **Copilot Review Patterns**: Common issues flagged:
   - Process.env guards for cross-platform code
   - JSDoc examples must be valid TypeScript (async/await context)
   - Package descriptions should match all exported types
   - Comments should not imply DB-level enforcement when it's type-level only

4. **ESM Jest Mocking**: For ESM modules, use:
   ```typescript
   const mockFn = jest.fn();
   jest.unstable_mockModule('module', () => ({ fn: mockFn }));
   const { fn } = await import('./module.js');
   ```

5. **JSONB Typing Trade-off**: For application-controlled JSONB columns, prefer structured types over raw `Json` for better DX. Document this in the header and add JSDoc to affected fields. Use `Json` only for truly unstructured data (e.g., AI recommendation output).
