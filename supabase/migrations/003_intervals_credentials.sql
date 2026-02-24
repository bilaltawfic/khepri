-- Khepri: Encrypted Intervals.icu Credentials
-- Migration: 003_intervals_credentials.sql
-- Description: Stores encrypted API credentials for Intervals.icu per athlete.
--   API keys are encrypted server-side using AES-GCM before storage.

-- ============================================================================
-- INTERVALS_CREDENTIALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS intervals_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    intervals_athlete_id TEXT NOT NULL,
    encrypted_api_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each athlete can only have one set of credentials
    UNIQUE(athlete_id)
);

-- Index for quick lookup by athlete
CREATE INDEX IF NOT EXISTS idx_intervals_credentials_athlete
    ON intervals_credentials(athlete_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE intervals_credentials ENABLE ROW LEVEL SECURITY;

-- Athletes can only see/manage their own credentials
CREATE POLICY "Athletes can view own credentials"
    ON intervals_credentials FOR SELECT
    USING (
        athlete_id IN (
            SELECT id FROM athletes WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Athletes can insert own credentials"
    ON intervals_credentials FOR INSERT
    WITH CHECK (
        athlete_id IN (
            SELECT id FROM athletes WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Athletes can update own credentials"
    ON intervals_credentials FOR UPDATE
    USING (
        athlete_id IN (
            SELECT id FROM athletes WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Athletes can delete own credentials"
    ON intervals_credentials FOR DELETE
    USING (
        athlete_id IN (
            SELECT id FROM athletes WHERE auth_user_id = auth.uid()
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER update_intervals_credentials_updated_at
    BEFORE UPDATE ON intervals_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE intervals_credentials IS 'Encrypted Intervals.icu API credentials per athlete';
