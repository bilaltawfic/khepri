# P9-A-01 to P9-A-07: Database Migrations for Season-Based Planning

## Date
2026-04-04

## Goals
- Create 4 SQL migrations adding `seasons`, `race_blocks`, `workouts`, `plan_adaptations`, `sync_log` tables
- Alter `goals` table to add `season_id` FK
- Alter `athletes` table to add Intervals.icu sync columns

## Key Decisions

1. **4 migration files** grouping related tables:
   - `010_seasons.sql` — seasons + race_blocks (core planning structure)
   - `011_workouts.sql` — workouts (individual sessions)
   - `012_plan_adaptations.sql` — plan_adaptations + sync_log (audit trail)
   - `013_season_goals_and_sync.sql` — goals FK + athletes sync columns (alterations)

2. **Reused existing `update_updated_at_column()` trigger** from `001_initial_schema.sql`

3. **RLS policies** use `EXISTS` subquery pattern matching the new tables' conventions (single `FOR ALL` policy per table)

4. **RLS enabled on `sync_log` with a service-role-only policy** — only accessed by Edge Functions via service role

5. **One-active-season constraint** via partial unique index on `(athlete_id) WHERE status = 'active'`

6. **`external_id` on workouts** — unique constraint for Intervals.icu sync deduplication

## Files Changed
- `supabase/migrations/010_seasons.sql` (new)
- `supabase/migrations/011_workouts.sql` (new)
- `supabase/migrations/012_plan_adaptations.sql` (new)
- `supabase/migrations/013_season_goals_and_sync.sql` (new)

## Learnings
- Pre-existing mobile test failures (missing `react-native-keyboard-controller`) and typecheck failures (missing `expo-notifications`) exist on main — not related to this migration work
- SQL migrations are pure database changes with no TypeScript impact, so lint/build/non-mobile tests are sufficient validation
