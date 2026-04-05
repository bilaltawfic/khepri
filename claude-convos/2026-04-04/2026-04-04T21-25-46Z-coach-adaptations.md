# P9-H: Coach Adaptations — Implementation Log

**Date:** 2026-04-04 → 2026-04-05  
**Branch:** feat/p9-h-coach-adaptations  
**PR:** #145  
**Plan:** plans/phase-9/subphases/p9h-coach-adaptations.md

## Goals

Implement the AI coach's ability to suggest daily workout modifications based on athlete check-in data and wellness metrics. Includes:

1. Rule-based pre-screening (`screenAdaptation`) before invoking Claude
2. Prompt building and response parsing in `@khepri/core`
3. `suggest-adaptation` Supabase edge function calling Claude Haiku
4. `AdaptationCard`, `SwapPreview`, `AdaptationCardFromRow` React Native components
5. `useAdaptations` hook for fetching and acting on pending suggestions
6. Dashboard and plan tab integration showing adaptation cards
7. `ai-orchestrator` context builder extended with pending adaptations
8. Block review complete screen (`block-review-complete.tsx`)
9. **Schedule-aware swap logic** with ±7 day workout window in AI prompts
10. **`swap_not_viable` type** for when schedule conflicts prevent a swap

## Key Decisions

### Schedule-aware swap logic

The AI prompt now includes a ±7 day workout schedule so the model can reason about adjacency before suggesting a swap. If a swap is the right call but no suitable day exists without creating back-to-back hard sessions, the AI returns `swap_not_viable` instead. This shows the athlete a "Schedule Conflict" card explaining why, letting them decide how to proceed.

### `screenAdaptation` takes optional `plannedDurationMinutes`

The `reduce_duration` suggestion should only fire when the athlete's available time is *less than* the planned workout duration — not just when they have any available time set. Added an optional `plannedDurationMinutes` parameter so the function can make this comparison.

### Edge function mirrors core library logic locally

The `suggest-adaptation` edge function (Deno) cannot import from the `@khepri/core` npm package. Both `screenAdaptation` and related types are duplicated locally in the edge function. This is intentional — `helpers.ts` is excluded from SonarCloud CPD analysis.

### WorkoutSnapshot before/after structure

The `plan_adaptations.affected_workouts` JSONB stores `{workoutId, before, after, changeType}` snapshots. The `before` always captures the original planned workout; `after` holds only the changed fields. This enables rollback by restoring `before` fields.

### AdaptationCardFromRow eliminates duplication

Shared adaptation card rendering logic (type parsing, swap target derivation, prop mapping) extracted into `AdaptationCardFromRow` component, used by both plan.tsx and index.tsx.

### Type invariant enforcement in parsers

Both `parseAdaptationResponse` (core) and `parseResponse` (edge function) enforce:
- `swap_days` requires valid `swapTargetDate`
- `no_change` and `swap_not_viable` require null `modifiedWorkout`/`modifiedFields`
- Other types require non-null `modifiedWorkout`/`modifiedFields`

### Athlete ownership verification

The edge function verifies the authenticated user owns the `athlete_id` via `athletes.auth_user_id = user.id` before proceeding, matching the pattern used by other edge functions.

## Files Changed

### New Files
- `packages/core/src/utils/adaptation-engine.ts` — Core adaptation logic (screening, prompt building, response parsing, snapshot helpers)
- `packages/core/src/__tests__/adaptation-engine.test.ts` — 30+ unit tests
- `supabase/functions/suggest-adaptation/index.ts` — Edge function (Claude Haiku)
- `supabase/functions/suggest-adaptation/helpers.ts` — Testable helpers extracted from edge function
- `supabase/functions/suggest-adaptation/__tests__/helpers.test.ts` — 50+ unit tests
- `apps/mobile/components/adaptation/AdaptationCard.tsx` — Coach suggestion card UI
- `apps/mobile/components/adaptation/AdaptationCardFromRow.tsx` — Row-to-card adapter (deduplication)
- `apps/mobile/components/adaptation/SwapPreview.tsx` — Day-swap before/after preview
- `apps/mobile/components/adaptation/index.ts` — Barrel export
- `apps/mobile/components/__tests__/AdaptationCard.test.tsx` — Component tests
- `apps/mobile/components/__tests__/AdaptationCardFromRow.test.tsx` — 10 tests
- `apps/mobile/components/__tests__/SwapPreview.test.tsx` — Component tests
- `apps/mobile/hooks/useAdaptations.ts` — Fetch/accept/reject hook
- `apps/mobile/hooks/__tests__/useAdaptations.test.ts` — 13 tests
- `apps/mobile/app/plan/block-review-complete.tsx` — Block completion review screen
- `apps/mobile/app/plan/__tests__/block-review-complete.test.tsx` — 17 tests

### Modified Files
- `packages/core/src/utils/index.ts` — Added adaptation-engine + compliance exports
- `packages/core/src/index.ts` — Added adaptation-engine re-exports
- `supabase/functions/ai-orchestrator/prompts.ts` — Format pending adaptations in system prompt
- `supabase/functions/ai-orchestrator/__tests__/prompts.test.ts` — Adaptation prompt tests
- `supabase/jest.config.js` — Added helpers.ts to collectCoverageFrom
- `sonar-project.properties` — Added helpers.ts to CPD exclusions
- `apps/mobile/app/(tabs)/index.tsx` — Render adaptation cards on dashboard
- `apps/mobile/app/(tabs)/plan.tsx` — Render adaptation banner on plan tab
- `apps/mobile/utils/plan-helpers.ts` — Added getAdaptationWorkoutPair shared helper

## Learnings

- **JSX text node splitting**: `{workout.durationMinutes} min` renders as two separate text nodes. Tests must search for `"60"` not `"60 min"`.
- **SonarCloud S3776 cognitive complexity**: Extracted helpers (`stripCodeFences`, `isWorkoutSnapshotShape`, `isPlainObject`) to keep parser functions under threshold of 15.
- **SonarCloud S3358 nested ternary**: Use if/else blocks instead of nested ternaries for `modifiedWorkout` validation.
- **UTC date arithmetic**: Use `new Date('${date}T00:00:00Z')` and `setUTCDate()` for date-only arithmetic in edge functions to avoid timezone/DST off-by-one issues.
- **Duplication management**: Intentional duplication between Deno edge functions and npm packages requires SonarCloud CPD exclusions. Shared rendering logic across screens should be extracted into components early.
- **Copilot review thoroughness**: 4 rounds of Copilot review comments required iterative fixes for validation tightening, accessibility, isMountedRef guards, and type invariant enforcement.
