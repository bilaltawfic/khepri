-- Khepri Conversations Schema
-- Migration: 002_conversations.sql
-- Description: Creates tables for AI coach conversations and message history
--
-- This schema supports storing chat conversations between athletes and the AI coach

-- ============================================================================
-- CONVERSATIONS TABLE
-- Stores chat conversation metadata and links to athletes
-- ============================================================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    -- Conversation metadata
    title TEXT,                                     -- Optional summary/title
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_archived BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,             -- Extensible metadata storage

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- MESSAGES TABLE
-- Stores individual messages within conversations
-- ============================================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- Message content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,

    -- Token usage tracking (for assistant messages)
    prompt_tokens INTEGER,
    completion_tokens INTEGER,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- Optimize common query patterns
-- ============================================================================

-- Conversations: lookup by athlete with recency ordering (composite for efficient ORDER BY)
CREATE INDEX idx_conversations_athlete ON conversations(athlete_id);
CREATE INDEX idx_conversations_athlete_last_message ON conversations(athlete_id, last_message_at DESC);
CREATE INDEX idx_conversations_athlete_last_message_active ON conversations(athlete_id, last_message_at DESC)
    WHERE is_archived = false;

-- Messages: lookup by conversation, order by creation time
-- Note: composite index covers single-column lookups, so no separate idx_messages_conversation needed
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Users can only access conversations and messages for their athlete profile
-- ============================================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations: SELECT - users can view their own conversations
-- Uses EXISTS with join to athletes table since athlete_id references athletes.id
CREATE POLICY "Users can view own conversations"
    ON conversations FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM athletes
        WHERE athletes.id = conversations.athlete_id
        AND athletes.auth_user_id = auth.uid()
    ));

-- Conversations: INSERT - users can create conversations for their athlete profile
CREATE POLICY "Users can insert own conversations"
    ON conversations FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM athletes
        WHERE athletes.id = conversations.athlete_id
        AND athletes.auth_user_id = auth.uid()
    ));

-- Conversations: UPDATE - users can update their own conversations
CREATE POLICY "Users can update own conversations"
    ON conversations FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM athletes
        WHERE athletes.id = conversations.athlete_id
        AND athletes.auth_user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM athletes
        WHERE athletes.id = conversations.athlete_id
        AND athletes.auth_user_id = auth.uid()
    ));

-- Conversations: DELETE - users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
    ON conversations FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM athletes
        WHERE athletes.id = conversations.athlete_id
        AND athletes.auth_user_id = auth.uid()
    ));

-- Messages: SELECT - users can view messages in their own conversations
CREATE POLICY "Users can view messages in own conversations"
    ON messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM conversations c
        JOIN athletes a ON a.id = c.athlete_id
        WHERE c.id = messages.conversation_id
        AND a.auth_user_id = auth.uid()
    ));

-- Messages: INSERT - users can add messages to their own conversations
CREATE POLICY "Users can insert messages in own conversations"
    ON messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM conversations c
        JOIN athletes a ON a.id = c.athlete_id
        WHERE c.id = messages.conversation_id
        AND a.auth_user_id = auth.uid()
    ));

-- Messages: UPDATE - users can update messages in their own conversations
CREATE POLICY "Users can update messages in own conversations"
    ON messages FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM conversations c
        JOIN athletes a ON a.id = c.athlete_id
        WHERE c.id = messages.conversation_id
        AND a.auth_user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM conversations c
        JOIN athletes a ON a.id = c.athlete_id
        WHERE c.id = messages.conversation_id
        AND a.auth_user_id = auth.uid()
    ));

-- Messages: DELETE - users can delete messages in their own conversations
CREATE POLICY "Users can delete messages in own conversations"
    ON messages FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM conversations c
        JOIN athletes a ON a.id = c.athlete_id
        WHERE c.id = messages.conversation_id
        AND a.auth_user_id = auth.uid()
    ));

-- ============================================================================
-- TRIGGERS
-- Automatically update timestamps
-- ============================================================================

-- Use existing update_updated_at_column function from 001_initial_schema.sql
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation's last_message_at when a new message is inserted
-- Note: updated_at is not set here because the BEFORE UPDATE trigger on conversations
-- will automatically set it to NOW() via update_updated_at_column()
CREATE OR REPLACE FUNCTION update_conversation_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update last_message_at when messages are inserted
-- Note: For MVP, we only track on INSERT. If messages are DELETE'd/UPDATE'd with
-- older timestamps, last_message_at may become stale. Future enhancement could add
-- DELETE/UPDATE triggers that recompute MAX(created_at) for the conversation.
CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message_at();

-- ============================================================================
-- COMMENTS
-- Documentation for the schema
-- ============================================================================

COMMENT ON TABLE conversations IS 'AI coach chat conversations with athletes';
COMMENT ON TABLE messages IS 'Individual messages within conversations';

COMMENT ON COLUMN conversations.title IS 'Optional summary or title for the conversation';
COMMENT ON COLUMN conversations.last_message_at IS 'Timestamp of the most recent message, for sorting (auto-updated via trigger)';
COMMENT ON COLUMN conversations.is_archived IS 'Whether the conversation is archived (hidden from default view)';
COMMENT ON COLUMN conversations.metadata IS 'Extensible JSON metadata for future use';

COMMENT ON COLUMN messages.role IS 'Message sender: user, assistant, or system';
COMMENT ON COLUMN messages.prompt_tokens IS 'Number of input tokens used (for AI responses)';
COMMENT ON COLUMN messages.completion_tokens IS 'Number of output tokens generated (for AI responses)';
