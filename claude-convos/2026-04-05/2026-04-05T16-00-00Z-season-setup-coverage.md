# Improve Season Setup Test Coverage

**Date:** 2026-04-05
**Branch:** fix/p7.5-test-season

## Goals
- Raise coverage on new code from 69.6% to >= 80% to pass SonarCloud quality gate
- Add comprehensive tests for all season setup screens and context

## Key Decisions
- Test `inferDistance()` via the import flow (17 pattern test cases) rather than exporting it
- Use `mockResolvedValueOnce` for calendar mock since import uses chunked 90-day requests
- Skip supabase-null / user-null edge cases in overview (hard to test with module-level mocks, diminishing returns at 88% coverage)
- Did not modify source code -- only test files

## Files Changed
- `apps/mobile/app/season/__tests__/races.test.tsx` -- Added 27 new tests covering inferDistance patterns, import flow (success, no-races, error, merge), date validation, form interactions
- `apps/mobile/app/season/__tests__/preferences.test.tsx` -- Added 10 new tests covering getHoursWarning branches (empty, NaN, min>max, race-based warnings), sport reorder edge cases
- `apps/mobile/app/season/__tests__/overview.test.tsx` -- Added 5 new tests covering approve error paths (athlete lookup, createSeason, non-Error throw, navigation)
- `apps/mobile/__tests__/contexts/SeasonSetupContext.test.tsx` -- Added 14 new tests covering setGoals, persistence errors, migration of all legacy distances, additional isValidData rejection paths

## Coverage Results (Before -> After)
| File | Stmts | Lines |
|------|-------|-------|
| races.tsx | 49.56% -> 93.04% | 54.9% -> 95.09% |
| preferences.tsx | 90.27% -> 100% | 98.46% -> 100% |
| overview.tsx | 82.43% -> 87.83% | 82.85% -> 88.57% |
| SeasonSetupContext.tsx | 93.22% -> 97.45% | 94.94% -> 96.96% |
| goals.tsx | 94.59% (unchanged) | 100% (unchanged) |
| **Overall** | **78.84% -> 94.71%** | **82.7% -> 95.67%** |

## Learnings
- Calendar import uses chunked 90-day requests, so mock must use `mockResolvedValueOnce` for the first chunk then `mockResolvedValue([])` for remaining chunks to avoid duplicate race accumulation
- React Native splits interpolated text into separate JSON children nodes, making substring assertions on counts unreliable; use semantic checks instead (e.g., count remove buttons)
