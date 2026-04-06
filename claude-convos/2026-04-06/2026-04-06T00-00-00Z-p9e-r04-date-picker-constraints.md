# P9E-R-04: Constrain Unavailability Date Picker to Block Dates

**Branch:** feat/p9e-r04-date-picker-constraints
**Date:** 2026-04-06

## Goals

- Add `minimumDate` and `maximumDate` constraints to the `FormDatePicker` in `block-setup.tsx` so dates outside the block range are greyed out and unselectable
- Show a help text with the block date range below the picker
- Filter any pre-existing out-of-range unavailable dates when `blockMeta` becomes available, showing a count of removed dates

## Key Decisions

1. **Used `blockMeta` from `useBlockPlanning()`** — `blockStartDate` and `blockEndDate` are on `blockMeta`, not directly on the hook return. Derived `minDate`/`maxDate` as `Date` objects only when `blockMeta != null`.

2. **`filterToBlockRange` as a pure helper** — Extracted filtering logic into a named helper function for readability and testability.

3. **`useEffect` with functional `setUnavailableDates` updater** — Uses the functional update pattern so the filter effect only depends on `blockMeta` (not `unavailableDates`), avoiding an infinite update loop. Calls `setRemovedCount` inside the updater (idempotent for a given `prev`).

4. **`removedCount` state** — Tracks how many dates were removed so a user-facing message can be shown.

5. **S7735 compliance** — Used `x == null ? default : value` form for all ternaries.

## Files Changed

- `apps/mobile/app/plan/block-setup.tsx`
  - Added `useEffect` import
  - Added `filterToBlockRange` pure helper
  - Added `removedCount` state
  - Added `useEffect` to filter dates when `blockMeta` changes
  - Derived `minDate`, `maxDate`, `blockRangeHelpText` from `blockMeta`
  - Passed `minimumDate`, `maximumDate`, `helpText` to `FormDatePicker`
  - Added removed-count notice below the picker

- `apps/mobile/app/plan/__tests__/block-setup.test.tsx`
  - Updated `FormDatePicker` mock to capture `minimumDate`, `maximumDate`, `helpText` props
  - Added 5 new tests: min/max date props, helpText content, out-of-range filtering, removed count message
  - Total: 25 tests passing

## Learnings

- `FormDatePicker` already supported `minimumDate`, `maximumDate`, and `helpText` props — no component changes needed.
- Pre-existing typecheck errors in `races.test.tsx`, `useTrainingPlan.ts`, and `form-styles.ts` are unrelated to this PR (confirmed by stash/unstash check).
