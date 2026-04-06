# Block Planning Manual Testing (Round 1)

## Goals
- Manual testing of BLOCK category test cases (BLOCK-01 through BLOCK-07)
- Fix failures found during testing with individual commits

## Test Results

| ID | Use Case | Result | Notes |
|----|----------|--------|-------|
| BLOCK-01 | Start block planning from dashboard | PASS | Focus areas removed in PR #154 |
| BLOCK-02 | Configure block setup | FIXED | Replaced text input with FormDatePicker range mode + reason field |
| BLOCK-03 | Block setup - invalid hours | PASS (after fix) | Added inline validation with disabled button |
| BLOCK-04 | Add/remove unavailable dates | Not tested | Updated test steps for new UI |
| BLOCK-05 | Review generated workouts | Not tested | |
| BLOCK-06 | Lock-in block | Not tested | |
| BLOCK-07 | Lock-in without Intervals.icu | Not tested | |

## Fixes Applied

### Fix 1: Date range picker for unavailable dates (BLOCK-02)
- **Failure:** Plain text input instead of calendar date picker for unavailable dates
- **Root cause:** Original implementation used a simple TextInput; FormDatePicker wasn't available yet
- **Fix:**
  - Created `UnavailableDate` type in `packages/core/src/types/block.ts`
  - Created `expandDateRange` and `groupUnavailableDates` utilities in `packages/core/src/utils/date-ranges.ts`
  - Rewrote unavailable days section in `block-setup.tsx` to use `FormDatePicker mode="range"` with reason field and grouped chips
  - Updated `useBlockPlanning.ts` to use `UnavailableDate[]` type
  - Updated edge function to accept objects with optional reason
- **Commit:** `2b20d35`

### Fix 2: Inline hours validation with disabled button (BLOCK-03)
- **Failure:** No validation shown when max < min hours; generate button remained active
- **Root cause:** Initial fix attempt used on-submit validation that wasn't triggering
- **Fix:** Switched to derived inline validation computed on every render; button disabled when hours invalid
- **Commit:** `017afa6`

## Files Changed
- `packages/core/src/types/block.ts` (new)
- `packages/core/src/types/index.ts`
- `packages/core/src/utils/date-ranges.ts` (new)
- `packages/core/src/utils/date-ranges.test.ts` (new)
- `packages/core/src/utils/index.ts`
- `packages/core/src/index.ts`
- `apps/mobile/app/plan/block-setup.tsx`
- `apps/mobile/app/plan/__tests__/block-setup.test.tsx`
- `apps/mobile/hooks/useBlockPlanning.ts`
- `supabase/functions/generate-block-workouts/index.ts`
- `docs/testing/manual-test-cases.csv`

## Learnings
- Derived/inline validation (computing error state from render values) is more reliable than on-submit state for immediate feedback
- UTC-only date arithmetic (`T00:00:00Z` suffix, `setUTCDate`) avoids timezone off-by-one bugs
- FormDatePicker range mode callback needs `act()` wrapping in tests for proper state updates
- Testing round incomplete — BLOCK-02, BLOCK-04 through BLOCK-07 need testing in next round
