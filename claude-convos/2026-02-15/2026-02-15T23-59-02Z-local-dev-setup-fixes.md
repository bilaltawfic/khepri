# Session: Local Dev Setup Fixes

**Date:** 2026-02-15T23:59:02Z
**Duration:** ~2 hours
**Agent(s) Used:** Explore, Bash

## Goal
Fix multiple issues preventing the app from running locally during Phase 8 manual testing.

## Key Decisions
- Changed inbucket SMTP port from 54325 to 54335 to avoid VS Code tunnel conflict
- Fixed edge function secrets docs: local dev uses `supabase/functions/.env`, not `supabase secrets set`
- Added `--env-file=../.env` to knowledge base seed script so it picks up Supabase keys
- Added ENCRYPTION_KEY to `.env.example` (was missing)
- Allow service role auth in generate-embedding edge function for knowledge base seeding
- Added `pretypecheck` script to regenerate Expo typed routes before typecheck

## Files Changed
- `supabase/config.toml` - SMTP port change
- `docs/testing/manual-testing-setup.md` - Corrected secrets setup instructions
- `supabase/package.json` - Added `--env-file` to seed script
- `.env.example` - Added ENCRYPTION_KEY section
- `supabase/functions/generate-embedding/index.ts` - Service role auth support
- `apps/mobile/package.json` - Added pretypecheck script

## Learnings
- `supabase secrets set` is for remote/hosted projects only; local edge functions read from `supabase/functions/.env`
- VS Code remote tunnels can conflict with default Supabase inbucket SMTP port 54325
- Expo typed routes need regeneration before typecheck or you get stale route types