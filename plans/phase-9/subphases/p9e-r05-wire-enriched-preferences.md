# P9E-R-05: Wire Enriched Preferences into Generate Block Workouts

> Extracted from [p9e-block-planning-rethink.md](./p9e-block-planning-rethink.md) §P9E-R-05.

**Depends on:**
- P9E-R-01 (`SportRequirement` + `getRequirementsForRace`) ✅ merged in #159
- P9E-R-02 (per-day workout preferences UI + context state) ✅ merged in #163
- #164 (race discipline restructure — `getRequirementsForRace` + `RACE_CATALOG`) ✅ merged

## Goal

Pass the sport requirements (derived from the season's races) and the per-day workout preferences collected in block setup into the `generate-block-workouts` edge function, so a follow-up P9E-R-06 change to the week assembler can enforce min sessions per sport and honor day preferences.

## Files to Modify

- `apps/mobile/hooks/useBlockPlanning.ts` — extend `BlockSetupData`, compute sport requirements from `season.races`, collect day preferences, include both in the `functions.invoke('generate-block-workouts', …)` body.
- `supabase/functions/generate-block-workouts/index.ts` — extend `GenerateRequest` with optional `sport_requirements` and `day_preferences`, thread them to the workout assembly path. Both fields optional for backward compat.
- `packages/core/src/types/` — ensure `SportRequirement` and a `DayPreference` type are exported for shared use between mobile and edge.
- Tests: unit tests for the new request shape on the edge function side (mocked), and for the `useBlockPlanning` hook's request payload.

## Implementation Steps

1. **Core types**: export `DayPreference { dayOfWeek: DayOfWeek; sport: Sport; workoutLabel?: string }` from `packages/core/src/types/block.ts` (or alongside `UnavailableDate`). Re-export from `packages/core/src/index.ts`.
2. **Hook — compute sport requirements**: In `useBlockPlanning.ts`, when building the request, iterate `season.races` and call `getRequirementsForRace(race.discipline, race.distance)` — merge results by sport taking the max `minWeeklySessions` (reuse or extract a small helper if not already available).
3. **Hook — pass day preferences**: Read day preferences from the block setup context (added in #163) and include in the request.
4. **Hook — extend request body**: Add `sport_requirements` and `day_preferences` to the invoke body. Keep field names snake_case to match edge function conventions.
5. **Edge function — accept new fields**: Add optional `sport_requirements?: SportRequirement[]` and `day_preferences?: DayPreference[]` to `GenerateRequest`. Validate shape (array of objects with expected keys) at the boundary.
6. **Edge function — thread to assembler**: Forward these into the week assembly call site. P9E-R-06 will actually consume `minSessionsPerSport` in `assembleWeek()`; this task just wires the plumbing so R-06 can land independently.
7. **Backward compat**: If either field is missing, behavior is identical to today. Add an explicit comment noting this.

## Testing Requirements

- Unit test in `apps/mobile/hooks/__tests__/useBlockPlanning.test.ts` (or extend existing): given a season with a 70.3 race and user-added day preferences, the invoke body contains `sport_requirements` with swim/bike/run and `day_preferences` echoing the UI state.
- Unit test in `supabase/functions/generate-block-workouts/__tests__/` (or extend existing): request parsing accepts the new optional fields and rejects malformed ones.
- No regression: omitting the new fields still works.

## Verification

- `pnpm typecheck`, `pnpm test`, `pnpm lint` all green.
- Manual: run through block setup with a 70.3 race and a "Long Ride Friday" day preference — confirm via network payload (or edge function logs) that the new fields arrive.

## Out of Scope

- Actually consuming `minSessionsPerSport` inside `assembleWeek()` — that is P9E-R-06.
- Updating manual test cases — that is P9E-R-07.
