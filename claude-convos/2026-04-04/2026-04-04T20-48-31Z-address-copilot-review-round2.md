# Address Copilot Review Round 2

## Goals
Address 16 unresolved Copilot review comments on PR #143 after the refactoring commit.

## Key Decisions

### Already fixed (reply + resolve only)
- `loadActiveBlock` already clears state when block is null (lines 624-626)
- `isToday` already uses local date (`getFullYear/Month/Date`), not UTC
- `getComplianceIcon` already uses theme colors (fixed in refactoring commit)
- `currentWeek` already clamped to ≥1 with `Math.max(1, rawCurrentWeek)`
- `handleLockIn` in block-lock.tsx already checks `success` before navigating
- `block-lock.tsx` already shows `isLoading` spinner state

### Code fixes applied

**ActiveBlockHeader - wrong phase shown (S3971968)**
Changed from always showing `phases[0]` to computing current phase by accumulating week counts. Each phase has a `weeks` property; we iterate until we find the phase that contains `currentWeek`.

**useBlockPlanning - drafts in plannedEndDates (S3955299)**
Changed filter from `status !== 'cancelled'` to only include `locked` and `in_progress` blocks. Drafts are now excluded so abandoned drafts don't block re-planning of the same phase.

**useBlockPlanning - orphaned draft on generation failure (S3971951)**
After Edge Function invocation failure, now calls `cancelBlock(supabase, createdBlock.id)` and sets `setBlock(null)` before throwing. Prevents orphaned draft blocks being left behind.

**Edge Function - preferences array validation (S3971938)**
Added validation that `preferences.availableDays` and `preferences.sportPriority` are arrays.

**Edge Function - dayOfWeek fix (S3971931)**
Changed `const dayOfWeek = dayOffset` to `const dayOfWeek = dayDate.getDay()`. This uses JavaScript's actual day-of-week (0=Sunday) to match `availableDays` preference values, rather than assuming week starts on Monday.

**Edge Function - athlete error handling (S3971949)**
Separated `athleteError` check (returns 500) from `athlete.id !== request.athlete_id` check (returns 403). Previously, a transient DB error would return a misleading 403.

**Edge Function - upsert on conflict (S3971944)**
Changed `insert` to `upsert({ onConflict: 'external_id' })`. Safe for retries; second invocation replaces rather than causing a unique constraint error.

## Files Changed
- `apps/mobile/app/(tabs)/plan.tsx` - `ActiveBlockHeader` now computes current phase
- `apps/mobile/hooks/useBlockPlanning.ts` - exclude drafts from planned dates, cancel orphaned blocks
- `supabase/functions/generate-block-workouts/index.ts` - validate preferences arrays, fix dayOfWeek, athlete error, upsert

## Learnings
- Copilot second review round addressed issues introduced/missed in the first fix cycle
- Phase computation requires tracking accumulated weeks, not just array index
- Upsert is always safer than insert for deterministic external IDs
