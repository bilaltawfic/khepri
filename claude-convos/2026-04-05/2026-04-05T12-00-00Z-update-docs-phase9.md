# Update Documentation for Phase 9

**Date**: 2026-04-05
**Type**: Documentation update

## Goals

Update all project documentation to reflect Phase 9 features: season-based planning, block workouts, compliance tracking, AI adaptations, and bidirectional Intervals.icu sync.

## Infrastructure Actions

- Reset remote Supabase database (wiped test data, re-applied all 13 migrations)
- Pushed 5 pending migrations (009-013) to remote
- Deployed 5 new edge functions to remote Supabase:
  - `generate-season-skeleton` (with JWT)
  - `generate-block-workouts` (with JWT)
  - `suggest-adaptation` (with JWT)
  - `intervals-sync` (no JWT — cron)
  - `intervals-webhook` (no JWT — external)

## Files Changed

| File | Changes |
|------|---------|
| `README.md` | Updated status to Phase 9, rewrote features list, updated tech stack |
| `docs/database-schema.md` | Added 5 new tables (seasons, race_blocks, workouts, plan_adaptations, sync_log), updated ERD, JSONB docs, indexes, enums, constraints |
| `docs/DEPLOYMENT.md` | Added 5 new edge functions, new secrets (CRON_SECRET, INTERVALS_WEBHOOK_SECRET), JWT vs no-JWT deployment guidance |
| `docs/GETTING-STARTED.md` | Expanded project structure with all 12 edge functions |
| `docs/testing/manual-testing-setup.md` | Added Phase 9 test categories table, dependency order, remote DB reset instructions, updated test account guidance |

## Key Decisions

- Kept `training_plans` table marked as "legacy" rather than removing — existing data and code still references it
- Organized edge functions into "JWT verified" (user-facing) vs "no JWT" (external callers) categories
- Added Phase 9 test dependency order to testing setup guide (SEASON → BLOCK → DASH/PLAN/COMPLY/ADAPT)

## Learnings

- `supabase db reset --linked` works for remote DBs but requires piping "y" for non-interactive use
- Remote Supabase rejects fake email domains — test accounts need real email addresses with `+` aliases
- Edge functions deployed with `--no-verify-jwt` are permanent until redeployed without the flag
