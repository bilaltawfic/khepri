-- ============================================================
-- 013_season_goals_and_sync.sql — Link goals to seasons + sync state
-- ============================================================

-- Add season_id to goals with composite FK enforcing same-athlete ownership
ALTER TABLE goals ADD COLUMN season_id UUID;
ALTER TABLE goals
  ADD CONSTRAINT goals_season_fk
  FOREIGN KEY (season_id, athlete_id)
  REFERENCES seasons(id, athlete_id)
  ON DELETE SET NULL (season_id);
CREATE INDEX idx_goals_season ON goals(season_id);

-- Add Intervals.icu sync state to athletes
-- Note: intervals_icu_athlete_id already exists in 001_initial_schema.sql — reuse it
ALTER TABLE athletes ADD COLUMN intervals_webhook_registered BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_activities TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_events TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN intervals_last_synced_wellness TIMESTAMPTZ;
