/**
 * @khepri/supabase-client - Database Types
 *
 * TypeScript types for the Khepri Supabase database schema (snake_case).
 * These types provide compile-time safety for database operations.
 *
 * The Database type is generated from the local Supabase database using:
 *   pnpm exec supabase gen types typescript --local
 *
 * We export friendly aliases for the Row/Insert/Update types. The generated
 * Database Row/Insert/Update shapes use string values for enum-like columns,
 * and we separately export union-typed enums (e.g., PreferredUnits, GoalType)
 * for application-level type safety.
 *
 * Schema source: supabase/migrations/001_initial_schema.sql
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// JSON TYPE
// =============================================================================

/** JSON type for JSONB columns - represents any valid JSON value */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// =============================================================================
// ENUM TYPES (Application-level type safety)
// =============================================================================

export type PreferredUnits = 'metric' | 'imperial';
export type GoalType = 'race' | 'performance' | 'fitness' | 'health';
export type GoalPriority = 'A' | 'B' | 'C';
export type GoalStatus = 'active' | 'completed' | 'cancelled';
export type ConstraintType = 'injury' | 'travel' | 'availability';
export type ConstraintStatus = 'active' | 'resolved';
export type InjurySeverity = 'mild' | 'moderate' | 'severe';
export type TravelStatus = 'home' | 'traveling' | 'returning';
export type UserResponse = 'accepted' | 'modified' | 'skipped' | 'alternative';
export type PlanStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

// =============================================================================
// STRUCTURED JSONB TYPES
// =============================================================================

export interface SorenessAreas {
  legs?: number;
  back?: number;
  shoulders?: number;
  arms?: number;
  neck?: number;
  core?: number;
  [key: string]: number | undefined;
}

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

// =============================================================================
// DATABASE SCHEMA - Generated from Supabase
// =============================================================================

/**
 * Supabase Database type definition.
 * Generated with: pnpm exec supabase gen types typescript --local
 *
 * Important: This type must match the exact structure expected by @supabase/supabase-js.
 */
export interface Database {
  public: {
    Tables: {
      athletes: {
        Row: {
          auth_user_id: string;
          created_at: string;
          css_sec_per_100m: number | null;
          daily_checkin_time: string | null;
          date_of_birth: string | null;
          display_name: string | null;
          ftp_watts: number | null;
          height_cm: number | null;
          id: string;
          intervals_icu_athlete_id: string | null;
          intervals_icu_connected: boolean | null;
          lthr: number | null;
          max_heart_rate: number | null;
          preferred_units: string | null;
          resting_heart_rate: number | null;
          running_threshold_pace_sec_per_km: number | null;
          timezone: string | null;
          updated_at: string;
          weight_kg: number | null;
        };
        Insert: {
          auth_user_id: string;
          created_at?: string;
          css_sec_per_100m?: number | null;
          daily_checkin_time?: string | null;
          date_of_birth?: string | null;
          display_name?: string | null;
          ftp_watts?: number | null;
          height_cm?: number | null;
          id?: string;
          intervals_icu_athlete_id?: string | null;
          intervals_icu_connected?: boolean | null;
          lthr?: number | null;
          max_heart_rate?: number | null;
          preferred_units?: string | null;
          resting_heart_rate?: number | null;
          running_threshold_pace_sec_per_km?: number | null;
          timezone?: string | null;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          css_sec_per_100m?: number | null;
          daily_checkin_time?: string | null;
          date_of_birth?: string | null;
          display_name?: string | null;
          ftp_watts?: number | null;
          height_cm?: number | null;
          id?: string;
          intervals_icu_athlete_id?: string | null;
          intervals_icu_connected?: boolean | null;
          lthr?: number | null;
          max_heart_rate?: number | null;
          preferred_units?: string | null;
          resting_heart_rate?: number | null;
          running_threshold_pace_sec_per_km?: number | null;
          timezone?: string | null;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      constraints: {
        Row: {
          athlete_id: string;
          availability_days_available: string[] | null;
          availability_hours_per_week: number | null;
          constraint_type: string;
          created_at: string;
          description: string | null;
          end_date: string | null;
          id: string;
          injury_body_part: string | null;
          injury_restrictions: string[] | null;
          injury_severity: string | null;
          start_date: string;
          status: string | null;
          title: string;
          travel_destination: string | null;
          travel_equipment_available: string[] | null;
          travel_facilities_available: string[] | null;
          updated_at: string;
        };
        Insert: {
          athlete_id: string;
          availability_days_available?: string[] | null;
          availability_hours_per_week?: number | null;
          constraint_type: string;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          injury_body_part?: string | null;
          injury_restrictions?: string[] | null;
          injury_severity?: string | null;
          start_date: string;
          status?: string | null;
          title: string;
          travel_destination?: string | null;
          travel_equipment_available?: string[] | null;
          travel_facilities_available?: string[] | null;
          updated_at?: string;
        };
        Update: {
          athlete_id?: string;
          availability_days_available?: string[] | null;
          availability_hours_per_week?: number | null;
          constraint_type?: string;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          injury_body_part?: string | null;
          injury_restrictions?: string[] | null;
          injury_severity?: string | null;
          start_date?: string;
          status?: string | null;
          title?: string;
          travel_destination?: string | null;
          travel_equipment_available?: string[] | null;
          travel_facilities_available?: string[] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'constraints_athlete_id_fkey';
            columns: ['athlete_id'];
            isOneToOne: false;
            referencedRelation: 'athletes';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_checkins: {
        Row: {
          ai_recommendation: Json | null;
          ai_recommendation_generated_at: string | null;
          athlete_id: string;
          available_time_minutes: number | null;
          checkin_date: string;
          created_at: string;
          energy_level: number | null;
          equipment_access: string[] | null;
          hrv_ms: number | null;
          id: string;
          notes: string | null;
          overall_soreness: number | null;
          resting_hr: number | null;
          sleep_hours: number | null;
          sleep_quality: number | null;
          soreness_areas: Json | null;
          stress_level: number | null;
          travel_status: string | null;
          updated_at: string;
          user_response: string | null;
          user_response_notes: string | null;
          weight_kg: number | null;
        };
        Insert: {
          ai_recommendation?: Json | null;
          ai_recommendation_generated_at?: string | null;
          athlete_id: string;
          available_time_minutes?: number | null;
          checkin_date: string;
          created_at?: string;
          energy_level?: number | null;
          equipment_access?: string[] | null;
          hrv_ms?: number | null;
          id?: string;
          notes?: string | null;
          overall_soreness?: number | null;
          resting_hr?: number | null;
          sleep_hours?: number | null;
          sleep_quality?: number | null;
          soreness_areas?: Json | null;
          stress_level?: number | null;
          travel_status?: string | null;
          updated_at?: string;
          user_response?: string | null;
          user_response_notes?: string | null;
          weight_kg?: number | null;
        };
        Update: {
          ai_recommendation?: Json | null;
          ai_recommendation_generated_at?: string | null;
          athlete_id?: string;
          available_time_minutes?: number | null;
          checkin_date?: string;
          created_at?: string;
          energy_level?: number | null;
          equipment_access?: string[] | null;
          hrv_ms?: number | null;
          id?: string;
          notes?: string | null;
          overall_soreness?: number | null;
          resting_hr?: number | null;
          sleep_hours?: number | null;
          sleep_quality?: number | null;
          soreness_areas?: Json | null;
          stress_level?: number | null;
          travel_status?: string | null;
          updated_at?: string;
          user_response?: string | null;
          user_response_notes?: string | null;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_checkins_athlete_id_fkey';
            columns: ['athlete_id'];
            isOneToOne: false;
            referencedRelation: 'athletes';
            referencedColumns: ['id'];
          },
        ];
      };
      goals: {
        Row: {
          athlete_id: string;
          created_at: string;
          description: string | null;
          fitness_metric: string | null;
          fitness_target_value: number | null;
          goal_type: string;
          health_current_value: number | null;
          health_metric: string | null;
          health_target_value: number | null;
          id: string;
          perf_current_value: number | null;
          perf_metric: string | null;
          perf_target_value: number | null;
          priority: string | null;
          race_distance: string | null;
          race_event_name: string | null;
          race_location: string | null;
          race_target_time_seconds: number | null;
          status: string | null;
          target_date: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          athlete_id: string;
          created_at?: string;
          description?: string | null;
          fitness_metric?: string | null;
          fitness_target_value?: number | null;
          goal_type: string;
          health_current_value?: number | null;
          health_metric?: string | null;
          health_target_value?: number | null;
          id?: string;
          perf_current_value?: number | null;
          perf_metric?: string | null;
          perf_target_value?: number | null;
          priority?: string | null;
          race_distance?: string | null;
          race_event_name?: string | null;
          race_location?: string | null;
          race_target_time_seconds?: number | null;
          status?: string | null;
          target_date?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          athlete_id?: string;
          created_at?: string;
          description?: string | null;
          fitness_metric?: string | null;
          fitness_target_value?: number | null;
          goal_type?: string;
          health_current_value?: number | null;
          health_metric?: string | null;
          health_target_value?: number | null;
          id?: string;
          perf_current_value?: number | null;
          perf_metric?: string | null;
          perf_target_value?: number | null;
          priority?: string | null;
          race_distance?: string | null;
          race_event_name?: string | null;
          race_location?: string | null;
          race_target_time_seconds?: number | null;
          status?: string | null;
          target_date?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'goals_athlete_id_fkey';
            columns: ['athlete_id'];
            isOneToOne: false;
            referencedRelation: 'athletes';
            referencedColumns: ['id'];
          },
        ];
      };
      training_plans: {
        Row: {
          adjustments_log: Json;
          athlete_id: string;
          created_at: string;
          description: string | null;
          duration_weeks: number;
          end_date: string;
          id: string;
          phases: Json;
          start_date: string;
          status: string | null;
          target_goal_id: string | null;
          title: string;
          updated_at: string;
          weekly_template: Json | null;
        };
        Insert: {
          adjustments_log?: Json;
          athlete_id: string;
          created_at?: string;
          description?: string | null;
          duration_weeks: number;
          end_date: string;
          id?: string;
          phases?: Json;
          start_date: string;
          status?: string | null;
          target_goal_id?: string | null;
          title: string;
          updated_at?: string;
          weekly_template?: Json | null;
        };
        Update: {
          adjustments_log?: Json;
          athlete_id?: string;
          created_at?: string;
          description?: string | null;
          duration_weeks?: number;
          end_date?: string;
          id?: string;
          phases?: Json;
          start_date?: string;
          status?: string | null;
          target_goal_id?: string | null;
          title?: string;
          updated_at?: string;
          weekly_template?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'training_plans_athlete_id_fkey';
            columns: ['athlete_id'];
            isOneToOne: false;
            referencedRelation: 'athletes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'training_plans_target_goal_id_fkey';
            columns: ['target_goal_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// =============================================================================
// TYPE ALIASES - Friendly names for Row/Insert/Update types
// =============================================================================

/**
 * Note: Row types use the database types directly (string for enums).
 * Application code should use the exported enum types (e.g., PreferredUnits)
 * when validating or constraining values. The database may return any string
 * for these fields, so runtime validation is recommended.
 */

/** Athlete profile row type */
export type AthleteRow = Database['public']['Tables']['athletes']['Row'];

/** Athlete insert type */
export type AthleteInsert = Database['public']['Tables']['athletes']['Insert'];

/** Athlete update type (omits immutable system-managed fields) */
export type AthleteUpdate = Omit<
  Database['public']['Tables']['athletes']['Update'],
  'id' | 'auth_user_id' | 'created_at'
>;

/** Goal row type */
export type GoalRow = Database['public']['Tables']['goals']['Row'];

/** Goal insert type */
export type GoalInsert = Database['public']['Tables']['goals']['Insert'];

/** Goal update type (omits immutable system-managed fields) */
export type GoalUpdate = Omit<
  Database['public']['Tables']['goals']['Update'],
  'id' | 'athlete_id' | 'created_at'
>;

/** Constraint row type */
export type ConstraintRow = Database['public']['Tables']['constraints']['Row'];

/** Constraint insert type */
export type ConstraintInsert = Database['public']['Tables']['constraints']['Insert'];

/** Constraint update type (omits immutable system-managed fields) */
export type ConstraintUpdate = Omit<
  Database['public']['Tables']['constraints']['Update'],
  'id' | 'athlete_id' | 'created_at'
>;

/** Daily check-in row type */
export type DailyCheckinRow = Database['public']['Tables']['daily_checkins']['Row'];

/** Daily check-in insert type */
export type DailyCheckinInsert = Database['public']['Tables']['daily_checkins']['Insert'];

/** Daily check-in update type (omits immutable system-managed fields) */
export type DailyCheckinUpdate = Omit<
  Database['public']['Tables']['daily_checkins']['Update'],
  'id' | 'athlete_id' | 'created_at'
>;

/** Training plan row type */
export type TrainingPlanRow = Database['public']['Tables']['training_plans']['Row'];

/** Training plan insert type */
export type TrainingPlanInsert = Database['public']['Tables']['training_plans']['Insert'];

/** Training plan update type (omits immutable system-managed fields) */
export type TrainingPlanUpdate = Omit<
  Database['public']['Tables']['training_plans']['Update'],
  'id' | 'athlete_id' | 'created_at'
>;

// =============================================================================
// TYPED CLIENT
// =============================================================================

/**
 * Typed Supabase client for Khepri database
 */
export type KhepriSupabaseClient = SupabaseClient<Database>;
