# P9-H: Coach Adaptations — Implementation Log

**Date:** 2026-04-04  
**Branch:** feat/p9-h-coach-adaptations  
**Plan:** plans/phase-9/subphases/p9h-coach-adaptations.md

## Goals

Implement the AI coach's ability to suggest daily workout modifications based on athlete check-in data and wellness metrics. Includes:

1. Rule-based pre-screening (`screenAdaptation`) before invoking Claude
2. Prompt building and response parsing in `@khepri/core`
3. `suggest-adaptation` Supabase edge function calling Claude Haiku
4. `AdaptationCard` and `SwapPreview` React Native components
5. `useAdaptations` hook for fetching and acting on pending suggestions
6. Dashboard and plan tab integration showing adaptation cards
7. `ai-orchestrator` context builder extended with pending adaptations
8. Block review complete screen (`block-review-complete.tsx`)

## Key Decisions

### `screenAdaptation` takes optional `plannedDurationMinutes`

The `reduce_duration` suggestion should only fire when the athlete's available time is *less than* the planned workout duration — not just when they have any available time set. Added an optional `plannedDurationMinutes` parameter so the function can make this comparison. Without it, the function conservatively flags time constraint if any `availableTimeMinutes` is provided (existing behavior preserved).

### Edge function mirrors core library logic locally

The `suggest-adaptation` edge function (Deno) cannot import from the `@khepri/core` npm package. Both `screenAdaptation` and related types are duplicated locally in the edge function. This is intentional and acceptable — the edge function is a separate deployment unit.

### WorkoutSnapshot before/after structure

The `plan_adaptations.affected_workouts` JSONB stores `{workoutId, before, after, changeType}` snapshots. The `before` always captures the original planned workout; `after` holds only the changed fields (empty object for `no_change`). This enables rollback by restoring `before` fields.

### Adaptation cards rendered inline on Dashboard and Plan tabs

Rather than a dedicated route, adaptation cards are rendered inline above the current day's workout (Dashboard) or above the active block view (Plan tab). This keeps the UI discoverable without requiring navigation.

### Context builder uses Promise.all for parallel queries

The existing `fetchAthleteContext` already used `Promise.all` for athlete, goals, constraints, and check-in. Added a 5th parallel query for `plan_adaptations` (status='suggested', limit 3) to include pending adaptations in the orchestrator context.

## Files Changed

### New Files
- `packages/core/src/utils/adaptation-engine.ts` — Core adaptation logic (screening, prompt building, response parsing, snapshot helpers)
- `packages/core/src/__tests__/adaptation-engine.test.ts` — 30+ unit tests
- `supabase/functions/suggest-adaptation/index.ts` — Edge function (Claude Haiku)
- `apps/mobile/components/adaptation/AdaptationCard.tsx` — Coach suggestion card UI
- `apps/mobile/components/adaptation/SwapPreview.tsx` — Day-swap before/after preview
- `apps/mobile/components/adaptation/index.ts` — Barrel export
- `apps/mobile/components/__tests__/AdaptationCard.test.tsx` — Component tests
- `apps/mobile/components/__tests__/SwapPreview.test.tsx` — Component tests
- `apps/mobile/hooks/useAdaptations.ts` — Fetch/accept/reject hook
- `apps/mobile/app/plan/block-review-complete.tsx` — Block completion review screen

### Modified Files
- `packages/core/src/utils/index.ts` — Added adaptation-engine exports
- `packages/core/src/index.ts` — Added adaptation-engine re-exports
- `apps/mobile/hooks/index.ts` — Added useAdaptations export
- `supabase/functions/ai-orchestrator/types.ts` — Added PendingAdaptation, updated AthleteContext
- `supabase/functions/ai-orchestrator/context-builder.ts` — Fetch pending adaptations
- `supabase/functions/ai-orchestrator/prompts.ts` — Format pending adaptations in system prompt
- `supabase/functions/ai-orchestrator/__tests__/context-builder.test.ts` — Mock fix for plan_adaptations table
- `apps/mobile/app/(tabs)/index.tsx` — Render adaptation cards on dashboard
- `apps/mobile/app/(tabs)/plan.tsx` — Render adaptation banner on plan tab
- `apps/mobile/app/(tabs)/__tests__/index.test.tsx` — Added useAdaptations mock

## Learnings

- **JSX text node splitting**: `{workout.durationMinutes} min` renders as two separate text nodes (`"60"` and `" min"`). Tests searching for the full string `"60 min"` fail; search for `"60"` instead or use `toJSON()`.
- **React Native Testing Library disabled state**: `fireEvent.press` bypasses the `disabled` prop. Testing disabled state means verifying render-without-crash or checking `accessibilityState`, not verifying handler isn't called.
- **TypeScript narrowing in JSX**: Inside `{showBefore && (...)}` where `showBefore = type !== 'no_change'`, TypeScript narrows the type to exclude `'no_change'`. Code inside that block can't compare against `'no_change'` without a type error — refactor to pass the boolean directly or lift the comparison outside.
- **Pre-existing lint warnings**: 15 `noNonNullAssertion` style warnings exist in `workout-templates.test.ts` and `intervals-sync-engine.test.ts` from prior work. These are not errors and don't block CI.
