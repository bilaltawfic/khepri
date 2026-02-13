# P4-B-01: Training Load Validation Implementation

**Date:** 2026-02-13
**Task:** Implement training load validation in `@khepri/ai-client`
**PR:** #70

## Goals

Enhance safety tools with comprehensive training load validation that flags overtraining risks before they happen, analyzing proposed workout load vs. current fatigue state, historical training load trends, and recovery signals.

## Key Decisions

1. **Added types to existing types.ts** rather than creating a separate types file - follows the established pattern in the codebase
2. **Used relative date calculation** in tests (via `daysAgo()` helper) to avoid time-sensitive test failures across UTC midnight
3. **Reused existing `FitnessMetrics` and `WellnessData` types** in the new `TrainingHistory` interface rather than duplicating
4. **Named internal functions distinctly** (`checkLoadWarnings`, `determineOvertrainingRisk`, `generateLoadRecommendations`) to avoid conflicts with existing safety-tools functions
5. **Used `ReadonlyArray` for `TrainingHistory.activities`** to signal immutability
6. **Used optional chaining (`?.`) instead of non-null assertions (`!`)** in tests to satisfy Biome linter

## Implementation Details

### Validation Checks
- **TSB Overreaching**: Danger at < -40, warning at < -30
- **Ramp Rate**: Danger at > 10 TSS/week, warning at > 8
- **Monotony**: Warning when mean/stdDev > 2.0 (all same intensity)
- **Strain**: Danger at > 2000 (monotony * weeklyTSS), warning at > 1500
- **Consecutive Hard Days**: Warning at >= 2

### Risk Levels
- `low`: No warnings
- `moderate`: 1-2 warnings
- `high`: 3+ warnings
- `critical`: Any danger-severity warning (isValid = false)

## Files Changed

- `packages/ai-client/src/types.ts` - Added 6 new types (OvertrainingRisk, TrainingLoadValidation, LoadMetrics, LoadWarning, ProposedWorkout, TrainingHistory)
- `packages/ai-client/src/tools/safety-tools.ts` - Added VALIDATE_TRAINING_LOAD_TOOL definition, validateTrainingLoad function, and supporting helpers
- `packages/ai-client/src/tools/index.ts` - Export new tool and function
- `packages/ai-client/src/index.ts` - Export new types and function from package
- `packages/ai-client/src/__tests__/safety-tools.test.ts` - 20+ comprehensive tests

## Learnings

- The existing safety-tools.ts uses a clean pattern of separating Tool definitions (for Claude) from implementation functions (for direct use). Followed this pattern.
- TSS estimation scaled by duration (base per 60 min) is a practical approximation when actual TSS isn't available.
- Monotony formula (mean/stdDev) naturally returns high values when all training is identical, which correctly flags lack of variability.
