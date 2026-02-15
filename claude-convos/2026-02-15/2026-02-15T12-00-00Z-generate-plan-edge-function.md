# Generate Plan Edge Function Implementation

**Date:** 2026-02-15
**Task:** P6-B-04 — Build Plan Generation Edge Function
**Branch:** feat/p6-b-04-generate-plan-edge-function

## Goals

Create a `generate-plan` Supabase Edge Function that generates structured training plans with periodization data and persists them to the database.

## Key Decisions

1. **Inline periodization logic** — Supabase Edge Functions (Deno) cannot import local monorepo packages. Inlined the core periodization logic from `@khepri/core` with a comment noting the duplication.
2. **Pure function architecture** — Separated plan building into pure functions (`plan-builder.ts`) for full testability without mocking.
3. **Database persistence in function** — The function both generates AND persists the plan, returning a complete database record to the caller.
4. **No AI call in v1** — Periodization is deterministic. `weekly_template` left as `null` for future AI-enhanced generation.
5. **Runtime validation** — Full validation of request body before type casting, following existing patterns from ai-orchestrator.

## Files Changed

- `supabase/functions/generate-plan/types.ts` — Request/response type definitions with readonly props
- `supabase/functions/generate-plan/plan-builder.ts` — Pure plan construction logic (periodization, date math, name generation)
- `supabase/functions/generate-plan/index.ts` — Edge Function handler with auth, CORS, validation
- `supabase/functions/generate-plan/__tests__/plan-builder.test.ts` — 47 unit tests covering all pure functions
- `supabase/jest.config.js` — Added generate-plan files to coverage collection

## Learnings

- Biome auto-formatter requires multi-line for long function calls and object literals
- `!` non-null assertions should use destructuring (`const [date] = ...split('T')`) instead
- Pre-existing typecheck errors in mobile app (chat.test.tsx, checkin.ts) are unrelated to this work
