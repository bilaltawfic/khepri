-- Khepri: Embeddings Table for RAG Knowledge Base
-- Migration: 005_embeddings.sql
-- Description: Creates the embeddings table for storing vector embeddings of
--   exercise science content for semantic search. Supports shared knowledge
--   base and personal embeddings (conversation/activity summaries).
--
-- Content types:
--   'knowledge'    - Exercise science articles, guidelines, protocols
--   'conversation' - Past coaching conversation summaries (future)
--   'activity'     - Activity pattern summaries (future)

-- ============================================================================
-- EMBEDDINGS TABLE
-- ============================================================================
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

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER update_embeddings_updated_at
    BEFORE UPDATE ON embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- IVFFlat index for fast approximate nearest neighbor search
-- Lists = sqrt(expected_rows) ~ 20 for initial ~400 knowledge documents
-- NOTE: IVFFlat requires training data to create clusters. Creating this index
-- on an empty table may fail on some pgvector/Postgres setups. If this migration
-- runs before any embeddings are inserted, you may need to defer this index
-- creation until after initial data is loaded (e.g., via a later migration) or
-- rerun the CREATE INDEX statement once data exists.
CREATE INDEX idx_embeddings_vector ON embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 20);

-- Filter indexes for common query patterns
CREATE INDEX idx_embeddings_content_type ON embeddings (content_type);
CREATE INDEX idx_embeddings_athlete_id ON embeddings (athlete_id);
CREATE INDEX idx_embeddings_source_id ON embeddings (source_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
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

-- Service role can insert shared knowledge embeddings (athlete_id IS NULL)
CREATE POLICY "Service role can insert shared knowledge"
    ON embeddings FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role'
        AND athlete_id IS NULL
        AND content_type = 'knowledge'
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

-- Note: Embeddings are treated as immutable.
-- There is intentionally no UPDATE policy; to change an embedding,
-- clients should delete the existing row and insert a new one.

-- Athletes can delete their own embeddings
CREATE POLICY "Athletes can delete own embeddings"
    ON embeddings FOR DELETE
    USING (
        athlete_id IS NOT NULL
        AND athlete_id IN (
            SELECT id FROM athletes WHERE auth_user_id = auth.uid()
        )
    );

-- ============================================================================
-- SIMILARITY SEARCH FUNCTION
-- ============================================================================

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
    WITH scored AS (
        SELECT
            e.*,
            (1 - (e.embedding <=> query_embedding))::FLOAT AS sim
        FROM embeddings e
    )
    SELECT
        s.id,
        s.content_type,
        s.title,
        s.content,
        s.metadata,
        s.sim AS similarity
    FROM scored s
    WHERE
        -- Content type filter
        (filter_content_type IS NULL OR s.content_type = filter_content_type)
        -- Athlete filter: shared knowledge (NULL) or specific athlete
        AND (
            s.athlete_id IS NULL
            OR s.athlete_id = filter_athlete_id
        )
        -- Similarity threshold
        AND s.sim > match_threshold
    ORDER BY s.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE embeddings IS 'Vector embeddings for RAG knowledge base and personal content';
COMMENT ON FUNCTION match_embeddings IS 'Semantic similarity search over embeddings with filtering';
