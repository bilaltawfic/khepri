# Remove Focus Areas from Block Setup

**Date:** 2026-04-06
**Branch:** refactor/remove-focus-areas

## Goals

Remove the static focus areas section from the block setup screen. The hardcoded options (threshold work, swim technique, etc.) added UI complexity without clear value -- the AI can infer training focus from the athlete's season plan, race distances, and periodization phase.

## Key Decisions

- Remove `FOCUS_OPTIONS` constant and all focus area UI from `block-setup.tsx`
- Remove `focusAreas` from `BlockSetupData` interface in the hook
- Remove `focus_areas` from edge function request type and validation
- Update all tests to remove focus area assertions and test data
- Simplify the description text to reflect the reduced form

## Files Changed

| File | Change |
|------|--------|
| `apps/mobile/app/plan/block-setup.tsx` | Removed FOCUS_OPTIONS, selectedFocus state, toggleFocus callback, focus area UI section |
| `apps/mobile/app/plan/__tests__/block-setup.test.tsx` | Removed focus area rendering and interaction tests |
| `apps/mobile/hooks/useBlockPlanning.ts` | Removed focusAreas from BlockSetupData, removed focus_areas from edge function call |
| `apps/mobile/hooks/__tests__/useBlockPlanning.test.ts` | Removed focusAreas from test setup data |
| `supabase/functions/generate-block-workouts/index.ts` | Removed focus_areas from GenerateRequest type, validation, and TODO comment |

## Learnings

- Static focus area options that the AI could infer from context add unnecessary UI friction
- Keeping the block setup form focused on what the user uniquely knows (hours, unavailable dates) makes it simpler and more valuable
