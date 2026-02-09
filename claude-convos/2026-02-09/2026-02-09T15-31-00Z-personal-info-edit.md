# P2-B-01: Personal Info Edit Screen Implementation

**Date:** 2026-02-09
**Task:** Wire personal info edit screen to Supabase
**PR:** #37

## Goals

Complete the personal info edit screen by wiring it to Supabase for data persistence, including loading existing profile data and saving updates.

## Key Decisions

1. **Strict Number Parsing**: Used `Number()` instead of `parseFloat()` to reject invalid inputs like "75abc" that parseFloat would accept as 75.

2. **Local Date Handling**: Implemented `parseLocalDate()` and `formatLocalDate()` helper functions to avoid timezone issues when working with date of birth:
   - Database stores dates as `YYYY-MM-DD` strings
   - Parse creates a local Date object (not UTC)
   - Format extracts local date components

3. **Stale Data Cleanup**: Clear athlete profile and error state when user logs out or Supabase becomes unavailable, preventing stale data from being shown.

4. **Try/Finally Pattern**: Wrapped save operation in try/finally to ensure `setIsSaving(false)` is called even if an error occurs.

5. **Unit Conversion**: Implemented bidirectional conversion between metric (stored in DB) and imperial (user preference):
   - Weight: kg ↔ lbs (factor: 2.20462)
   - Height: cm ↔ in (factor: 0.393701)

## Files Changed

- `apps/mobile/app/profile/personal-info.tsx` - Wired to useAthleteProfile hook
- `apps/mobile/hooks/useAthleteProfile.ts` - Fixed stale data on logout

## Learnings

1. **Number() vs parseFloat()**: `Number("75abc")` returns `NaN`, while `parseFloat("75abc")` returns `75`. Use `Number()` for strict validation.

2. **Date Timezone Pitfalls**: `new Date("2000-01-15")` is parsed as UTC midnight, which can shift the date when displayed locally. Use explicit local date parsing: `new Date(year, month - 1, day)`.

3. **Stale State After Logout**: Always clear component state when the authentication state changes to prevent showing previous user's data.

## Copilot Review Feedback Addressed

- Fixed strict number parsing to reject invalid inputs
- Clear stale data when user logs out
- Used local date parsing/formatting to avoid timezone issues
- Wrapped save in try/finally for proper cleanup
