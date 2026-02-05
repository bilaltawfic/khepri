-- Khepri Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Creates core tables for athlete profiles, goals, constraints, daily check-ins, and training plans
--
-- This schema is based on the data models defined in claude-plan.md

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ATHLETES TABLE
-- Stores athlete profile, fitness numbers, and preferences
-- ============================================================================
CREATE TABLE athletes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Profile Information
    display_name TEXT,
    date_of_birth DATE,
    weight_kg DECIMAL(5, 2),
    height_cm DECIMAL(5, 2),

    -- Current Fitness Numbers (all optional, can sync from Intervals.icu)
    ftp_watts INTEGER,                          -- Functional Threshold Power in watts
    running_threshold_pace_sec_per_km INTEGER,  -- Running threshold pace in seconds per km
    css_sec_per_100m INTEGER,                   -- Critical Swim Speed in seconds per 100m
    resting_heart_rate INTEGER,                 -- Resting heart rate in bpm
    max_heart_rate INTEGER,                     -- Maximum heart rate in bpm
    lthr INTEGER,                               -- Lactate Threshold Heart Rate in bpm

    -- Preferences
    preferred_units TEXT DEFAULT 'metric' CHECK (preferred_units IN ('metric', 'imperial')),
    timezone TEXT DEFAULT 'UTC',
    daily_checkin_time TIME DEFAULT '07:00:00',

    -- Intervals.icu Connection (encrypted API key stored separately in Supabase Vault)
    intervals_icu_athlete_id TEXT,
    intervals_icu_connected BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by auth user
CREATE INDEX idx_athletes_auth_user_id ON athletes(auth_user_id);

-- ============================================================================
-- GOALS TABLE
-- Stores race goals, performance goals, fitness goals, and health goals
-- ============================================================================
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    -- Goal Type
    goal_type TEXT NOT NULL CHECK (goal_type IN ('race', 'performance', 'fitness', 'health')),

    -- Common Fields
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    priority TEXT DEFAULT 'B' CHECK (priority IN ('A', 'B', 'C')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),

    -- Race Goal Specific Fields
    race_event_name TEXT,
    race_distance TEXT,                         -- e.g., "70.3", "marathon", "olympic"
    race_location TEXT,
    race_target_time_seconds INTEGER,           -- Target finish time in seconds

    -- Performance Goal Specific Fields
    perf_metric TEXT,                           -- e.g., "ftp", "threshold_pace", "css"
    perf_current_value DECIMAL(10, 2),
    perf_target_value DECIMAL(10, 2),

    -- Fitness Goal Specific Fields
    fitness_metric TEXT,                        -- e.g., "weekly_volume_km", "consistency"
    fitness_target_value DECIMAL(10, 2),

    -- Health Goal Specific Fields
    health_metric TEXT,                         -- e.g., "weight_kg", "body_fat_percentage"
    health_current_value DECIMAL(10, 2),
    health_target_value DECIMAL(10, 2),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by athlete
CREATE INDEX idx_goals_athlete_id ON goals(athlete_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_target_date ON goals(target_date);

-- ============================================================================
-- CONSTRAINTS TABLE
-- Stores injuries, travel periods, and availability changes
-- ============================================================================
CREATE TABLE constraints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    -- Constraint Type
    constraint_type TEXT NOT NULL CHECK (constraint_type IN ('injury', 'travel', 'availability')),

    -- Common Fields
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,                              -- NULL means ongoing
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved')),

    -- Injury Specific Fields
    injury_body_part TEXT,                      -- e.g., "left_knee", "lower_back", "right_shoulder"
    injury_severity TEXT CHECK (injury_severity IN ('mild', 'moderate', 'severe')),
    injury_restrictions TEXT[],                 -- Array of restricted activities

    -- Travel Specific Fields
    travel_destination TEXT,
    travel_equipment_available TEXT[],          -- e.g., ["running_shoes", "swim_goggles"]
    travel_facilities_available TEXT[],         -- e.g., ["gym", "pool", "outdoor_running"]

    -- Availability Specific Fields
    availability_hours_per_week DECIMAL(4, 1),  -- Reduced hours available
    availability_days_available TEXT[],         -- e.g., ["monday", "wednesday", "friday"]

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by athlete
CREATE INDEX idx_constraints_athlete_id ON constraints(athlete_id);
CREATE INDEX idx_constraints_status ON constraints(status);
CREATE INDEX idx_constraints_dates ON constraints(start_date, end_date);

-- ============================================================================
-- DAILY_CHECKINS TABLE
-- Stores wellness metrics and context for daily AI recommendations
-- ============================================================================
CREATE TABLE daily_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    -- Check-in Date (one per day per athlete)
    checkin_date DATE NOT NULL,

    -- Wellness Metrics (1-10 scale)
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
    sleep_hours DECIMAL(3, 1) CHECK (sleep_hours BETWEEN 0 AND 24),
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
    stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
    overall_soreness INTEGER CHECK (overall_soreness BETWEEN 1 AND 10),

    -- Specific Soreness (body map)
    soreness_areas JSONB,                       -- e.g., {"legs": 7, "back": 3, "shoulders": 2}

    -- Objective Data
    resting_hr INTEGER,
    hrv_ms DECIMAL(5, 1),                       -- Heart Rate Variability in milliseconds
    weight_kg DECIMAL(5, 2),

    -- Context for Today
    available_time_minutes INTEGER,
    equipment_access TEXT[],                    -- e.g., ["bike_trainer", "treadmill", "pool"]
    travel_status TEXT CHECK (travel_status IN ('home', 'traveling', 'returning')),
    notes TEXT,

    -- AI-Generated Recommendation
    ai_recommendation JSONB,                    -- Stored recommendation from AI
    ai_recommendation_generated_at TIMESTAMPTZ,

    -- User's Choice
    user_response TEXT CHECK (user_response IN ('accepted', 'modified', 'skipped', 'alternative')),
    user_response_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one check-in per day per athlete
    UNIQUE(athlete_id, checkin_date)
);

-- Index for quick lookup by athlete and date
CREATE INDEX idx_daily_checkins_athlete_id ON daily_checkins(athlete_id);
CREATE INDEX idx_daily_checkins_date ON daily_checkins(checkin_date DESC);
CREATE INDEX idx_daily_checkins_athlete_date ON daily_checkins(athlete_id, checkin_date DESC);

-- ============================================================================
-- TRAINING_PLANS TABLE (Optional structured plans)
-- Stores periodized training plans with phases
-- ============================================================================
CREATE TABLE training_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    -- Plan Info
    title TEXT NOT NULL,
    description TEXT,
    duration_weeks INTEGER NOT NULL CHECK (duration_weeks BETWEEN 4 AND 52),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Target Goal (if any)
    target_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

    -- Plan Status
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),

    -- Periodization Phases
    -- Each phase is an object with: name, start_week, end_week, focus, description
    phases JSONB NOT NULL DEFAULT '[]',

    -- Weekly Structure Template
    -- Template for typical week structure
    weekly_template JSONB,

    -- Adjustments Log
    -- Array of adjustments made to the plan
    adjustments_log JSONB NOT NULL DEFAULT '[]',

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by athlete
CREATE INDEX idx_training_plans_athlete_id ON training_plans(athlete_id);
CREATE INDEX idx_training_plans_status ON training_plans(status);
CREATE INDEX idx_training_plans_dates ON training_plans(start_date, end_date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Users can only access their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;

-- Athletes: Users can only access their own athlete profile
CREATE POLICY "Users can view their own athlete profile"
    ON athletes FOR SELECT
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own athlete profile"
    ON athletes FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own athlete profile"
    ON athletes FOR UPDATE
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own athlete profile"
    ON athletes FOR DELETE
    USING (auth.uid() = auth_user_id);

-- Goals: Users can only access goals linked to their athlete profile
CREATE POLICY "Users can view their own goals"
    ON goals FOR SELECT
    USING (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own goals"
    ON goals FOR INSERT
    WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own goals"
    ON goals FOR UPDATE
    USING (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()))
    WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own goals"
    ON goals FOR DELETE
    USING (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

-- Constraints: Users can only access constraints linked to their athlete profile
CREATE POLICY "Users can view their own constraints"
    ON constraints FOR SELECT
    USING (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own constraints"
    ON constraints FOR INSERT
    WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own constraints"
    ON constraints FOR UPDATE
    USING (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()))
    WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own constraints"
    ON constraints FOR DELETE
    USING (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

-- Daily Check-ins: Users can only access check-ins linked to their athlete profile
CREATE POLICY "Users can view their own daily check-ins"
    ON daily_checkins FOR SELECT
    USING (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own daily check-ins"
    ON daily_checkins FOR INSERT
    WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own daily check-ins"
    ON daily_checkins FOR UPDATE
    USING (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()))
    WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own daily check-ins"
    ON daily_checkins FOR DELETE
    USING (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

-- Training Plans: Users can only access plans linked to their athlete profile
CREATE POLICY "Users can view their own training plans"
    ON training_plans FOR SELECT
    USING (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own training plans"
    ON training_plans FOR INSERT
    WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own training plans"
    ON training_plans FOR UPDATE
    USING (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()))
    WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own training plans"
    ON training_plans FOR DELETE
    USING (athlete_id IN (SELECT id FROM athletes WHERE auth_user_id = auth.uid()));

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_athletes_updated_at
    BEFORE UPDATE ON athletes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_constraints_updated_at
    BEFORE UPDATE ON constraints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_checkins_updated_at
    BEFORE UPDATE ON daily_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_plans_updated_at
    BEFORE UPDATE ON training_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE athletes IS 'Athlete profiles with fitness numbers and preferences';
COMMENT ON TABLE goals IS 'Race, performance, fitness, and health goals';
COMMENT ON TABLE constraints IS 'Injuries, travel periods, and availability changes';
COMMENT ON TABLE daily_checkins IS 'Daily wellness check-ins with AI recommendations';
COMMENT ON TABLE training_plans IS 'Optional structured periodized training plans';
