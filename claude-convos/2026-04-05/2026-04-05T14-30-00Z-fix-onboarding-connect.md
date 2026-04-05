# Fix: Onboarding Connect Screen - Athlete Profile Not Found

**Date:** 2026-04-05
**Type:** Bug Fix

## Goals
Fix the "Athlete profile not found" error on the Intervals.icu connect screen during onboarding, and prevent input fields from showing red borders before user interaction.

## Root Cause
The onboarding flow had a sequencing issue:
- "Get Started" on the welcome screen navigated directly to the connect screen without creating an athlete record
- The credentials edge function requires an athlete record to exist (it queries `athletes` table to get the athlete ID)
- Both GET (status check) and POST (save credentials) requests failed with "Athlete profile not found"
- The "Skip for now" button DID create the athlete record, but "Get Started" did not

Additionally, the connect screen showed red borders on input fields immediately on load when any error existed (including status check errors), before the user had attempted to connect.

## Key Decisions
1. Create the athlete record in the welcome screen before navigating to connect — both "Get Started" and "Skip" now share an `ensureAthleteExists` helper
2. Add defensive handling in the credentials edge function for GET requests when no athlete exists (return `{ connected: false }` instead of 404)
3. Only show red input borders after a user-initiated connect attempt fails, not from initial status check errors

## Files Changed
- `apps/mobile/app/onboarding/index.tsx` — Added `ensureAthleteExists` helper, wired to both buttons
- `apps/mobile/app/onboarding/connect.tsx` — Added `hasAttemptedConnect` state to control error border display
- `supabase/functions/credentials/index.ts` — GET returns `{ connected: false }` when no athlete record exists

## Learnings
- Edge functions were redeployed with `--no-verify-jwt` per project convention
- The credentials service client code throws generic "Failed to get connection status" but the raw response body "Athlete profile not found" was being surfaced through the `saveCredentials` path (POST), which parses the JSON error body
- Need to ensure dependent records exist before screens that reference them
