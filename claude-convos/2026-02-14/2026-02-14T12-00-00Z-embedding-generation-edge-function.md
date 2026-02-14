# P5-A-03: Embedding Generation Edge Function

**Date:** 2026-02-14
**Task:** Implement generate-embedding Supabase Edge Function

## Goals
- Create a Supabase Edge Function that generates vector embeddings from text using OpenAI's `text-embedding-3-small` model
- Store generated embeddings in the `embeddings` table for RAG-based AI coaching
- Support both shared knowledge (no athlete_id) and personal embeddings (athlete-specific)

## Key Decisions
1. **Separated validation into its own module** (`validate.ts`) for testability, following the pattern of ai-orchestrator's separate `prompts.ts` and `stream.ts` modules
2. **Used `!= null` for nullish checks** instead of truthy checks to handle zero values correctly (Copilot pattern #6)
3. **Added integer validation** for `chunk_index` beyond just non-negative check
4. **Used service role client** for database inserts to bypass RLS for shared knowledge embeddings
5. **Removed incorrect frozen tuple test** — `as const` is compile-time only in TypeScript

## Files Created
- `supabase/functions/generate-embedding/index.ts` — Main edge function handler
- `supabase/functions/generate-embedding/types.ts` — Request/response types and constants
- `supabase/functions/generate-embedding/validate.ts` — Runtime request validation
- `supabase/functions/generate-embedding/__tests__/validate.test.ts` — 30 validation tests
- `supabase/functions/generate-embedding/__tests__/types.test.ts` — Constants tests

## Files Modified
- `.env.example` — Added `OPENAI_API_KEY` variable
- `supabase/jest.config.js` — Added `validate.ts` to coverage collection

## Learnings
- `as const` in TypeScript does NOT freeze arrays at runtime — only provides compile-time readonly enforcement
- Biome enforces sorted imports — always import from types before validate
- Biome prefers `undefined` assignment over `delete` operator for performance
