# Race Discipline Model Restructure

**Date:** 2026-04-06
**Branch:** feat/race-discipline-model

## Goals
- Model races with explicit discipline (triathlon, running, cycling, etc.) instead of flat distance strings
- Create a single source of truth (`RACE_CATALOG`) replacing 3 separate lookup maps
- Two-step race selection UI: pick discipline first, then distance
- Support multi-sport disciplines: duathlon (bike+run), aquathlon (swim+run)
- Add cycling and swimming race distances

## Key Decisions
- Created `RACE_CATALOG` as a typed constant array with all discipline+distance combinations
- Each entry includes: discipline, distance, label, training sport requirements, and min weekly hours
- Kept `getSportRequirements(legacyDistance)` for backward compat via `LEGACY_DISTANCE_TO_CATALOG` map
- Added `getRequirementsForRace(discipline, distance)` as preferred new API
- Removed all legacy migration code since DB will be wiped (no existing users)
- Added `race_discipline` column to goals table via migration

## Files Changed

### New Files
- `packages/core/src/types/race.ts` — RACE_CATALOG domain object, RaceDiscipline type, catalog helpers
- `supabase/migrations/014_race_discipline.sql` — ALTER TABLE goals ADD COLUMN race_discipline

### Core Package
- `packages/core/src/types/index.ts` — export race catalog types
- `packages/core/src/index.ts` — export race catalog + new util functions
- `packages/core/src/utils/index.ts` — export new util functions
- `packages/core/src/utils/race-sport-requirements.ts` — rewritten to delegate to RACE_CATALOG
- `packages/core/src/utils/race-sport-requirements.test.ts` — added tests for new APIs

### Supabase Client
- `packages/supabase-client/src/types.ts` — added race_discipline to GoalRow
- `packages/supabase-client/src/__tests__/queries/goals.test.ts` — updated fixtures
- `packages/supabase-client/src/__tests__/integration/goals.integration.test.ts` — updated fixtures

### Mobile App
- `apps/mobile/contexts/SeasonSetupContext.tsx` — SeasonRace now has discipline; getMinHoursForRaces uses catalog
- `apps/mobile/contexts/index.ts` — removed RACE_DISTANCES, MIN_HOURS_BY_RACE exports
- `apps/mobile/app/season/races.tsx` — rewritten with DisciplineSelector + DistanceSelector
- `apps/mobile/app/season/preferences.tsx` — updated getHoursWarning type
- `apps/mobile/app/plan/block-setup.tsx` — use getRequirementsForRace instead of getSportRequirements
- `apps/mobile/app/analysis/race-countdown.tsx` — display discipline alongside distance
- `apps/mobile/app/profile/goals.tsx` — added raceDiscipline to Goal type, updated subtitle display
- `apps/mobile/hooks/useBlockPlanning.ts` — added discipline to SeasonRaceInfo, map race_discipline

### Edge Functions
- `supabase/functions/ai-orchestrator/types.ts` — added race_discipline to Goal interface
- `supabase/functions/ai-orchestrator/context-builder.ts` — query and map race_discipline
- `supabase/functions/generate-season-skeleton/index.ts` — include discipline in prompt

### Tests Updated
- `apps/mobile/app/season/__tests__/races.test.tsx` — fully rewritten for new two-step UI
- `apps/mobile/app/season/__tests__/preferences.test.tsx` — updated fixtures
- `apps/mobile/app/plan/__tests__/day-preferences.test.tsx` — updated seasonRaces fixtures
- `apps/mobile/app/profile/__tests__/goals.test.tsx` — added raceDiscipline assertions
- `apps/mobile/app/analysis/__tests__/race-countdown.test.tsx` — added race_discipline to fixtures
- `apps/mobile/hooks/__tests__/useGoals.test.ts` — added race_discipline to fixtures
- `apps/mobile/__tests__/contexts/SeasonSetupContext.test.tsx` — removed legacy migration tests, updated fixtures

## Learnings
- A single source of truth (RACE_CATALOG) eliminates drift between sport requirements, min hours, and distance lists
- Multi-sport disciplines (duathlon, aquathlon) have standard distances from international federations (ITU/World Triathlon)
- Legacy backward compat via a mapping table keeps existing code working during migration
