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

## Round 2: Behavioral Test Improvements
After coverage hit 80%, focused on ensuring tests verify real functionality (not just line coverage):

7. **GoalsScreen filtering tests**: Active/completed goal separation, empty state with completed goals, ACTIVE GOALS section hidden when no active goals
8. **GoalsScreen navigation tests**: Add-goal cards navigate to `/profile/goal-form?type={type}`, goal card press navigates to `/profile/goal-form?id={id}`
9. **useGoals priority sorting tests**: C-priority goal sorted after A,B; null priority sorted last (treated as 'Z')
10. **Supabase query filter verification**: Enhanced existing tests to assert `.eq()`, `.order()`, `.gte()` filter parameters; verified `completeGoal`/`cancelGoal` delegate with correct status
11. **Personal-info metric passthrough test**: Verified metric values pass through to storage unchanged
12. **Fixed GoalsScreen test mock format**: Changed from `Goal[]` (camelCase) to `GoalRow[]` (snake_case) to match component's `mapGoalRowToGoal` pipeline

## Test Count Improvements
- goals.test.tsx: 33 → 59 tests
- useGoals.test.ts: 24 → 36 tests
- personal-info.test.tsx: 38 → 50 tests
- chat.test.tsx: 22 → 23 tests
- supabase-client goals.test.ts: 14 → 22 tests
- **Total across all suites: 876 tests passing**
