# SonarCloud Coverage Quality Gate Fix

## Context
PR #45 (feat(mobile): add useGoals hook and wire goals screen to Supabase) had a failing SonarCloud quality gate:
- **58.2% coverage on new code** (required >= 80%)

## Changes Made
1. **Exported testable functions from goals.tsx**: `mapGoalRowToGoal`, `parseDateOnly`, `isValidGoalType`, `isValidGoalStatus`, `isValidGoalPriority`
2. **Added tests for goals.tsx functions**: Validators, date parsing, goal row mapping (valid/invalid/null fields)
3. **Added `getAllGoals` tests** to supabase-client goals query tests, plus error path tests
4. **Added useGoals edge case tests**: No-user path, non-Error exception handling, refetch failures
5. **Added personal-info imperial conversion tests**: kg↔lbs, cm↔inches display and storage
6. **Added chat interaction tests**: Send failure input restoration, retry button press

## Test Count Improvements
- goals.test.tsx: 33 → 54 tests
- useGoals.test.ts: 24 → 34 tests
- personal-info.test.tsx: 38 → 49 tests
- chat.test.tsx: 22 → 23 tests
- supabase-client goals.test.ts: 14 → 22 tests
