# P4-B-03: Workout Modification Safety Checks

**Date:** 2026-02-14
**Branch:** feat/p4-b-03-workout-modification-safety

## Goals

Implement a `validateWorkoutModification()` safety function and corresponding Claude tool definition that checks whether proposed changes to an existing workout are safe, considering the athlete's fatigue state, injuries, and training load.

## Key Decisions

1. **Reused existing types**: Used the existing `ProposedWorkout` (camelCase) and `WorkoutIntensity` types from `types.ts` rather than creating new snake_case versions. The tool input schema uses snake_case (Claude API convention), but the implementation function uses existing TypeScript types.

2. **Added `tempo` to WORKOUT_INTENSITIES**: The plan omitted `tempo` from the intensity scale, but the existing `WorkoutIntensity` type includes it. Added it to `WORKOUT_INTENSITIES` and `INTENSITY_ORDER` for consistency.

3. **Modular check functions**: Split the validation into separate functions (`checkIntensityJump`, `checkTssIncrease`, `checkDurationIncrease`, `checkReadinessInteraction`, `checkFatigueInteraction`, `checkConstraintViolations`, `checkConsecutiveHardDaysForModification`) for better testability and readability.

4. **ReadinessAssessment field name**: The plan referenced `.status` but the existing type uses `.readiness` - corrected to use the actual field name.

5. **Division by zero guards**: Added explicit `> 0` guards for original TSS and duration to prevent NaN results.

6. **Constraint checks only on sport change**: Constraint violations are only checked when the sport changes between original and modified workout, matching the plan's intent.

## Files Changed

| File | Changes |
|------|---------|
| `packages/ai-client/src/types.ts` | Added `WORKOUT_INTENSITIES`, `isWorkoutIntensity`, `INTENSITY_ORDER`, `ModificationReason`, `ModificationWarningType`, `ModificationWarning`, `WorkoutModificationValidation` |
| `packages/ai-client/src/tools/safety-tools.ts` | Added `VALIDATE_WORKOUT_MODIFICATION_TOOL`, `validateWorkoutModification()`, helper functions, `ModificationContext` interface |
| `packages/ai-client/src/tools/index.ts` | Exported new tool, function, and type |
| `packages/ai-client/src/__tests__/safety-tools.test.ts` | Added ~40 tests covering intensity jumps, TSS/duration increases, readiness/fatigue interactions, constraint violations, consecutive hard days, risk determination, safe alternatives, and edge cases |

## Learnings

- TypeScript's array indexing returns `T | undefined` even when the index is provably in-bounds. Adding `?? fallback` is cleaner than type assertions.
- Biome's formatter has specific line-length preferences for ternary expressions and multiline conditions - running `biome check --write` upfront saves time.
