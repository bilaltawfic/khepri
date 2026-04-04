-- ============================================================
-- 013_season_goals_and_sync.sql — Link goals to seasons + sync state
-- ============================================================

-- Add season_id to goals (nullable for backwards compatibility)
ALTER TABLE goals ADD COLUMN season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;
CREATE INDEX idx_goals_season ON goals(season_id);

-- Add Intervals.icu sync state to athletes
ALTER TABLE athletes ADD COLUMN intervals_athlete_id TEXT;
ALTER TABLE athletes ADD COLUMN intervals_webhook_registered BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_activities TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_events TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_wellness TIMESTAMPTZ;
