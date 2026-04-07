# Remove Legacy getSportRequirements

## Goals

After PR #164 migrated all production callsites to `getRequirementsForRace(discipline, distance)`, the legacy `getSportRequirements(distance)` shim and its `LEGACY_DISTANCE_TO_CATALOG` map are no longer used by any app or edge function code. Remove them.

## Key Decisions

- Verified via grep that the only remaining references to `getSportRequirements` were the impl file itself, its tests, and two barrel exports — no app/edge consumers.
- Kept `getRequirementsForRace`, `mergeSportRequirements`, `getMinWeeklyHours`, `getMinHoursForRaceList`, and `SportRequirement`.
- Rewrote the test file to exercise `getRequirementsForRace` directly with `(discipline, distance)` pairs.

## Files Changed

- `packages/core/src/utils/race-sport-requirements.ts` — removed `getSportRequirements` and `LEGACY_DISTANCE_TO_CATALOG`; updated module docstring.
- `packages/core/src/utils/race-sport-requirements.test.ts` — replaced `getSportRequirements` cases with `getRequirementsForRace` cases.
- `packages/core/src/utils/index.ts`, `packages/core/src/index.ts` — dropped legacy export.

## Verification

- `pnpm --filter @khepri/core typecheck` ✅
- `pnpm --filter @khepri/core test` ✅ (868 tests pass)
- Pre-existing mobile typecheck/lint errors confirmed unrelated by stashing changes and re-running.
