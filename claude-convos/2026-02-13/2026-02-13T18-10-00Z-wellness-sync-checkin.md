# P3-B-04: Sync Wellness Data to Daily Check-in

## Date
2026-02-13T18:10:00Z

## Goals
- Pre-populate the daily check-in form with wellness data from Intervals.icu
- Reduce manual data entry by auto-filling sleep, energy, stress, and soreness metrics
- Ensure graceful degradation when no credentials or data are available

## Key Decisions

### Scale Mapping Strategy
- Intervals.icu uses 1-5 scales; our check-in uses 1-10
- Mapping: 1->1, 2->3, 3->5, 4->7, 5->9 via formula `(value - 1) * 2 + 1`
- Fatigue is inverted to energy: fatigue 1 (low) = energy 9 (high)

### Non-destructive Prefill
- `applyPrefill()` only fills fields that are still `null`
- If a user manually sets a value before wellness data loads, their edit is preserved
- This is intentional to avoid frustrating users who fill the form quickly

### Graceful Degradation
- Wellness sync failures are caught and logged but don't block check-in
- No visible error shown to user on sync failure (just no prefill)
- Works seamlessly whether or not Intervals.icu credentials are configured

## Files Created
- `apps/mobile/services/intervals.ts` - MCP gateway client for wellness data
- `apps/mobile/services/__tests__/intervals.test.ts` - 9 tests
- `apps/mobile/hooks/useWellnessSync.ts` - Hook with scale transformation logic
- `apps/mobile/hooks/__tests__/useWellnessSync.test.ts` - 18 tests

## Files Modified
- `apps/mobile/hooks/useCheckin.ts` - Added `applyPrefill()` method
- `apps/mobile/hooks/__tests__/useCheckin.test.ts` - Added 4 applyPrefill tests
- `apps/mobile/app/(tabs)/checkin.tsx` - Integrated wellness sync with UI indicator
- `apps/mobile/services/index.ts` - Added intervals barrel export

## Learnings
- The credentials service pattern (mock supabase, mock fetch) works well as a template for new service files
- Exporting pure transformation functions from hooks enables thorough unit testing without needing renderHook
- The `useEffect` + `applyPrefill` pattern cleanly separates async data fetching from form state management
