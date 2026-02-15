# Session: Plan P8-D Auth Hardening

**Date:** 2026-02-15T23:59:01Z
**Duration:** ~10 minutes
**Agent(s) Used:** Explore

## Goal
Identify why the mobile app skips login/registration in dev mode and plan a fix for Phase 8.

## Key Decisions
- **Problem:** `ProtectedRoute` has `if (__DEV__ && !isConfigured) return <>{children}</>;` which silently bypasses all authentication when Supabase isn't configured in development
- **Why it's bad:** Developers never test the real auth flow; a misconfigured production build could expose the app without login; doesn't reflect what users will see
- **Solution:** Remove the dev bypass entirely. When Supabase isn't configured, show an explicit `ConfigurationError` screen with setup instructions instead of silently letting users in
- **New workflow:** Developers must run `supabase start` and set env vars before `pnpm dev` - auth works identically to production

## Files Changed
- `plans/claude-plan-detailed.md` - Added Workstream D (P8-D-01 through P8-D-03) under Phase 8
- `plans/claude-plan.md` - Added Workstream D to Phase 8 table

## Tasks Added
- **P8-D-01:** Remove dev auth bypass + add ConfigurationError screen
- **P8-D-02:** Update tests that relied on the dev bypass
- **P8-D-03:** Document local Supabase setup for development

## Learnings
- Dev convenience shortcuts that bypass security (like `__DEV__` checks) should be avoided - they mask real bugs and create security risks
- Local Supabase is easy to run (`supabase start`) so there's no good reason to skip auth in dev