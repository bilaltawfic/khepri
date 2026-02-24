# Rename Supabase Anon Key to Publishable Key

**Date**: 2026-02-24
**Branch**: `refactor/rename-anon-to-publishable-key`
**Plan**: `plans/phase-8/p8a1-rename-anon-to-publishable.md`

## Goals

Rename all references to Supabase's deprecated "anon key" terminology to the new "publishable key" naming across the codebase. Supabase now issues keys with `sb_publishable_` and `sb_secret_` prefixes for new projects.

## Key Decisions

- **Edge function `Deno.env.get()` calls NOT renamed**: Supabase still auto-injects `SUPABASE_ANON_KEY` into edge function env vars. Only header comments were updated to clarify these are publishable keys provided under the legacy env var name.
- **`supabase status` JSON field names NOT renamed**: The CLI still outputs `ANON_KEY` — the CI workflow reads `.ANON_KEY` from JSON but exports it as `SUPABASE_PUBLISHABLE_KEY`.
- **Key prefix in docs updated**: Changed `eyJ...` to `sb_publishable_...` and `sb_secret_...` to reflect the new key format.

## Files Changed

### Source Code (3 files)
- `packages/supabase-client/src/client.ts` — `ENV_VARS.SUPABASE_ANON_KEY` → `SUPABASE_PUBLISHABLE_KEY`; `hasAnonKey` → `hasPublishableKey`; JSDoc updates
- `packages/supabase-client/src/index.ts` — JSDoc comment updates ("anon key" → "publishable key")
- `apps/mobile/lib/supabase.ts` — `supabaseAnonKey` → `supabasePublishableKey`; `EXPO_PUBLIC_SUPABASE_ANON_KEY` → `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Tests (3 files)
- `packages/supabase-client/src/__tests__/client.test.ts` — env var refs, assertion property names, test descriptions
- `packages/supabase-client/src/__tests__/integration/setup.ts` — `SUPABASE_ANON_KEY` → `SUPABASE_PUBLISHABLE_KEY`; `createAnonClient()` → `createPublishableClient()`
- `apps/mobile/lib/__tests__/supabase.test.ts` — mock config property names and test values

### Edge Functions — comments only (7 files)
- `supabase/functions/{ai-coach,ai-orchestrator,credentials,generate-embedding,generate-plan,mcp-gateway,semantic-search}/index.ts`

### CI (1 file)
- `.github/workflows/integration-test.yml` — export var renamed (still reads `.ANON_KEY` from CLI JSON)

### Documentation (4 files)
- `docs/DEPLOYMENT.md` — key terminology and env var names
- `docs/GETTING-STARTED.md` — table description
- `docs/testing/manual-testing-setup.md` — env var name in example
- `plans/phase-1/p1-c-auth-foundation.md` — code example updated

## Learnings

- Supabase edge functions still use the legacy `SUPABASE_ANON_KEY` env var name even though new projects issue `sb_publishable_` keys — this is a known issue (supabase/supabase#37648).
- When renaming a const object key used in `as const`, all downstream property access must also be updated or TypeScript will catch the stale reference.
