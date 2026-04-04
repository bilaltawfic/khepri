-- ============================================================
-- 012_plan_adaptations.sql — Audit trail + sync log
-- ============================================================

CREATE TABLE plan_adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES race_blocks(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL
    CHECK (trigger IN ('coach_suggestion', 'athlete_request', 'block_review', 'external_sync')),
  status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'accepted', 'rejected', 'rolled_back')),
  affected_workouts JSONB NOT NULL DEFAULT '[]',
  reason TEXT NOT NULL,
  context JSONB,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by TEXT CHECK (rolled_back_by IN ('support', 'athlete') OR rolled_back_by IS NULL),
  rollback_adaptation_id UUID REFERENCES plan_adaptations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_adaptations_block ON plan_adaptations(block_id);
CREATE INDEX idx_adaptations_athlete ON plan_adaptations(athlete_id, created_at DESC);

ALTER TABLE plan_adaptations ENABLE ROW LEVEL SECURITY;
CREATE POLICY adaptations_athlete_access ON plan_adaptations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM athletes WHERE athletes.id = plan_adaptations.athlete_id
            AND athletes.auth_user_id = auth.uid())
  );

CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('push', 'pull')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('workout', 'activity', 'wellness', 'event')),
  resource_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'match')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'conflict')),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_log_athlete ON sync_log(athlete_id, created_at DESC);

-- No RLS on sync_log — accessed by Edge Functions via service role only
