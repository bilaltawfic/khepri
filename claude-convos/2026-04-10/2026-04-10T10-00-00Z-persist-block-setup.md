# P9E-R-10: Persist Block Setup Across Errors and App Restarts

## Goals
- Persist BlockSetupData to AsyncStorage so users don't lose form values on errors/restarts
- Restore draft on mount, clear on successful lock-in, leave intact on generation failure
- Show a dismissible "Picking up where you left off" banner with a "Start over" button

## Key Decisions
- Used versioned schema (`{ version: 1, data: BlockSetupData }`) for forward compatibility
- Type guard validates shape on load — silently discards corrupt/outdated drafts
- Debounced save (300ms) to avoid hammering AsyncStorage on every keystroke
- Namespaced by seasonId to prevent cross-season pollution
- "Block wins" rule: if an existing block is found, the draft is cleared
- Added `unflattenDayPreferences` helper to convert core DayPreference[] back to UI format

## Files Changed
- `apps/mobile/utils/block-setup-storage.ts` (new) — load/save/clear with validation
- `apps/mobile/utils/__tests__/block-setup-storage.test.ts` (new) — 11 tests
- `apps/mobile/hooks/useBlockPlanning.ts` — added draft lifecycle (load/save/clear)
- `apps/mobile/hooks/__tests__/useBlockPlanning.test.ts` — 7 new draft persistence tests
- `apps/mobile/app/plan/block-setup.tsx` — hydration from draft, save on change, banner UI
- `apps/mobile/utils/plan-helpers.ts` — added `unflattenDayPreferences`

## Learnings
- `jest.useFakeTimers()` in global beforeEach breaks `waitFor` — use only in specific tests
- UI DayPreference has an `id` field for React keys; core DayPreference doesn't — need conversion
