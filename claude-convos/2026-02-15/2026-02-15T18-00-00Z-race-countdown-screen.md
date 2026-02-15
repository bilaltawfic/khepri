# Race Countdown Screen Implementation

**Date:** 2026-02-15
**Task:** P7-B-02 - Build Race Countdown Screen
**Branch:** feat/p7-b-02-race-countdown-screen

## Goals

- Create a race countdown screen showing upcoming race goals with readiness predictions
- Implement `useRaceCountdown` hook to fetch race goals and compute readiness
- Add analysis stack layout for future analysis screens
- Add wellness data fetching function to intervals service

## Key Decisions

1. **Data flow:** Hook fetches athlete -> race goals -> wellness data (42 days), then computes readiness per race using `calculateRaceReadiness()` from `@khepri/core`
2. **Wellness fallback:** If wellness data is unavailable (Intervals.icu not connected), readiness is null and a "Connect" message shows
3. **Added `getWellnessData()` to intervals service:** Existing functions only returned summaries or single-day data; needed an array of data points for readiness calculation
4. **Screen pattern:** Follows calendar screen pattern with ScreenContainer, ScrollView, pull-to-refresh, and shared loading/error/empty components

## Files Changed

- `apps/mobile/app/analysis/_layout.tsx` (new) - Analysis stack layout
- `apps/mobile/app/analysis/race-countdown.tsx` (new) - Race countdown screen
- `apps/mobile/app/analysis/__tests__/race-countdown.test.tsx` (new) - Screen tests (15 tests)
- `apps/mobile/hooks/useRaceCountdown.ts` (new) - Race countdown hook
- `apps/mobile/hooks/__tests__/useRaceCountdown.test.ts` (new) - Hook tests (15 tests)
- `apps/mobile/hooks/index.ts` (modified) - Export new hook and types
- `apps/mobile/services/intervals.ts` (modified) - Added `getWellnessData()` function

## Learnings

- `jest.requireActual()` cannot be stored in an out-of-scope variable for `jest.mock()` factory; if mocking isn't needed, just don't mock the module
- `refresh()` calls in hook tests must be wrapped in `act()` to properly batch state updates
- Biome enforces single-line function parameters when they fit on one line
