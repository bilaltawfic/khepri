# Fix Lint Warnings

**Date:** 2026-04-04
**Goal:** Fix 17 Biome lint warnings on main

## Key Decisions

- Replaced `any` types in races test mock with proper typed props
- Replaced non-null assertions (`!.`) with optional chaining (`?.`) in test assertions
- Used type-narrowing guards (`if (!x) return`) instead of `!` for variables passed to functions

## Files Changed

- `apps/mobile/app/season/__tests__/races.test.tsx` — replaced 2 `any` types with proper types
- `packages/core/src/__tests__/workout-templates.test.ts` — replaced 9 non-null assertions
- `supabase/functions/_shared/__tests__/intervals-sync-engine.test.ts` — replaced 6 non-null assertions

## Learnings

- Biome's `noNonNullAssertion` applies even after `expect().not.toBeNull()` — need explicit type narrowing for TS
