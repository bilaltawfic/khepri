# P9E-R-02: Per-Day Workout Preferences UI

**Date:** 2026-04-06  
**Branch:** feat/p9e-r02-day-workout-preferences  
**Task:** Add "Your weekly rhythm" section to block setup for per-day workout preferences

## Goals

- Extend `DayConstraint` type with optional `workoutLabel`
- Expose `seasonRaces` from `useBlockPlanning` hook for sport requirements derivation
- Create `DayPreferenceRow` component (day + sport chips + add/remove)
- Create `AddPreferenceSheet` component (bottom sheet to pick sport + workout label)
- Add "Your weekly rhythm" section to `block-setup.tsx` with info card, day grid, and warnings
- Write comprehensive tests for the new UI

## Key Decisions

1. **SeasonRaces from goals table**: `seasonRaces` in `useBlockPlanning` fetches upcoming race goals (`getUpcomingRaceGoals`) and maps `race_distance` to `SeasonRaceInfo.distance`. Races are stored as goals in the DB, not in the season row itself.

2. **DayPreference.id for stable React keys**: Added a stable `id` field to `DayPreference` (generated as `${sport}-${label}-${Date.now()}`) to satisfy Biome's `noArrayIndexKey` rule and for proper React reconciliation.

3. **Built-in Modal for AddPreferenceSheet**: Used React Native's built-in `Modal` (not `react-native-modal` which isn't installed) matching the pattern in `FormDatePicker`.

4. **SportReq local type**: Added a local `type SportReq = { sport: string; minWeeklySessions: number; label: string }` in block-setup.tsx to avoid implicit `any` type errors caused by the pre-existing `@khepri/core` module resolution issue in the typecheck environment.

5. **Warning uses session count vs minimum**: Warnings check `dayPreferences.reduce(count by sport) < req.minWeeklySessions` and are shown once per under-minimum sport. Keys use the warning string directly (naturally unique per sport).

## Files Changed

- **Modified:** `apps/mobile/contexts/SeasonSetupContext.tsx` — added `workoutLabel?` to `DayConstraint`
- **Modified:** `apps/mobile/hooks/useBlockPlanning.ts` — added `SeasonRaceInfo`, `seasonRaces` state, `getUpcomingRaceGoals` fetch in refresh
- **Modified:** `apps/mobile/app/plan/block-setup.tsx` — added weekly rhythm section with info card, day grid, warnings, handlers
- **Created:** `apps/mobile/components/DayPreferenceRow.tsx` — single row with sport chips and add/remove
- **Created:** `apps/mobile/components/AddPreferenceSheet.tsx` — modal sheet for picking sport + workout label
- **Created:** `apps/mobile/app/plan/__tests__/day-preferences.test.tsx` — 13 tests covering all UI flows
- **Modified:** `apps/mobile/app/plan/__tests__/block-setup.test.tsx` — added `seasonRaces: []` to mock defaults
- **Modified:** `apps/mobile/hooks/__tests__/useBlockPlanning.test.ts` — added `getUpcomingRaceGoals` mock

## Learnings

- Biome's `noArrayIndexKey` rule requires stable non-index keys; adding an `id` field to preference objects is cleaner than workarounds
- `jest-expo/web` preset maps `accessibilityLabel` to `aria-label`; use `getByLabelText()` not `el.props.accessibilityLabel` filtering
- Pre-existing `@khepri/core` typecheck errors occur because the package isn't built locally; they disappear after `pnpm build`
