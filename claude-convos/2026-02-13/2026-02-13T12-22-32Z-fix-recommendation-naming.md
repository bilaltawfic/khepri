# Fix: Standardize ai_recommendation JSON to camelCase

**Date:** 2026-02-13
**Task:** Implement the naming fix described in `plans/phase-2/subphases/p2-fix-recommendation-naming.md`

## Goals
- Standardize all `ai_recommendation` JSON test data from snake_case/ad-hoc shapes to match the canonical `AIRecommendation` type (camelCase)

## Key Decisions
- Used the `AIRecommendation` type from `apps/mobile/types/checkin.ts` as the canonical shape: `{ workoutSuggestion, summary, intensityLevel, duration }`
- Updated both integration and unit test files to use realistic camelCase payloads
- Did NOT change `DayTemplate` snake_case fields (those mirror DB column names, per plan)

## Files Changed
1. `packages/supabase-client/src/__tests__/integration/checkins.integration.test.ts`
   - Line ~238: `{ workout_type, duration_minutes, intensity, rationale }` -> `{ workoutSuggestion, summary, intensityLevel, duration }`
   - Line ~277: `{ workout: 'test' }` -> full camelCase shape
   - Line ~322: `{ workout: 'pending_test' }` -> full camelCase shape

2. `packages/supabase-client/src/__tests__/queries/checkins.test.ts`
   - Line ~57: `{ workout: 'Easy run' }` -> full camelCase shape
   - Line ~260: `{ workout: 'Tempo run', duration: 45 }` -> full camelCase shape

## Verification
- All 115 supabase-client unit tests pass
- All 990 total tests pass across the monorepo
- Biome formatting applied and clean on changed files
- Pre-existing lint warnings and typecheck errors are unrelated to these changes
