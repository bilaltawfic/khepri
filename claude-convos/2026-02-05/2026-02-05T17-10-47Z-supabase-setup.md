# Session: Supabase Backend Setup (Workstream B)

**Date:** 2026-02-05T17:10:47Z
**Duration:** ~15 minutes
**Agent(s) Used:** Claude Code (Claude Opus 4.5)

## Goal

Set up Supabase infrastructure for the Khepri project as part of Phase 1 Workstream B. This includes creating the database schema, migrations, RLS policies, and configuration files for local development.

## Key Prompts & Responses

### Initial Request

The task was to set up the Supabase backend infrastructure based on the data models defined in `claude-plan.md`:

1. Create directory structure: `supabase/config.toml`, `migrations/`, `functions/`, `seed/`
2. Create initial schema with all core tables (athletes, goals, constraints, daily_checkins, training_plans)
3. Enable RLS on all tables with user-isolation policies
4. Create environment template (`.env.example`)
5. Create seed data with example structures

### Implementation Decisions

**Database Schema Design:**
- Used UUID primary keys with `uuid_generate_v4()` for all tables
- Linked all data to `auth.users` through the `athletes` table
- Created comprehensive RLS policies that use subqueries to check athlete ownership
- Added automatic `updated_at` triggers for all tables
- Used JSONB for flexible data like `soreness_areas`, `ai_recommendation`, `phases`, `weekly_template`, and `adjustments_log`

**Table Design Highlights:**

1. **athletes** - Central profile table linked to Supabase Auth
   - Stores fitness numbers (FTP, threshold pace, CSS, heart rates)
   - Preferences (units, timezone, check-in time)
   - Intervals.icu connection status

2. **goals** - Polymorphic goal tracking
   - Single table with `goal_type` discriminator (race, performance, fitness, health)
   - Type-specific fields (race_*, perf_*, fitness_*, health_*)
   - Priority levels (A/B/C) and status tracking

3. **constraints** - Training limitations
   - Injury tracking with body part, severity, and restrictions
   - Travel periods with equipment/facility availability
   - Availability changes with hours/days specifications

4. **daily_checkins** - Daily wellness and AI recommendations
   - Wellness metrics (sleep, energy, stress, soreness)
   - Objective data (HR, HRV, weight)
   - Context (time, equipment, travel status)
   - AI recommendation storage with user response tracking
   - Unique constraint on (athlete_id, checkin_date)

5. **training_plans** - Optional structured periodization
   - Phases as JSONB array for flexibility
   - Weekly template structure
   - Adjustments log for plan modifications

**RLS Policy Strategy:**
- All tables use policies that check if the `athlete_id` belongs to the current authenticated user
- Athletes table uses direct `auth.uid() = auth_user_id` check
- Other tables use subquery: `athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid())`
- Full CRUD policies (SELECT, INSERT, UPDATE, DELETE) for user's own data

## Outcome

**Files Created:**
- `/Users/btawfic/Source/Khepri/supabase/config.toml` - Local Supabase development configuration
- `/Users/btawfic/Source/Khepri/supabase/migrations/001_initial_schema.sql` - Full database schema with RLS
- `/Users/btawfic/Source/Khepri/supabase/seed/seed.sql` - Example data structures (commented)
- `/Users/btawfic/Source/Khepri/supabase/functions/.gitkeep` - Placeholder for Edge Functions
- `/Users/btawfic/Source/Khepri/.env.example` - Environment variable template

**Pull Request:**
- Branch: `feat/supabase-setup`
- PR: https://github.com/bilaltawfic/khepri/pull/4 (draft)
- Commit: `feat(supabase): add initial database schema and migrations`

## Learnings

1. **RLS Policy Design:** Using subqueries in RLS policies is necessary when the ownership check requires joining through another table (athletes -> other tables).

2. **JSONB for Flexibility:** Using JSONB for complex, variable-structure data (like training phases, soreness body maps, AI recommendations) provides flexibility while maintaining queryability.

3. **Unique Constraints:** The `UNIQUE(athlete_id, checkin_date)` constraint on daily_checkins prevents duplicate check-ins per day per athlete.

4. **Migration Naming:** Prefixing migrations with numbers (001_, 002_) ensures consistent ordering.

5. **Seed Data Strategy:** Keeping seed data commented out but complete allows developers to see the data structure without accidentally populating the database.

## Next Steps

1. Run `supabase start` locally to test the configuration
2. Apply migrations with `supabase db reset`
3. Create a test user and verify RLS policies work correctly
4. Integrate with the mobile app (Phase 2)
