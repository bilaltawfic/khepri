# Training Plan Screen Implementation

**Date:** 2026-02-15T14:00:00Z
**Task:** P6-B-06 — Build Training Plan Screen in Mobile App
**Branch:** feat/p6-b-06-training-plan-screen

## Goals

- Create a training plan tab screen displaying the athlete's active training plan
- Show plan overview, periodization phases timeline, weekly volume chart, and actions
- Add empty state for when no active plan exists

## Key Decisions

1. **Hook pattern**: Followed `useGoals.ts` pattern with `isCurrent` stale response guard, two-step fetch (athlete then plan), and `useCallback` mutations
2. **Runtime JSONB validation**: `parsePeriodization()` validates the `periodization` column at runtime before casting, following Copilot review pattern #2
3. **No chart library**: Volume chart built with `View` components and dynamic height based on `volume_multiplier`, avoiding unnecessary dependencies
4. **Current week calculation**: Simple `Date.now()` vs `start_date` approach — week-level granularity doesn't need timezone precision
5. **Tab placement**: Plan tab inserted between Coach and Profile tabs (Dashboard | Check-in | Coach | Plan | Profile)

## Files Changed

- `apps/mobile/hooks/useTrainingPlan.ts` — New data-fetching hook with pause/cancel actions
- `apps/mobile/hooks/__tests__/useTrainingPlan.test.ts` — 23 test cases covering all hook behavior
- `apps/mobile/app/(tabs)/plan.tsx` — Training plan screen with overview, phases, volume chart, actions, and empty state
- `apps/mobile/app/(tabs)/_layout.tsx` — Added Plan tab entry
- `apps/mobile/hooks/index.ts` — Exported useTrainingPlan hook

## Learnings

- Pre-existing typecheck errors in `chat.test.tsx` and `types/checkin.ts` — not introduced by this PR
- Packages must be built (`pnpm --filter @khepri/core build`) before mobile typecheck resolves cross-package types
- Biome auto-sorts imports alphabetically within groups — always run `biome check --write` after creating new files
