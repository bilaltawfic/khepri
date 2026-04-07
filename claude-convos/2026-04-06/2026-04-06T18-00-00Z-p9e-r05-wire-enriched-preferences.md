# P9E-R-05: Wire Enriched Preferences into generate-block-workouts

## Goals

Plumb per-day workout preferences (from block setup UI) and sport requirements
(derived from the season's races) through `useBlockPlanning` into the
`generate-block-workouts` edge function, so a follow-up task (P9E-R-06) can
enforce min sessions per sport and honor day preferences inside the week
assembler.

## Key Decisions

- **New core types**: exported `DayPreference` from `@khepri/core` alongside
  `UnavailableDate`. Uses JavaScript `Date.getDay()` convention
  (0=Sun … 6=Sat) so it lines up with `availableDays` on season preferences
  and the edge function's `dayDate.getDay()`.
- **UI → core conversion**: `DayPreferenceRow` in the mobile app uses a
  Mon-first index (0=Mon … 6=Sun). `block-setup.tsx` converts this to the core
  convention via `(dayIndex + 1) % 7` when building the request.
- **Backward compat**: both `sport_requirements` and `day_preferences` are
  optional on the edge function request. When absent or empty, behavior is
  identical to today. The hook always passes them (empty arrays) so the shape
  is consistent.
- **Validator extraction**: pulled `validateRequest` out of
  `generate-block-workouts/index.ts` into `validation.ts` so it can be
  unit-tested without importing Deno's `serve` runtime. Split into small
  helpers (`validateCoreFields`, `validateUnavailableDates`,
  `validateSportRequirements`, `validateDayPreferences`) to keep cognitive
  complexity low (SonarCloud S3776).
- **P9E-R-06 is a follow-up**: this PR only wires the plumbing. The edge
  function accepts the fields but does not yet feed them into the week
  assembler — that will be the next task.

## Files Changed

- `packages/core/src/types/block.ts` — added `DayPreference` type.
- `packages/core/src/types/index.ts` + `packages/core/src/index.ts` — re-export.
- `apps/mobile/hooks/useBlockPlanning.ts` — extended `BlockSetupData` with
  optional `dayPreferences`, derived `sport_requirements` from `seasonRaces`
  via `getRequirementsForRace` + `mergeSportRequirements`, and threaded both
  into the `functions.invoke` body.
- `apps/mobile/app/plan/block-setup.tsx` — flattened per-day chip state into
  `CoreDayPreference[]` (with Mon-first → Sun-first conversion) and passed it
  into `generateWorkouts`.
- `supabase/functions/generate-block-workouts/index.ts` — extended
  `GenerateRequest`, moved validation into `validation.ts`.
- `supabase/functions/generate-block-workouts/validation.ts` — new file with
  extracted validators for the new optional fields.
- `supabase/functions/generate-block-workouts/__tests__/validation.test.ts` —
  new test suite covering the new fields (happy path + malformed inputs).
- `apps/mobile/hooks/__tests__/useBlockPlanning.test.ts` — two new tests:
  one asserting the invoke body includes `sport_requirements` (derived from
  a 70.3 race) and `day_preferences` (echoing the UI state); another
  asserting default empty arrays when no preferences / no races are provided
  (backward-compat shape).

## Learnings

- Edge functions that inline `serve()` at module scope can't be imported from
  Jest. Extracting pure logic into a sibling file (`validation.ts`) is a
  low-risk way to make it testable — and the pattern matches
  `suggest-adaptation/helpers.ts` already in the repo.
- The DayPreferenceRow UI convention (Mon=0) differs from JS `getDay()`
  (Sun=0). Calling this out explicitly with a comment at the conversion site
  prevents future off-by-one regressions.
