# P2-C-06: Persist Check-in Data to Supabase

## Date
2026-02-14

## Goals
- Wire the daily check-in form submission to save data to the `daily_checkins` table in Supabase
- Replace the simulated `setTimeout` TODO with real DB persistence
- Handle duplicate same-day check-ins (update instead of insert)
- Store AI recommendation back on the check-in record after generation

## Key Decisions
1. **Create-or-update pattern**: Check for existing today's check-in via `getTodayCheckin()` before deciding to create or update, avoiding unique constraint violations on `(athlete_id, checkin_date)`
2. **Graceful fallback**: When Supabase is not configured or user is not authenticated, skip DB persistence entirely and fall through to AI recommendation (maintains dev/offline mode)
3. **Field mapping**: camelCase form fields mapped to snake_case DB columns; empty string notes converted to null
4. **AI recommendation storage**: After getting AI recommendation, store it via `updateCheckinRecommendation()` only when both checkin ID and recommendation are available
5. **Test strategy**: Mock all external dependencies (`@khepri/supabase-client`, `@/services/ai`, `@/lib/supabase`, `@/contexts`) to test the hook's integration logic in isolation

## Files Changed
- `apps/mobile/hooks/useCheckin.ts` - Added DB persistence logic (imports, auth context, create/update flow, recommendation storage)
- `apps/mobile/hooks/__tests__/useCheckin.test.ts` - Rewrote with proper mocks; added 11 new DB persistence tests covering field mapping, upsert logic, error handling, and edge cases

## Learnings
- The `useDashboard` hook established a good pattern for mocking `@/lib/supabase` and `@/contexts` with mutable `let` variables and getter-based `jest.mock`
- `Json` type from supabase-client requires `as unknown as Json` casting when passing structured TypeScript types
- Biome flags `!` non-null assertions; use `?? ''` fallback instead for `split('T')[0]`
