# P5-A-01: pgvector Extension & Embeddings Table Setup

**Date:** 2026-02-13
**Task:** P5-A-01 from Phase 5 plan
**Branch:** feat/p5-a-01-pgvector-setup

## Goals
- Enable pgvector extension in the database
- Create embeddings table with vector column, indexes, and RLS policies
- Create match_embeddings similarity search function
- Add TypeScript query functions for embedding CRUD and search
- Add unit tests for all query functions

## Key Decisions
1. **Separate migrations**: 004 enables pgvector extension, 005 creates the embeddings table — keeps rollback clean
2. **1536 dimensions**: Matches OpenAI text-embedding-3-small for best cost/quality tradeoff
3. **IVFFlat index**: Simpler than HNSW, sufficient for expected scale (~400-2000 documents)
4. **SECURITY DEFINER function**: match_embeddings bypasses RLS but applies explicit content type and athlete filters (Supabase-recommended pattern)
5. **Runtime validation**: isValidContentType() guards against invalid content_type values before DB calls
6. **Database type updates**: Added embeddings table and match_embeddings function to the Database type in types.ts

## Files Changed
- `supabase/migrations/004_pgvector.sql` — NEW: Enable pgvector extension
- `supabase/migrations/005_embeddings.sql` — NEW: Embeddings table, indexes, RLS, match function
- `packages/supabase-client/src/queries/embeddings.ts` — NEW: insertEmbedding, searchEmbeddings, deleteEmbeddingsBySource
- `packages/supabase-client/src/__tests__/queries/embeddings.test.ts` — NEW: Unit tests (13 test cases)
- `packages/supabase-client/src/queries/index.ts` — Added embedding exports
- `packages/supabase-client/src/index.ts` — Added embedding exports
- `packages/supabase-client/src/types.ts` — Added embeddings table and match_embeddings to Database type

## Learnings
- Supabase represents vector columns as `string` in TypeScript (not number[])
- The `as never` pattern used elsewhere in queries handles Supabase generic inference limitations
- RPC calls need function types declared in Database.Functions for type safety
