# Phase 7.5-F: Auto-Sync Fitness Numbers from Intervals.icu

## Context

During manual testing of OB-05 (Intervals.icu connection with valid credentials), we discovered that the fitness numbers screen says values "can be synced from Intervals.icu" but doesn't actually do it. Users who just connected their Intervals.icu account are forced to manually re-enter values that already exist in Intervals.icu.

Additionally, a bug was found: LTHR, threshold pace, and CSS are collected in the fitness form but silently discarded — only FTP, resting HR, and max HR are saved to the athlete profile.

## Goals

1. Auto-populate all 6 fitness fields from Intervals.icu after a successful connection
2. Fix the bug where 3 of 6 fields are silently discarded
3. Update onboarding test cases (OB-06 through OB-11) to reflect auto-sync behavior

## Intervals.icu Athlete Profile API

The `GET /api/v1/athlete/{id}` endpoint returns athlete settings including fitness thresholds. This endpoint is **not currently proxied** by the mcp-gateway.

### Field Mapping

| Intervals.icu Field | Our Field | Currently Saved? |
|---------------------|-----------|------------------|
| `ftp` | FTP (watts) | Yes |
| `lthr` | LTHR (bpm) | **No — silently discarded** |
| `run_ftp` | Threshold Pace (min/km) | **No — silently discarded** |
| `swim_ftp` | CSS (/100m) | **No — silently discarded** |
| `resting_hr` | Resting HR (bpm) | Yes |
| `max_hr` | Max HR (bpm) | Yes |

## Tasks

| # | Task | Files | Tests | Deps | Status |
|---|------|-------|-------|------|--------|
| 1 | Add athlete profile endpoint to mcp-gateway | `supabase/functions/mcp-gateway/` | 🧪 `GET /athlete/:id` returns profile with FTP, LTHR, max_hr, resting_hr, run_ftp, swim_ftp | - | ⬜ |
| 2 | Deploy mcp-gateway with `--no-verify-jwt` | `supabase/functions/mcp-gateway/` | 🧪 Endpoint accessible with ES256 JWT from new `sb_publishable_*` keys | Task 1 | ⬜ |
| 3 | Fix: persist all 6 fitness fields to athletes table | `apps/mobile/contexts/OnboardingContext.tsx`, `packages/supabase-client/` | 🧪 All 6 values saved to athletes table on onboarding completion | - | ⬜ |
| 4 | Auto-populate fitness screen from Intervals.icu | `apps/mobile/app/onboarding/fitness.tsx`, `apps/mobile/services/` | 🧪 Fields pre-filled when connected; user can still edit/override | Tasks 1, 2 | ⬜ |
| 5 | Update OB-06 through OB-11 test cases for auto-sync behavior | `docs/testing/manual-test-cases.csv` | - | Tasks 3, 4 | ⬜ |

## Technical Notes

- **ES256 JWT issue:** The Supabase edge function relay rejects ES256 JWTs produced by the new `sb_publishable_*` key format. The workaround is deploying with `--no-verify-jwt`. The function still validates auth internally via `supabase.auth.getUser()`, which is actually more secure (validates against the auth server rather than local signature check).
- **Database schema:** The `athletes` table may need new columns for LTHR, threshold_pace, and CSS if they don't already exist. Check the migration files.
- **UX:** When Intervals.icu is connected, show a brief "Synced from Intervals.icu" indicator on pre-filled fields. Allow the user to override any value.

## Current Status

- [ ] Task 1: Add athlete profile endpoint
- [ ] Task 2: Deploy mcp-gateway
- [ ] Task 3: Fix persist all 6 fields
- [ ] Task 4: Auto-populate fitness screen
- [ ] Task 5: Update test cases
