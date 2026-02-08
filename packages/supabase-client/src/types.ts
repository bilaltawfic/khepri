/**
 * @khepri/supabase-client - Database Types
 *
 * These types match the Supabase database schema exactly (snake_case).
 * For application-level types (camelCase), see @khepri/ai-client.
 *
 * Generated from: supabase/migrations/001_initial_schema.sql
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// DATABASE SCHEMA TYPES
// =============================================================================

/**
 * Supabase Database type definition
 */
export interface Database {
  public: {
    Tables: {
      athletes: {
        Row: AthleteRow;
        Insert: AthleteInsert;
        Update: AthleteUpdate;
      };
      goals: {
        Row: GoalRow;
        Insert: GoalInsert;
        Update: GoalUpdate;
      };
      constraints: {
        Row: ConstraintRow;
        Insert: ConstraintInsert;
        Update: ConstraintUpdate;
      };
      daily_checkins: {
        Row: DailyCheckinRow;
        Insert: DailyCheckinInsert;
        Update: DailyCheckinUpdate;
      };
      training_plans: {
        Row: TrainingPlanRow;
        Insert: TrainingPlanInsert;
        Update: TrainingPlanUpdate;
      };
    };
  };
}

// =============================================================================
// ATHLETE TYPES
// =============================================================================

export type PreferredUnits = 'metric' | 'imperial';

export interface AthleteRow {
  id: string;
  auth_user_id: string;
  display_name: string | null;
  date_of_birth: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  ftp_watts: number | null;
  running_threshold_pace_sec_per_km: number | null;
  css_sec_per_100m: number | null;
  resting_heart_rate: number | null;
  max_heart_rate: number | null;
  lthr: number | null;
  preferred_units: PreferredUnits;
  timezone: string;
  daily_checkin_time: string;
  intervals_icu_athlete_id: string | null;
  intervals_icu_connected: boolean;
  created_at: string;
  updated_at: string;
}

export interface AthleteInsert {
  id?: string;
  auth_user_id: string;
  display_name?: string | null;
  date_of_birth?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  ftp_watts?: number | null;
  running_threshold_pace_sec_per_km?: number | null;
  css_sec_per_100m?: number | null;
  resting_heart_rate?: number | null;
  max_heart_rate?: number | null;
  lthr?: number | null;
  preferred_units?: PreferredUnits;
  timezone?: string;
  daily_checkin_time?: string;
  intervals_icu_athlete_id?: string | null;
  intervals_icu_connected?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AthleteUpdate {
  id?: string;
  auth_user_id?: string;
  display_name?: string | null;
  date_of_birth?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  ftp_watts?: number | null;
  running_threshold_pace_sec_per_km?: number | null;
  css_sec_per_100m?: number | null;
  resting_heart_rate?: number | null;
  max_heart_rate?: number | null;
  lthr?: number | null;
  preferred_units?: PreferredUnits;
  timezone?: string;
  daily_checkin_time?: string;
  intervals_icu_athlete_id?: string | null;
  intervals_icu_connected?: boolean;
  updated_at?: string;
}

// =============================================================================
// GOAL TYPES
// =============================================================================

export type GoalType = 'race' | 'performance' | 'fitness' | 'health';
export type GoalPriority = 'A' | 'B' | 'C';
export type GoalStatus = 'active' | 'completed' | 'cancelled';

export interface GoalRow {
  id: string;
  athlete_id: string;
  goal_type: GoalType;
  title: string;
  description: string | null;
  target_date: string | null;
  priority: GoalPriority;
  status: GoalStatus;
  race_event_name: string | null;
  race_distance: string | null;
  race_location: string | null;
  race_target_time_seconds: number | null;
  perf_metric: string | null;
  perf_current_value: number | null;
  perf_target_value: number | null;
  fitness_metric: string | null;
  fitness_target_value: number | null;
  health_metric: string | null;
  health_current_value: number | null;
  health_target_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface GoalInsert {
  id?: string;
  athlete_id: string;
  goal_type: GoalType;
  title: string;
  description?: string | null;
  target_date?: string | null;
  priority?: GoalPriority;
  status?: GoalStatus;
  race_event_name?: string | null;
  race_distance?: string | null;
  race_location?: string | null;
  race_target_time_seconds?: number | null;
  perf_metric?: string | null;
  perf_current_value?: number | null;
  perf_target_value?: number | null;
  fitness_metric?: string | null;
  fitness_target_value?: number | null;
  health_metric?: string | null;
  health_current_value?: number | null;
  health_target_value?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface GoalUpdate {
  id?: string;
  athlete_id?: string;
  goal_type?: GoalType;
  title?: string;
  description?: string | null;
  target_date?: string | null;
  priority?: GoalPriority;
  status?: GoalStatus;
  race_event_name?: string | null;
  race_distance?: string | null;
  race_location?: string | null;
  race_target_time_seconds?: number | null;
  perf_metric?: string | null;
  perf_current_value?: number | null;
  perf_target_value?: number | null;
  fitness_metric?: string | null;
  fitness_target_value?: number | null;
  health_metric?: string | null;
  health_current_value?: number | null;
  health_target_value?: number | null;
  updated_at?: string;
}

// =============================================================================
// CONSTRAINT TYPES
// =============================================================================

export type ConstraintType = 'injury' | 'travel' | 'availability';
export type ConstraintStatus = 'active' | 'resolved';
export type InjurySeverity = 'mild' | 'moderate' | 'severe';

export interface ConstraintRow {
  id: string;
  athlete_id: string;
  constraint_type: ConstraintType;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: ConstraintStatus;
  injury_body_part: string | null;
  injury_severity: InjurySeverity | null;
  injury_restrictions: string[] | null;
  travel_destination: string | null;
  travel_equipment_available: string[] | null;
  travel_facilities_available: string[] | null;
  availability_hours_per_week: number | null;
  availability_days_available: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ConstraintInsert {
  id?: string;
  athlete_id: string;
  constraint_type: ConstraintType;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  status?: ConstraintStatus;
  injury_body_part?: string | null;
  injury_severity?: InjurySeverity | null;
  injury_restrictions?: string[] | null;
  travel_destination?: string | null;
  travel_equipment_available?: string[] | null;
  travel_facilities_available?: string[] | null;
  availability_hours_per_week?: number | null;
  availability_days_available?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface ConstraintUpdate {
  id?: string;
  athlete_id?: string;
  constraint_type?: ConstraintType;
  title?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string | null;
  status?: ConstraintStatus;
  injury_body_part?: string | null;
  injury_severity?: InjurySeverity | null;
  injury_restrictions?: string[] | null;
  travel_destination?: string | null;
  travel_equipment_available?: string[] | null;
  travel_facilities_available?: string[] | null;
  availability_hours_per_week?: number | null;
  availability_days_available?: string[] | null;
  updated_at?: string;
}

// =============================================================================
// DAILY CHECK-IN TYPES
// =============================================================================

export type TravelStatus = 'home' | 'traveling' | 'returning';
export type UserResponse = 'accepted' | 'modified' | 'skipped' | 'alternative';

export interface SorenessAreas {
  legs?: number;
  back?: number;
  shoulders?: number;
  arms?: number;
  neck?: number;
  core?: number;
  [key: string]: number | undefined;
}

export interface DailyCheckinRow {
  id: string;
  athlete_id: string;
  checkin_date: string;
  sleep_quality: number | null;
  sleep_hours: number | null;
  energy_level: number | null;
  stress_level: number | null;
  overall_soreness: number | null;
  soreness_areas: SorenessAreas | null;
  resting_hr: number | null;
  hrv_ms: number | null;
  weight_kg: number | null;
  available_time_minutes: number | null;
  equipment_access: string[] | null;
  travel_status: TravelStatus | null;
  notes: string | null;
  ai_recommendation: Record<string, unknown> | null;
  ai_recommendation_generated_at: string | null;
  user_response: UserResponse | null;
  user_response_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyCheckinInsert {
  id?: string;
  athlete_id: string;
  checkin_date: string;
  sleep_quality?: number | null;
  sleep_hours?: number | null;
  energy_level?: number | null;
  stress_level?: number | null;
  overall_soreness?: number | null;
  soreness_areas?: SorenessAreas | null;
  resting_hr?: number | null;
  hrv_ms?: number | null;
  weight_kg?: number | null;
  available_time_minutes?: number | null;
  equipment_access?: string[] | null;
  travel_status?: TravelStatus | null;
  notes?: string | null;
  ai_recommendation?: Record<string, unknown> | null;
  ai_recommendation_generated_at?: string | null;
  user_response?: UserResponse | null;
  user_response_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DailyCheckinUpdate {
  id?: string;
  athlete_id?: string;
  checkin_date?: string;
  sleep_quality?: number | null;
  sleep_hours?: number | null;
  energy_level?: number | null;
  stress_level?: number | null;
  overall_soreness?: number | null;
  soreness_areas?: SorenessAreas | null;
  resting_hr?: number | null;
  hrv_ms?: number | null;
  weight_kg?: number | null;
  available_time_minutes?: number | null;
  equipment_access?: string[] | null;
  travel_status?: TravelStatus | null;
  notes?: string | null;
  ai_recommendation?: Record<string, unknown> | null;
  ai_recommendation_generated_at?: string | null;
  user_response?: UserResponse | null;
  user_response_notes?: string | null;
  updated_at?: string;
}

// =============================================================================
// TRAINING PLAN TYPES
// =============================================================================

export type PlanStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface TrainingPhase {
  name: string;
  start_week: number;
  end_week: number;
  focus: string;
  description?: string;
}

export interface WeeklyTemplate {
  monday?: DayTemplate;
  tuesday?: DayTemplate;
  wednesday?: DayTemplate;
  thursday?: DayTemplate;
  friday?: DayTemplate;
  saturday?: DayTemplate;
  sunday?: DayTemplate;
}

export interface DayTemplate {
  sport?: 'swim' | 'bike' | 'run' | 'strength' | 'rest';
  workout_type?: string;
  duration_minutes?: number;
  intensity?: 'recovery' | 'easy' | 'moderate' | 'threshold' | 'hard';
}

export interface PlanAdjustment {
  date: string;
  reason: string;
  changes: string;
  ai_generated: boolean;
}

export interface TrainingPlanRow {
  id: string;
  athlete_id: string;
  title: string;
  description: string | null;
  duration_weeks: number;
  start_date: string;
  end_date: string;
  target_goal_id: string | null;
  status: PlanStatus;
  phases: TrainingPhase[];
  weekly_template: WeeklyTemplate | null;
  adjustments_log: PlanAdjustment[];
  created_at: string;
  updated_at: string;
}

export interface TrainingPlanInsert {
  id?: string;
  athlete_id: string;
  title: string;
  description?: string | null;
  duration_weeks: number;
  start_date: string;
  end_date: string;
  target_goal_id?: string | null;
  status?: PlanStatus;
  phases?: TrainingPhase[];
  weekly_template?: WeeklyTemplate | null;
  adjustments_log?: PlanAdjustment[];
  created_at?: string;
  updated_at?: string;
}

export interface TrainingPlanUpdate {
  id?: string;
  athlete_id?: string;
  title?: string;
  description?: string | null;
  duration_weeks?: number;
  start_date?: string;
  end_date?: string;
  target_goal_id?: string | null;
  status?: PlanStatus;
  phases?: TrainingPhase[];
  weekly_template?: WeeklyTemplate | null;
  adjustments_log?: PlanAdjustment[];
  updated_at?: string;
}

// =============================================================================
// TYPED CLIENT
// =============================================================================

/**
 * Typed Supabase client for Khepri database
 */
export type KhepriSupabaseClient = SupabaseClient<Database>;
