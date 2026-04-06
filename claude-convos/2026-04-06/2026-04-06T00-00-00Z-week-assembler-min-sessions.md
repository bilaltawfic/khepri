# P9E-R06+R08: Week Assembler Min Sessions & Unit Tests

**Date:** 2026-04-06  
**Branch:** feat/p9e-r06-r08-week-assembler-min-sessions  
**Plan:** plans/phase-9/subphases/p9e-r06-r08-week-assembler-min-sessions.md

## Goals

Extend `assembleWeek()` to:
1. Accept minimum session requirements per sport (`minSessionsPerSport`)
2. Add `workoutLabel` to `DayConstraint` for influencing template/focus selection
3. Surface `warnings` when constraints cannot be fully satisfied
4. Comprehensive unit tests (R-08)

## Key Decisions

- **TrainingFocus mapping**: The plan listed hypothetical focus values (`'endurance'`, `'tempo'`, `'sprint'`). Mapped to actual `TrainingFocus` values from `training.ts`: `'aerobic_endurance'`, `'threshold_work'`, `'vo2max'`, `'race_specific'`, `'recovery'`.
- **Algorithm split**: `allocateSports()` now returns `{allocation, warnings}`. `buildSportQueue()` updated to return `{queue, warnings}`. Warnings bubble up through `assembleWeek()`.
- **Minimums guaranteed before priority distribution**: Phase 1 reserves min sessions first, Phase 2 fills remaining slots by priority weight.
- **`warnings` field is optional**: Only present when warnings exist (uses spread to avoid `undefined` property when no warnings).
- **Pre-existing typecheck failures in `@khepri/mobile`**: These are unrelated to this task and were present before the branch.

## Files Changed

- `packages/core/src/utils/week-assembler.ts` — added `workoutLabel` to `DayConstraint`, `minSessionsPerSport` to `WeekAssemblyInput`, `warnings` to `WeekAssemblyResult`, `LABEL_TO_FOCUS` mapping, updated `allocateSports`/`buildSportQueue` for min-sessions algorithm
- `packages/core/src/__tests__/week-assembler.test.ts` — extended with 13 new tests across `minSessionsPerSport` and `workoutLabel` describe blocks

## Test Coverage

- 864 total tests passing (19 test suites)
- New tests cover: min sessions happy path, best-effort scarce days, warnings, empty/undefined min sessions, day constraint interaction, label-to-focus mapping for all label types, case insensitivity, unknown label fallback

## Checks

- `pnpm lint` ✅
- `pnpm test --filter @khepri/core` ✅ (864 tests)
- `pnpm typecheck --filter @khepri/core` ✅
- `pnpm build` ✅
