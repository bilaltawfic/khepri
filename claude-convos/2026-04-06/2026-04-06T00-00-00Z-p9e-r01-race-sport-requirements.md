# P9E-R-01: Derive Required Sports + Min Sessions from Race Distance

## Goals
Implement a pure utility function that maps a race distance to the sports it requires and a recommended minimum weekly session count for each. When a block targets multiple races, merge requirements by taking the max min-sessions per sport.

## Key Decisions
- **Import path**: Used `'../types/workout.js'` for `Sport` type (plan said `season.js` but the type is actually in `workout.ts`)
- **Label format**: Used a `req()` helper to build `SportRequirement` objects with capitalized sport name and `(min N/week)` format
- **Nullish check**: Used `existing == null` (not truthy check) per codebase convention for null/undefined guards
- **Test location**: Tests placed alongside source (`.test.ts`) following existing codebase pattern, not in `__tests__/` as plan suggested

## Files Changed
- `packages/core/src/utils/race-sport-requirements.ts` — new utility with `getSportRequirements` and `mergeSportRequirements`
- `packages/core/src/utils/race-sport-requirements.test.ts` — 14 unit tests covering all race distances, merge logic, edge cases
- `packages/core/src/utils/index.ts` — added `race-sport-requirements` exports
- `packages/core/src/index.ts` — re-exported from package root

## Learnings
- Biome formatter removes trailing commas from multi-line function parameter lists in some cases; `pnpm lint:fix` handles this automatically
- Pre-existing mobile typecheck errors (`races.test.tsx`, `useTrainingPlan.ts`, `form-styles.ts`) unrelated to this PR
