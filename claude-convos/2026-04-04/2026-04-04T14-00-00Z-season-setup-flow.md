# P9-C: Season Setup Flow

**Date:** 2026-04-04
**Branch:** feat/p9-c-season-setup-flow

## Goals
Build the guided multi-step season setup flow (P9-C) with 4 screens: race calendar, goals, preferences, and AI-generated season overview.

## Key Decisions
- **Context pattern:** Followed existing `OnboardingContext` pattern with `SeasonSetupContext` for multi-step state management
- **Shared styles:** Created `season/shared-styles.ts` to avoid duplication across screens (SonarCloud S3863)
- **Edge function:** Used Claude API with tool_use for structured JSON output (season skeleton)
- **Validation:** `getMinHoursForRaces()` utility for coach warnings about weekly hours vs race requirements
- **Error handling:** Guarded `supabase` undefined case since it may not be configured in dev environments

## Files Changed
- `apps/mobile/contexts/SeasonSetupContext.tsx` — New context with races, goals, preferences, skeleton state
- `apps/mobile/contexts/index.ts` — Added SeasonSetup exports
- `apps/mobile/app/_layout.tsx` — Added season route to root Stack
- `apps/mobile/app/season/_layout.tsx` — Stack navigator wrapping SeasonSetupProvider
- `apps/mobile/app/season/shared-styles.ts` — Shared form styles
- `apps/mobile/app/season/races.tsx` — Step 1: Race calendar with add/remove/import
- `apps/mobile/app/season/goals.tsx` — Step 2: Performance/fitness/health goals
- `apps/mobile/app/season/preferences.tsx` — Step 3: Hours, days, sport priority
- `apps/mobile/app/season/overview.tsx` — Step 4: AI skeleton review & approve
- `supabase/functions/generate-season-skeleton/index.ts` — Edge function for AI skeleton generation
- `apps/mobile/__tests__/contexts/SeasonSetupContext.test.tsx` — 23 unit tests

## Learnings
- `ErrorState` component uses `action` prop (not `onRetry`) for retry buttons
- `supabase` client export can be `undefined` when env vars aren't set — must guard
- Biome enforces template literals over string concatenation and consolidated imports
- Pre-existing typecheck errors in `useTrainingPlan.ts` and `onboarding.ts` (PeriodizationPlan vs Json type)
