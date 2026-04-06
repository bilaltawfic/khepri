# Block Planning Rethink — Subphase Plan

**Date:** 2026-04-06  
**Branch:** feat/shared-date-picker  
**Files changed:** `plans/phase-9/subphases/p9e-block-planning-rethink.md`, `docs/testing/manual-test-cases.csv`

## Goals

Write a temp phase 9 subphase plan (P9E-R) for rethinking block planning to cover:
1. Race-derived required sports and minimum weekly session counts
2. Per-day workout preferences (e.g. long ride on Friday, swim on Mon/Wed)
3. Block date range display in setup header
4. Unavailability selection constrained to block dates
5. All of the above fed into workout generation

Update manual-test-cases.csv to reflect these changes.

## Key Decisions

- **`getSportRequirements(raceDistance)`** — new pure utility in `packages/core/src/utils/race-sport-requirements.ts` that maps race distances to required sports + min weekly sessions. Merges across multiple races by taking the max per sport.
- **Per-day preferences** use the existing (but unused) `DayConstraint` type from `SeasonSetupContext`, extended with a `workoutLabel` field (e.g. "Long Ride").
- **`useBlockPlanning` hook** needs to eagerly compute block dates (already done internally) and expose `blockName`, `blockStartDate`, `blockEndDate`, `blockTotalWeeks` so the UI can show them and pass them to `FormDatePicker`.
- **`assembleWeek()`** in `week-assembler.ts` gets a new `minSessionsPerSport?: ReadonlyMap<Sport, number>` input — guarantees minimums first, then distributes remaining sessions by priority weight.
- **`generate-block-workouts`** edge function gets optional `sport_requirements` and `day_preferences` fields (backward compatible).

## Merges from Main During Session

- **PR #153**: `FormDatePicker` component (single + range, minimumDate/maximumDate)
- **PR #154**: Focus areas removed from block setup
- **PR #155**: FormDatePicker range mode + reason field for unavailable dates; `UnavailableDate` type; `expandDateRange`/`groupUnavailableDates` utilities; inline hours validation. **Did not** add minimumDate/maximumDate block constraints — P9E-R-04 marked 🔶 partial.

## Files Changed

- `plans/phase-9/subphases/p9e-block-planning-rethink.md` — new subphase plan with 8 tasks (P9E-R-01 through P9E-R-08), implementation order, and verification checklist
- `docs/testing/manual-test-cases.csv` — BLOCK-01 through BLOCK-07 updated for current UI; BLOCK-08 through BLOCK-16 added for new features

## Learnings

- `useBlockPlanning` already computes block start/end dates during `generateWorkouts()` via `collectBlockPhases()` — just needs to do it eagerly on load and expose to UI
- `FormDatePicker` range mode is already in place (PR #155); only the `minimumDate`/`maximumDate` wiring is missing for P9E-R-04
- `DayConstraint` type in `SeasonSetupContext` exists but is never wired into the block setup UI — good foundation for day preferences
