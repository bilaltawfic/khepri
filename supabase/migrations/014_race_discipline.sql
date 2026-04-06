-- Add race_discipline column to goals table.
-- Stores the race discipline explicitly (triathlon, duathlon, aquathlon, running, cycling, swimming).
-- Previously the sport was inferred from race_distance; now it is a first-class field.
-- Nullable for non-race goals (goal_type != 'race').

ALTER TABLE goals
  ADD COLUMN race_discipline TEXT
  CONSTRAINT goals_race_discipline_check
  CHECK (
    race_discipline IS NULL OR
    race_discipline IN ('triathlon', 'duathlon', 'aquathlon', 'running', 'cycling', 'swimming')
  );

COMMENT ON COLUMN goals.race_discipline IS 'Race discipline: triathlon, duathlon, aquathlon, running, cycling, swimming. NULL for non-race goals.';
