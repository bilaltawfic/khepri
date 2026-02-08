# Khepri Database Schema

This document describes the Supabase/PostgreSQL database schema for Khepri.

> **Last Updated**: 2026-02-08
> **Migration**: `supabase/migrations/001_initial_schema.sql`

## Entity Relationship Diagram

```mermaid
erDiagram
    auth_users ||--|| athletes : "has profile"
    athletes ||--o{ goals : "has many"
    athletes ||--o{ constraints : "has many"
    athletes ||--o{ daily_checkins : "has many"
    athletes ||--o{ training_plans : "has many"
    goals ||--o| training_plans : "targeted by"

    auth_users {
        uuid id PK "Supabase Auth"
    }

    athletes {
        uuid id PK
        uuid auth_user_id FK "UNIQUE, NOT NULL"
        text display_name
        date date_of_birth
        decimal weight_kg
        decimal height_cm
        int ftp_watts "Functional Threshold Power"
        int running_threshold_pace_sec_per_km
        int css_sec_per_100m "Critical Swim Speed"
        int resting_heart_rate
        int max_heart_rate
        int lthr "Lactate Threshold HR"
        text preferred_units "DEFAULT 'metric'"
        text timezone "DEFAULT 'UTC'"
        time daily_checkin_time "DEFAULT '07:00'"
        text intervals_icu_athlete_id
        bool intervals_icu_connected "DEFAULT false"
        timestamptz created_at "NOT NULL, DEFAULT NOW()"
        timestamptz updated_at "NOT NULL, auto-trigger"
    }

    goals {
        uuid id PK
        uuid athlete_id FK "NOT NULL"
        text goal_type "NOT NULL: race|performance|fitness|health"
        text title "NOT NULL"
        text description
        date target_date
        text priority "DEFAULT 'B': A|B|C"
        text status "DEFAULT 'active': active|completed|cancelled"
        text race_event_name
        text race_distance
        text race_location
        int race_target_time_seconds
        text perf_metric
        decimal perf_current_value
        decimal perf_target_value
        text fitness_metric
        decimal fitness_target_value
        text health_metric
        decimal health_current_value
        decimal health_target_value
        timestamptz created_at "NOT NULL, DEFAULT NOW()"
        timestamptz updated_at "NOT NULL, auto-trigger"
    }

    constraints {
        uuid id PK
        uuid athlete_id FK "NOT NULL"
        text constraint_type "NOT NULL: injury|travel|availability"
        text title "NOT NULL"
        text description
        date start_date "NOT NULL"
        date end_date "NULL = ongoing"
        text status "DEFAULT 'active': active|resolved"
        text injury_body_part
        text injury_severity "mild|moderate|severe"
        text_array injury_restrictions
        text travel_destination
        text_array travel_equipment_available
        text_array travel_facilities_available
        decimal availability_hours_per_week
        text_array availability_days_available
        timestamptz created_at "NOT NULL, DEFAULT NOW()"
        timestamptz updated_at "NOT NULL, auto-trigger"
    }

    daily_checkins {
        uuid id PK
        uuid athlete_id FK "NOT NULL"
        date checkin_date "NOT NULL, UNIQUE with athlete_id"
        int sleep_quality "1-10"
        decimal sleep_hours "0-24"
        int energy_level "1-10"
        int stress_level "1-10"
        int overall_soreness "1-10"
        jsonb soreness_areas "e.g. {legs: 7, back: 3}"
        int resting_hr
        decimal hrv_ms
        decimal weight_kg
        int available_time_minutes
        text_array equipment_access
        text travel_status "home|traveling|returning"
        text notes
        jsonb ai_recommendation "AI output blob"
        timestamptz ai_recommendation_generated_at
        text user_response "accepted|modified|skipped|alternative"
        text user_response_notes
        timestamptz created_at "NOT NULL, DEFAULT NOW()"
        timestamptz updated_at "NOT NULL, auto-trigger"
    }

    training_plans {
        uuid id PK
        uuid athlete_id FK "NOT NULL"
        text title "NOT NULL"
        text description
        int duration_weeks "NOT NULL, 4-52"
        date start_date "NOT NULL"
        date end_date "NOT NULL"
        uuid target_goal_id FK "nullable"
        text status "DEFAULT 'active': draft|active|paused|completed|cancelled"
        jsonb phases "NOT NULL, DEFAULT []"
        jsonb weekly_template "nullable"
        jsonb adjustments_log "NOT NULL, DEFAULT []"
        timestamptz created_at "NOT NULL, DEFAULT NOW()"
        timestamptz updated_at "NOT NULL, auto-trigger"
    }
```

## Tables Overview

| Table | Purpose | RLS |
|-------|---------|-----|
| `athletes` | Athlete profiles, fitness numbers, preferences | By `auth_user_id` |
| `goals` | Race, performance, fitness, health goals | Via `athlete_id` |
| `constraints` | Injuries, travel, availability changes | Via `athlete_id` |
| `daily_checkins` | Daily wellness + AI recommendations | Via `athlete_id` |
| `training_plans` | Periodized training plans | Via `athlete_id` |

## JSONB Columns

The schema uses JSONB for flexible/evolving structures:

| Table | Column | Structure | Rationale |
|-------|--------|-----------|-----------|
| `daily_checkins` | `soreness_areas` | `{legs: 7, back: 3, ...}` | Variable body parts, simple map |
| `daily_checkins` | `ai_recommendation` | Freeform AI output | Structure evolves with AI features |
| `training_plans` | `phases` | `[{name, start_week, end_week, focus, description}]` | Nested structure, read as unit |
| `training_plans` | `weekly_template` | `{monday: {sport, workout_type, duration, intensity}, ...}` | Template structure, read as unit |
| `training_plans` | `adjustments_log` | `[{date, reason, changes, ai_generated}]` | Append-only log |

## Timestamps

All tables use UTC timestamps with automatic management:

- **`created_at`**: Set automatically on INSERT via `DEFAULT NOW()`
- **`updated_at`**: Set automatically on UPDATE via database trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

## Row Level Security (RLS)

All tables have RLS enabled. Users can only access their own data:

- **`athletes`**: Filtered by `auth.uid() = auth_user_id`
- **Other tables**: Filtered by `athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid())`

## Indexes

```sql
-- Athletes
idx_athletes_auth_user_id ON athletes(auth_user_id)

-- Goals
idx_goals_athlete_id ON goals(athlete_id)
idx_goals_status ON goals(status)
idx_goals_target_date ON goals(target_date)

-- Constraints
idx_constraints_athlete_id ON constraints(athlete_id)
idx_constraints_status ON constraints(status)
idx_constraints_dates ON constraints(start_date, end_date)

-- Daily Check-ins
idx_daily_checkins_athlete_id ON daily_checkins(athlete_id)
idx_daily_checkins_date ON daily_checkins(checkin_date DESC)
idx_daily_checkins_athlete_date ON daily_checkins(athlete_id, checkin_date DESC)

-- Training Plans
idx_training_plans_athlete_id ON training_plans(athlete_id)
idx_training_plans_status ON training_plans(status)
idx_training_plans_dates ON training_plans(start_date, end_date)
```

## Enums (CHECK Constraints)

| Column | Valid Values |
|--------|--------------|
| `athletes.preferred_units` | `metric`, `imperial` |
| `goals.goal_type` | `race`, `performance`, `fitness`, `health` |
| `goals.priority` | `A`, `B`, `C` |
| `goals.status` | `active`, `completed`, `cancelled` |
| `constraints.constraint_type` | `injury`, `travel`, `availability` |
| `constraints.status` | `active`, `resolved` |
| `constraints.injury_severity` | `mild`, `moderate`, `severe` |
| `daily_checkins.travel_status` | `home`, `traveling`, `returning` |
| `daily_checkins.user_response` | `accepted`, `modified`, `skipped`, `alternative` |
| `training_plans.status` | `draft`, `active`, `paused`, `completed`, `cancelled` |
