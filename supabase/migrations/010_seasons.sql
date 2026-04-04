-- ============================================================
-- 010_seasons.sql — Season-based planning tables
-- ============================================================

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived')),
  preferences JSONB NOT NULL DEFAULT '{}',
  skeleton JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT seasons_date_range CHECK (end_date >= start_date)
);

-- One active season per athlete
CREATE UNIQUE INDEX idx_seasons_one_active
  ON seasons (athlete_id)
  WHERE status = 'active';

-- RLS
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY seasons_athlete_access ON seasons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM athletes WHERE athletes.id = seasons.athlete_id
            AND athletes.auth_user_id = auth.uid())
  );

CREATE TABLE race_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_weeks INTEGER NOT NULL CHECK (total_weeks BETWEEN 1 AND 52),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'locked', 'in_progress', 'completed', 'cancelled')),
  phases JSONB NOT NULL DEFAULT '[]',
  locked_at TIMESTAMPTZ,
  pushed_to_intervals_at TIMESTAMPTZ,
  weekly_compliance JSONB NOT NULL DEFAULT '[]',
  overall_compliance JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT race_blocks_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_race_blocks_season ON race_blocks(season_id);
CREATE INDEX idx_race_blocks_athlete_status ON race_blocks(athlete_id, status);

ALTER TABLE race_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY race_blocks_athlete_access ON race_blocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM athletes WHERE athletes.id = race_blocks.athlete_id
            AND athletes.auth_user_id = auth.uid())
  );

-- Use existing trigger function from 001_initial_schema.sql
CREATE TRIGGER seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER race_blocks_updated_at BEFORE UPDATE ON race_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
