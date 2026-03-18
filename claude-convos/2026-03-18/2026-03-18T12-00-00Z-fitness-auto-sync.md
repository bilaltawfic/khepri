# Phase 7.5-F: Auto-Sync Fitness Numbers from Intervals.icu

## Date
2026-03-18

## Goals
1. Add `get_athlete_profile` MCP tool to fetch fitness thresholds from Intervals.icu
2. Fix bug where LTHR, threshold pace, and CSS are silently discarded during onboarding
3. Auto-populate fitness screen from Intervals.icu after successful connection
4. Update manual test cases (OB-06 through OB-11) for auto-sync behavior

## Key Decisions

### Architecture
- Added `fetchAthleteProfile()` to `intervals-api.ts` utility, hitting `GET /api/v1/athlete/{id}` (the root athlete endpoint)
- Created `get_athlete_profile` MCP tool following existing tool registration pattern
- Added `getAthleteProfile()` mobile service function that calls the MCP tool

### Bug Fix: 3 Fields Silently Discarded
- **Root cause**: `OnboardingData` type only had `ftp`, `restingHR`, `maxHR`, and `weight` - missing `lthr`, `runThresholdPace`, and `css`
- **Fix**: Added all 3 missing fields to the type, `setFitnessNumbers` callback, and `saveOnboardingData` service
- Database columns already existed (`lthr`, `running_threshold_pace_sec_per_km`, `css_sec_per_100m`)

### Pace/CSS Format
- UI displays as `mm:ss` format (e.g., "5:30")
- Stored as total seconds in the database (e.g., 330)
- Added `parseMmSsToSeconds()` and `secondsToMmSs()` helper functions

### Auto-Sync UX
- Auto-fetches from Intervals.icu when credentials are present in context
- Shows "Syncing from Intervals.icu..." with ActivityIndicator during fetch
- Shows "Synced from Intervals.icu" banner after successful sync
- Each synced field shows a "Synced" badge next to its label
- User can still edit/override any synced value
- Graceful error handling with "Could not sync" banner on failure

## Files Changed

### New Files
- `supabase/functions/mcp-gateway/tools/get-athlete-profile.ts` - MCP tool for fetching athlete profile

### Modified Files
- `supabase/functions/mcp-gateway/utils/intervals-api.ts` - Added `fetchAthleteProfile()` and `IntervalsAthleteProfile` type
- `supabase/functions/mcp-gateway/tools/index.ts` - Registered new tool
- `apps/mobile/contexts/OnboardingContext.tsx` - Added `lthr`, `runThresholdPace`, `css` fields
- `apps/mobile/services/onboarding.ts` - Fixed to persist all 6 fitness fields
- `apps/mobile/services/intervals.ts` - Added `getAthleteProfile()` service function
- `apps/mobile/app/onboarding/fitness.tsx` - Auto-sync logic, synced badges, mm:ss helpers
- `docs/testing/manual-test-cases.csv` - Updated OB-06 through OB-11, added OB-11a, OB-11b

### Test Files Updated
- `apps/mobile/contexts/__tests__/OnboardingContext.test.tsx` - Tests for all 6 fitness fields
- `apps/mobile/services/__tests__/onboarding.test.ts` - Tests for all 6 fields in save
- `apps/mobile/services/__tests__/intervals.test.ts` - Tests for `getAthleteProfile()`
- `apps/mobile/app/onboarding/__tests__/fitness.test.tsx` - Auto-sync tests

## Learnings
- The Intervals.icu athlete profile endpoint returns `run_ftp` (running threshold pace in sec/km) and `swim_ftp` (CSS in sec/100m) - naming is FTP-centric even for non-cycling sports
- All 6 fitness database columns already existed in the initial migration, but 3 were never connected to the onboarding flow
- Using `useRef` for `syncAttempted` prevents re-fetching on re-renders while allowing the effect cleanup to work properly
