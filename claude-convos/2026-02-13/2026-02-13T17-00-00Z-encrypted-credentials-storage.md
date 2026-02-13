# Encrypted Credentials Storage (P3-B-02)

**Date:** 2026-02-13
**Task:** Implement encrypted Intervals.icu credential storage

## Goals
- Store Intervals.icu API credentials securely with AES-GCM encryption
- Create database migration, Edge Function, mobile service, hook, and UI integration
- Follow existing patterns from mcp-gateway Edge Function and auth service

## Key Decisions

### Encryption Approach
- AES-GCM with 32-byte key from ENCRYPTION_KEY env var
- 12-byte random IV prepended to ciphertext, base64-encoded for storage
- Web Crypto API (available in Deno runtime)

### Database Design
- `intervals_credentials` table with RLS policies
- `encrypted_api_key` column stores base64(IV + ciphertext)
- UNIQUE constraint on `athlete_id` with upsert on conflict

### Mobile Architecture
- `credentials.ts` service calls Edge Function via fetch with auth headers
- `useIntervalsConnection` hook manages state (loading, error, status)
- Hook provides `connect`, `disconnect`, `refresh` actions
- Component wired to hook, replacing TODO placeholders

### Testing Strategy
- Credentials service: mock fetch + supabase auth
- Hook: renderHook with mock service functions, catch errors inside act()
- UI: mock entire hook to test component in isolation

## Files Changed
- `supabase/migrations/003_intervals_credentials.sql` (new)
- `supabase/functions/credentials/index.ts` (new)
- `apps/mobile/services/credentials.ts` (new)
- `apps/mobile/services/__tests__/credentials.test.ts` (new)
- `apps/mobile/hooks/useIntervalsConnection.ts` (new)
- `apps/mobile/hooks/__tests__/useIntervalsConnection.test.ts` (new)
- `apps/mobile/app/profile/intervals.tsx` (modified)
- `apps/mobile/app/profile/__tests__/intervals.test.tsx` (modified)
- `apps/mobile/services/index.ts` (modified)
- `apps/mobile/hooks/index.ts` (modified)
- `docs/GETTING-STARTED.md` (modified)

## Learnings
- jest-expo doesn't support replacing `process.env` object; set individual properties
- Errors re-thrown inside React `act()` prevent state flush; catch inside act, assert outside
- Biome requires `Number.parseInt` over global `parseInt`
- Biome `noDelete` rule: use `= ''` instead of `delete process.env.X`
- SonarCloud flags async onPress handlers (Promise where void expected) - use .then/.catch
- SonarCloud flags nested ternaries - extract to helper function
