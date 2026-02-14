-- Khepri Seed Data
-- This file contains example data structures for development and testing
-- All data is commented out - uncomment and modify as needed for local testing
--
-- IMPORTANT: This seed data requires an authenticated user in Supabase Auth
-- Run this after creating a test user through the Auth UI or API

-- ============================================================================
-- EXAMPLE ATHLETE PROFILE
-- ============================================================================
-- To use: Replace 'YOUR_AUTH_USER_UUID' with an actual auth.users UUID

/*
INSERT INTO athletes (
    auth_user_id,
    display_name,
    date_of_birth,
    weight_kg,
    height_cm,
    ftp_watts,
    running_threshold_pace_sec_per_km,
    css_sec_per_100m,
    resting_heart_rate,
    max_heart_rate,
    lthr,
    preferred_units,
    timezone,
    daily_checkin_time,
    intervals_icu_connected
) VALUES (
    'YOUR_AUTH_USER_UUID',                      -- Replace with actual UUID
    'John Doe',
    '1985-06-15',
    75.5,
    180,
    250,                                         -- FTP: 250 watts
    270,                                         -- Threshold pace: 4:30/km (270 seconds)
    95,                                          -- CSS: 1:35/100m (95 seconds)
    52,                                          -- Resting HR: 52 bpm
    185,                                         -- Max HR: 185 bpm
    165,                                         -- LTHR: 165 bpm
    'metric',
    'America/New_York',
    '06:30:00',
    false
);
*/

-- ============================================================================
-- EXAMPLE GOALS
-- ============================================================================
-- Requires an athlete_id from the athletes table above

/*
-- Race Goal: Ironman 70.3
INSERT INTO goals (
    athlete_id,
    goal_type,
    title,
    description,
    target_date,
    priority,
    status,
    race_event_name,
    race_distance,
    race_location,
    race_target_time_seconds
) VALUES (
    (SELECT id FROM athletes WHERE display_name = 'John Doe'),
    'race',
    'Complete Ironman 70.3 Chattanooga',
    'My first half-distance triathlon',
    '2026-05-17',
    'A',
    'active',
    'Ironman 70.3 Chattanooga',
    '70.3',
    'Chattanooga, TN',
    21600                                        -- Target: 6 hours (21600 seconds)
);

-- Performance Goal: Improve FTP
INSERT INTO goals (
    athlete_id,
    goal_type,
    title,
    description,
    target_date,
    priority,
    status,
    perf_metric,
    perf_current_value,
    perf_target_value
) VALUES (
    (SELECT id FROM athletes WHERE display_name = 'John Doe'),
    'performance',
    'Increase FTP to 280W',
    'Build cycling power for better bike split',
    '2026-04-01',
    'B',
    'active',
    'ftp',
    250,
    280
);

-- Fitness Goal: Run consistency
INSERT INTO goals (
    athlete_id,
    goal_type,
    title,
    description,
    target_date,
    priority,
    status,
    fitness_metric,
    fitness_target_value
) VALUES (
    (SELECT id FROM athletes WHERE display_name = 'John Doe'),
    'fitness',
    'Build run base to 40km/week',
    'Consistent weekly run volume without injury',
    '2026-03-15',
    'B',
    'active',
    'weekly_run_km',
    40
);
*/

-- ============================================================================
-- EXAMPLE CONSTRAINTS
-- ============================================================================
-- Requires an athlete_id from the athletes table above

/*
-- Active Injury
INSERT INTO constraints (
    athlete_id,
    constraint_type,
    title,
    description,
    start_date,
    end_date,
    status,
    injury_body_part,
    injury_severity,
    injury_restrictions
) VALUES (
    (SELECT id FROM athletes WHERE display_name = 'John Doe'),
    'injury',
    'Left knee tendinitis',
    'Mild IT band irritation from overtraining',
    '2026-02-01',
    NULL,                                        -- Ongoing
    'active',
    'left_knee',
    'mild',
    ARRAY['high_intensity_running', 'hill_repeats', 'long_runs_over_90min']
);

-- Upcoming Travel
INSERT INTO constraints (
    athlete_id,
    constraint_type,
    title,
    description,
    start_date,
    end_date,
    status,
    travel_destination,
    travel_equipment_available,
    travel_facilities_available
) VALUES (
    (SELECT id FROM athletes WHERE display_name = 'John Doe'),
    'travel',
    'Business trip to San Francisco',
    'Conference travel, hotel has basic gym',
    '2026-02-20',
    '2026-02-25',
    'active',
    'San Francisco, CA',
    ARRAY['running_shoes', 'swim_goggles', 'resistance_bands'],
    ARRAY['hotel_gym', 'outdoor_running']
);
*/

-- ============================================================================
-- EXAMPLE DAILY CHECK-INS
-- ============================================================================
-- Requires an athlete_id from the athletes table above

/*
-- Yesterday's check-in
INSERT INTO daily_checkins (
    athlete_id,
    checkin_date,
    sleep_quality,
    sleep_hours,
    energy_level,
    stress_level,
    overall_soreness,
    soreness_areas,
    resting_hr,
    hrv_ms,
    weight_kg,
    available_time_minutes,
    equipment_access,
    travel_status,
    notes,
    ai_recommendation,
    ai_recommendation_generated_at,
    user_response
) VALUES (
    (SELECT id FROM athletes WHERE display_name = 'John Doe'),
    CURRENT_DATE - INTERVAL '1 day',
    7,
    7.5,
    6,
    4,
    5,
    '{"legs": 6, "back": 3, "shoulders": 2}'::jsonb,
    54,
    48.5,
    75.2,
    90,
    ARRAY['bike_trainer', 'treadmill'],
    'home',
    'Felt a bit tired from yesterday''s interval session',
    '{
        "workout_type": "easy_run",
        "duration_minutes": 45,
        "intensity": "zone_2",
        "description": "Easy aerobic run to promote recovery",
        "rationale": "Your elevated soreness and moderate energy suggest keeping today easy. Zone 2 will maintain fitness while allowing recovery from yesterday''s hard effort."
    }'::jsonb,
    NOW() - INTERVAL '1 day',
    'accepted'
);

-- Today's check-in (no recommendation yet)
INSERT INTO daily_checkins (
    athlete_id,
    checkin_date,
    sleep_quality,
    sleep_hours,
    energy_level,
    stress_level,
    overall_soreness,
    soreness_areas,
    resting_hr,
    available_time_minutes,
    equipment_access,
    travel_status,
    notes
) VALUES (
    (SELECT id FROM athletes WHERE display_name = 'John Doe'),
    CURRENT_DATE,
    8,
    8.0,
    7,
    3,
    3,
    '{"legs": 3, "back": 2}'::jsonb,
    52,
    120,
    ARRAY['bike_trainer', 'treadmill', 'pool'],
    'home',
    'Feeling fresh after good sleep. Ready for a quality session!'
);
*/

-- ============================================================================
-- EXAMPLE TRAINING PLAN
-- ============================================================================
-- Requires an athlete_id and optionally a goal_id

/*
INSERT INTO training_plans (
    athlete_id,
    name,
    description,
    total_weeks,
    start_date,
    end_date,
    goal_id,
    status,
    periodization,
    weekly_template,
    adaptations
) VALUES (
    (SELECT id FROM athletes WHERE display_name = 'John Doe'),
    '16-Week 70.3 Build',
    'Periodized plan building to Ironman 70.3 Chattanooga',
    16,
    '2026-01-27',
    '2026-05-17',
    (SELECT id FROM goals WHERE title = 'Complete Ironman 70.3 Chattanooga'),
    'active',
    '[
        {
            "name": "Base Building",
            "start_week": 1,
            "end_week": 4,
            "focus": "aerobic_endurance",
            "description": "Build aerobic base with high volume, low intensity across all three disciplines"
        },
        {
            "name": "Build Phase 1",
            "start_week": 5,
            "end_week": 8,
            "focus": "threshold_development",
            "description": "Introduce threshold work, maintain volume"
        },
        {
            "name": "Build Phase 2",
            "start_week": 9,
            "end_week": 12,
            "focus": "race_specific",
            "description": "Race-specific intensity, brick workouts, practice nutrition"
        },
        {
            "name": "Peak",
            "start_week": 13,
            "end_week": 14,
            "focus": "sharpening",
            "description": "Maintain intensity, reduce volume, final race prep"
        },
        {
            "name": "Taper",
            "start_week": 15,
            "end_week": 16,
            "focus": "recovery",
            "description": "Significant volume reduction, stay fresh, race execution prep"
        }
    ]'::jsonb,
    '{
        "monday": {"focus": "swim", "typical_duration_min": 60},
        "tuesday": {"focus": "bike_intervals", "typical_duration_min": 75},
        "wednesday": {"focus": "run_easy", "typical_duration_min": 45},
        "thursday": {"focus": "swim_and_strength", "typical_duration_min": 90},
        "friday": {"focus": "rest_or_easy", "typical_duration_min": 0},
        "saturday": {"focus": "long_bike", "typical_duration_min": 150},
        "sunday": {"focus": "long_run_or_brick", "typical_duration_min": 90}
    }'::jsonb,
    '[]'::jsonb
);
*/

-- ============================================================================
-- NOTES FOR DEVELOPERS
-- ============================================================================
--
-- To use this seed data:
--
-- 1. First, create a test user in Supabase Auth:
--    - Go to Authentication > Users in Supabase Dashboard
--    - Click "Add user" and create a test account
--    - Copy the user's UUID
--
-- 2. Update this file:
--    - Replace 'YOUR_AUTH_USER_UUID' with the copied UUID
--    - Uncomment the sections you want to seed
--
-- 3. Run the seed:
--    - Via Supabase CLI: supabase db reset (runs migrations + seed)
--    - Or manually via SQL editor in Supabase Dashboard
--
-- Remember: RLS policies require the user to be authenticated to access data.
-- When testing, make sure you're authenticated as the test user.
