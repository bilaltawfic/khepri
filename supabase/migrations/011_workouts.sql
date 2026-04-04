-- ============================================================
-- 011_workouts.sql — Individual workout sessions
-- ============================================================

CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES race_blocks(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number >= 1),
  name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('swim', 'bike', 'run', 'strength', 'rest')),
  workout_type TEXT,
  planned_duration_minutes INTEGER NOT NULL CHECK (planned_duration_minutes >= 0),
  planned_tss NUMERIC(6,1),
  planned_distance_meters INTEGER,
  structure JSONB NOT NULL,
  description_dsl TEXT NOT NULL DEFAULT '',
  intervals_target TEXT NOT NULL DEFAULT 'AUTO'
    CHECK (intervals_target IN ('POWER', 'PACE', 'HR', 'AUTO')),
  sync_status TEXT NOT NULL DEFAULT 'not_connected'
    CHECK (sync_status IN ('pending', 'synced', 'conflict', 'not_connected')),
  external_id TEXT NOT NULL,
  intervals_event_id TEXT,
  actual_duration_minutes INTEGER,
  actual_tss NUMERIC(6,1),
  actual_distance_meters INTEGER,
  actual_avg_power INTEGER,
  actual_avg_pace_sec_per_km NUMERIC(6,1),
  actual_avg_hr INTEGER,
  completed_at TIMESTAMPTZ,
  intervals_activity_id TEXT,
  compliance JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workouts_block ON workouts(block_id);
CREATE INDEX idx_workouts_athlete_date ON workouts(athlete_id, date);
CREATE UNIQUE INDEX idx_workouts_unique_external ON workouts(external_id);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY workouts_athlete_access ON workouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM athletes WHERE athletes.id = workouts.athlete_id
            AND athletes.auth_user_id = auth.uid())
  );

CREATE TRIGGER workouts_updated_at BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
