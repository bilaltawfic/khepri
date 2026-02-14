# Semantic Search Edge Function

**Date:** 2026-02-14
**Task:** P5-A-04 — Add Semantic Search Edge Function
**Branch:** feat/p5-a-04-semantic-search

## Goals

Create a Supabase Edge Function that accepts a natural-language query, generates an embedding via OpenAI, and searches the `embeddings` table for semantically similar content. This is the retrieval layer of the RAG system.

## Key Decisions

1. **Followed generate-embedding patterns exactly** — CORS headers, auth flow, OpenAI API call structure, error handling all mirror the existing edge function for consistency.
2. **Service role client for RPC** — `match_embeddings` is SECURITY DEFINER, so we use the service role client to call it.
3. **Ephemeral query embeddings** — Unlike generate-embedding, the query embedding is not stored. It's generated on the fly and discarded after the search.
4. **Athlete ownership validation** — When `athlete_id` is provided, we verify the authenticated user owns that athlete profile before searching.
5. **No handler integration tests** — Following existing codebase convention where no edge function has handler-level tests (only pure function tests). The `index.ts` follows identical patterns to generate-embedding.
6. **No jest.config.js changes needed** — The existing glob patterns (`functions/**/types.ts`, `functions/**/validate.ts`) already cover our new files.

## Files Changed

### Created
- `supabase/functions/semantic-search/index.ts` — Main edge function handler
- `supabase/functions/semantic-search/types.ts` — Request/response interfaces and constants
- `supabase/functions/semantic-search/validate.ts` — Runtime request validation
- `supabase/functions/semantic-search/__tests__/types.test.ts` — Constants unit tests (8 tests)
- `supabase/functions/semantic-search/__tests__/validate.test.ts` — Validation unit tests (~35 tests)

## Learnings

- The existing `testMatch` and `collectCoverageFrom` glob patterns in `supabase/jest.config.js` are broad enough to auto-include new edge function test and source files without modification.
- Pre-existing typecheck failures in `apps/mobile` (chat.test.tsx, types/checkin.ts) and lint warnings are unrelated to this task.
