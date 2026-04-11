# P9E-R11: Tighten Season Skeleton Determinism

## Goals
- Make `generate-season-skeleton` produce repeatable, schema-validated output for identical inputs
- Add response validation to catch invalid Claude outputs before they reach the database

## Key Decisions
1. **Extracted prompts to `prompts.ts`**: Separated `buildSystemPrompt` and `buildUserPrompt` into their own module so they can be unit-tested without triggering the Deno `serve()` runtime
2. **Created `validation.ts`**: `validateSkeletonResponse()` checks 8 invariants (week sums, date contiguity, hours budget, phase types, date validity, season bounds)
3. **502 on validation failure**: Invalid Claude output returns a generic 502 error to the client while logging full details server-side
4. **Canonical sorting in prompt builder**: Races sorted by (date, name), goals by (goalType, title) — ensures same logical input produces identical prompts

## Files Changed
- `supabase/functions/generate-season-skeleton/index.ts` - Added temperature:0, imported from new modules, wired validator
- `supabase/functions/generate-season-skeleton/prompts.ts` - New: extracted prompt builders with canonical sorting
- `supabase/functions/generate-season-skeleton/validation.ts` - New: response validator with 8 checks
- `supabase/functions/generate-season-skeleton/__tests__/prompts.test.ts` - New: 9 tests for prompt content and sorting
- `supabase/functions/generate-season-skeleton/__tests__/validation.test.ts` - New: 14 tests for all validation paths
- `supabase/jest.config.js` - Added new files to coverage collection
- `biome.json` - No changes (was stashed from prior work)

## Learnings
- Supabase edge functions using `serve()` at module level can't be imported in Jest tests; extracting testable logic to separate modules is the pattern used in this codebase
- The existing `generate-block-workouts` function follows the same pattern (validation.ts extracted, tests import from it)
