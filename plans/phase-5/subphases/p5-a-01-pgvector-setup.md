# P5-A-01: Add pgvector Extension Migration

## Goal

Enable the `pgvector` extension in the Supabase database and create the foundational `embeddings` table for storing vector embeddings. This is the infrastructure layer for Phase 5's RAG (Retrieval-Augmented Generation) system, which will let the AI coach retrieve relevant exercise science knowledge when answering athlete questions.

## Background

### Current State
- PostgreSQL 15 with `uuid-ossp` extension only
- 3 existing migrations (initial schema, conversations, intervals credentials)
- No vector search capability
- AI recommendations are generated purely from prompt context and real-time data

### Why pgvector
- `pgvector` is the standard PostgreSQL extension for vector similarity search
- Supabase has first-class support for pgvector (available in all hosted plans)
- Enables semantic search over exercise science knowledge base
- Cosine similarity search is fast and well-understood for text embeddings

### Embedding Model Choice
- Claude does not provide embeddings — we'll use OpenAI's `text-embedding-3-small` (1536 dimensions) or Voyage AI's `voyage-3-lite` (512 dimensions)
- This task sets up the table with a configurable dimension; the actual embedding generation is P5-A-03
- Default to 1536 dimensions (OpenAI standard) — can be adjusted later

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/004_pgvector.sql` | Create | Enable pgvector extension |
| `supabase/migrations/005_embeddings.sql` | Create | Create embeddings table with vector column and RLS |
| `packages/supabase-client/src/queries/embeddings.ts` | Create | TypeScript queries for embedding CRUD and similarity search |
| `packages/supabase-client/src/queries/__tests__/embeddings.test.ts` | Create | Unit tests for embedding queries |
| `packages/supabase-client/src/index.ts` | Modify | Export embedding queries |

## Implementation Steps

### Step 1: Enable pgvector extension (004_pgvector.sql)

```sql
-- Enable pgvector extension for vector similarity search
-- Required for Phase 5: Knowledge Integration (RAG)
CREATE EXTENSION IF NOT EXISTS vector;
```

Keep this as a separate migration since enabling an extension is a distinct operation from creating tables.

### Step 2: Create embeddings table (005_embeddings.sql)

```sql
-- Embeddings table for RAG knowledge base
-- Stores vector embeddings of exercise science content for semantic search
--
-- Content types:
--   'knowledge'   - Exercise science articles, guidelines, protocols
--   'conversation' - Past coaching conversation summaries (future)
--   'activity'     - Activity pattern summaries (future)

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Content identification
    content_type TEXT NOT NULL CHECK (content_type IN ('knowledge', 'conversation', 'activity')),
    source_id TEXT,                    -- Reference to source document/conversation/activity
    chunk_index INTEGER DEFAULT 0,     -- For documents split into chunks

    -- Content
    title TEXT NOT NULL,
    content TEXT NOT NULL,             -- The original text that was embedded
    metadata JSONB DEFAULT '{}',       -- Flexible metadata (tags, category, sport, etc.)

    -- Vector embedding (1536 dimensions for text-embedding-3-small)
    embedding vector(1536) NOT NULL,

    -- Ownership (NULL for shared knowledge base, athlete_id for personal embeddings)
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_embeddings_updated_at
    BEFORE UPDATE ON embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INDEXES
-- =============================================================================

-- IVFFlat index for fast approximate nearest neighbor search
-- Lists = sqrt(expected_rows) ≈ 20 for initial ~400 knowledge documents
CREATE INDEX idx_embeddings_vector ON embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 20);

-- Filter indexes for common query patterns
CREATE INDEX idx_embeddings_content_type ON embeddings (content_type);
CREATE INDEX idx_embeddings_athlete_id ON embeddings (athlete_id);
CREATE INDEX idx_embeddings_source_id ON embeddings (source_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Everyone can read shared knowledge (athlete_id IS NULL)
CREATE POLICY "Anyone can read shared knowledge"
    ON embeddings FOR SELECT
    USING (athlete_id IS NULL);

-- Athletes can read their own personal embeddings
CREATE POLICY "Athletes can read own embeddings"
    ON embeddings FOR SELECT
    USING (
        athlete_id IS NOT NULL
        AND athlete_id IN (
            SELECT id FROM athletes WHERE auth_user_id = auth.uid()
        )
    );

-- Athletes can insert their own embeddings
CREATE POLICY "Athletes can insert own embeddings"
    ON embeddings FOR INSERT
    WITH CHECK (
        athlete_id IS NOT NULL
        AND athlete_id IN (
            SELECT id FROM athletes WHERE auth_user_id = auth.uid()
        )
    );

-- Athletes can delete their own embeddings
CREATE POLICY "Athletes can delete own embeddings"
    ON embeddings FOR DELETE
    USING (
        athlete_id IS NOT NULL
        AND athlete_id IN (
            SELECT id FROM athletes WHERE auth_user_id = auth.uid()
        )
    );

-- =============================================================================
-- SIMILARITY SEARCH FUNCTION
-- =============================================================================

-- Function for semantic search with content type filtering
CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding vector(1536),
    match_count INTEGER DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.7,
    filter_content_type TEXT DEFAULT NULL,
    filter_athlete_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content_type TEXT,
    title TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.content_type,
        e.title,
        e.content,
        e.metadata,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    WHERE
        -- Content type filter
        (filter_content_type IS NULL OR e.content_type = filter_content_type)
        -- Athlete filter: shared knowledge (NULL) or specific athlete
        AND (
            e.athlete_id IS NULL
            OR e.athlete_id = filter_athlete_id
        )
        -- Similarity threshold
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

### Step 3: Create embedding queries (embeddings.ts)

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';

export interface EmbeddingRecord {
  id: string;
  content_type: 'knowledge' | 'conversation' | 'activity';
  source_id: string | null;
  chunk_index: number;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
  athlete_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmbeddingMatch {
  id: string;
  content_type: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

/**
 * Insert a new embedding record
 */
export async function insertEmbedding(
  client: SupabaseClient,
  record: Omit<EmbeddingRecord, 'id' | 'created_at' | 'updated_at'>
) { ... }

/**
 * Search for similar embeddings using cosine similarity
 */
export async function searchEmbeddings(
  client: SupabaseClient,
  queryEmbedding: number[],
  options?: {
    matchCount?: number;
    matchThreshold?: number;
    contentType?: string;
    athleteId?: string;
  }
): Promise<EmbeddingMatch[]> { ... }

/**
 * Delete embeddings by source ID (for re-indexing)
 */
export async function deleteEmbeddingsBySource(
  client: SupabaseClient,
  sourceId: string
) { ... }
```

### Step 4: Write tests for embedding queries

```typescript
// Test cases:
// 1. insertEmbedding calls supabase.from('embeddings').insert() with correct fields
// 2. searchEmbeddings calls supabase.rpc('match_embeddings') with query vector
// 3. searchEmbeddings passes optional filters (content type, athlete ID)
// 4. searchEmbeddings uses default match count and threshold when not specified
// 5. deleteEmbeddingsBySource calls delete with source_id filter
// 6. insertEmbedding returns error on duplicate source_id + chunk_index
```

### Step 5: Export from supabase-client index

Add embedding query exports to `packages/supabase-client/src/index.ts`.

## Testing Requirements

- Unit tests for all embedding query functions (mocked Supabase client)
- Migration syntax validated (can run against local Supabase)
- RLS policies tested: shared knowledge readable, personal data isolated
- `match_embeddings` function returns results ordered by similarity

## Verification

- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] Migration 004 enables pgvector extension without errors
- [ ] Migration 005 creates embeddings table with vector(1536) column
- [ ] IVFFlat index created for cosine similarity search
- [ ] RLS policies enforce: shared knowledge readable by all, personal embeddings isolated
- [ ] `match_embeddings` function returns top-K results above threshold
- [ ] Embedding queries exported from supabase-client package
- [ ] Existing migrations unmodified (no regression)

## Design Decisions

1. **Separate extension and table migrations**: Extension enablement is idempotent (`IF NOT EXISTS`) but is a distinct schema change. Keeping them separate makes rollback clearer.

2. **1536 dimensions**: Matches OpenAI's `text-embedding-3-small` which offers the best cost/quality tradeoff. Can be changed later if we switch embedding providers.

3. **IVFFlat over HNSW**: IVFFlat is simpler, uses less memory, and is sufficient for our expected scale (~400-2000 documents). HNSW would be better at 100K+ documents.

4. **Shared + personal embeddings**: `athlete_id IS NULL` for shared knowledge base, non-null for personal data (future: conversation summaries). RLS enforces isolation.

5. **SECURITY DEFINER function**: `match_embeddings` runs with the function owner's permissions, bypassing RLS for the query but applying content type and athlete filters explicitly. This is the Supabase-recommended pattern for vector search functions.

6. **`content_type` as TEXT with CHECK**: Avoids creating an ENUM type (which requires a migration to add values). New types can be added by altering the CHECK constraint.
