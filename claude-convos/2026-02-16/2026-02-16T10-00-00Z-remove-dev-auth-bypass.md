# Remove __DEV__ Auth Bypass

**Date:** 2026-02-16
**Type:** Bug Fix

## Goals

Remove the `__DEV__` authentication bypass in `ProtectedRoute` that allowed unauthenticated access when Supabase wasn't configured in development mode. This bypass made manual testing of auth flows impossible and didn't reflect real-world behavior.

## Key Decisions

- **Remove bypass entirely** rather than making it configurable — auth should always be enforced regardless of environment
- **Update tests** to verify that unconfigured Supabase redirects to login (same as no auth)
- The `isConfigured` property remains available in `useAuth()` for other uses — we only removed it from `ProtectedRoute`

## Discovery

Found during Phase 7.5 manual testing (AUTH category). The tester couldn't reach the login screen because the app bypassed auth in `__DEV__` mode when Supabase env vars were missing.

## Files Changed

- `apps/mobile/components/ProtectedRoute.tsx` — Removed `__DEV__ && !isConfigured` bypass, removed unused `isConfigured` destructure
- `apps/mobile/components/__tests__/ProtectedRoute.test.tsx` — Replaced 2 bypass tests with 1 redirect-to-login test

## Learnings

- Dev-mode bypasses that skip real flows make manual testing impossible
- Local Supabase requires `.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the mobile app to connect
- Physical devices can't reach `127.0.0.1` — need Mac's `.local` hostname or deploy to hosted Supabase
