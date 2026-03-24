# Fix Intervals.icu Connection Status on Profile Page

**Date:** 2026-03-23
**Branch:** fix/p7.5-dash-intervals-status

## Goals

Fix the profile page so that Intervals.icu connection status accurately reflects real credentials instead of using hardcoded mock data, and add navigation to the intervals settings screen.

## Key Decisions

1. **Used existing `useIntervalsConnection` hook** — The hook was already implemented and working in the intervals settings screen. Reused it in the profile page for consistency.
2. **Extracted `getIntervalsSubtitle` helper** — Clean function to derive subtitle text from connection state and loading status.
3. **Removed `intervalsIcuConnected` from mock data** — No longer needed since connection status comes from the hook.
4. **Added `href="/profile/intervals"`** — Enables navigation from profile to intervals settings screen.

## Files Changed

| File | Change |
|------|--------|
| `apps/mobile/app/(tabs)/profile.tsx` | Import and use `useIntervalsConnection` hook; add `getIntervalsSubtitle` helper; add `href` to Intervals.icu MenuItem; remove unused `intervalsIcuConnected` from mock |
| `apps/mobile/app/(tabs)/__tests__/profile.test.tsx` | Mock `useIntervalsConnection` hook; add tests for connected, not connected, and loading states; add accessibility label tests |

## Learnings

- The `useIntervalsConnection` hook returns `{ status: { connected: boolean }, isLoading, error, connect, disconnect, refresh }` — straightforward to integrate.
- Pre-existing test infrastructure issue: `react-native-keyboard-controller` wasn't installed locally but was in `package.json`. Running `pnpm install` resolved it.
- All 1523 tests pass across 75 suites.
