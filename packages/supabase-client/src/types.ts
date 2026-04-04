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

// Re-export Supabase auth types for consumers (avoids direct @supabase/supabase-js dependency)
export type { Session, User } from '@supabase/supabase-js';

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
export type PlanStatus = 'active' | 'completed' | 'cancelled';
export type MessageRole = 'user' | 'assistant' | 'system';
export type SeasonStatus = 'active' | 'completed' | 'archived';
export type BlockStatus = 'draft' | 'locked' | 'in_progress' | 'completed' | 'cancelled';
export type WorkoutSport = 'swim' | 'bike' | 'run' | 'strength' | 'rest';
export type WorkoutSyncStatus = 'pending' | 'synced' | 'conflict' | 'not_connected';
export type IntervalsTarget = 'POWER' | 'PACE' | 'HR' | 'AUTO';
export type AdaptationTrigger =
  | 'coach_suggestion'
  | 'athlete_request'
  | 'block_review'
  | 'external_sync';
export type AdaptationStatus = 'suggested' | 'accepted' | 'rejected' | 'rolled_back';
export type RolledBackBy = 'support' | 'athlete';

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
          adaptations: Json;
          athlete_id: string;
          created_at: string;
          description: string | null;
          end_date: string;
          goal_id: string | null;
          id: string;
          name: string;
          periodization: Json;
          start_date: string;
          status: string;
          total_weeks: number;
          updated_at: string;
          weekly_template: Json | null;
        };
        Insert: {
          adaptations?: Json;
          athlete_id: string;
          created_at?: string;
          description?: string | null;
          end_date: string;
          goal_id?: string | null;
          id?: string;
          name: string;
          periodization?: Json;
          start_date: string;
          status?: string;
          total_weeks: number;
          updated_at?: string;
          weekly_template?: Json | null;
        };
        Update: {
          adaptations?: Json;
          athlete_id?: string;
          created_at?: string;
          description?: string | null;
          end_date?: string;
          goal_id?: string | null;
          id?: string;
          name?: string;
          periodization?: Json;
          start_date?: string;
          status?: string;
          total_weeks?: number;
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
            foreignKeyName: 'training_plans_goal_id_fkey';
            columns: ['goal_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id'];
          },
        ];
      };
      seasons: {
        Row: {
          id: string;
          athlete_id: string;
          name: string;
          start_date: string;
          end_date: string;
          status: string;
          preferences: Json;
          skeleton: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          athlete_id: string;
          name: string;
          start_date: string;
          end_date: string;
          status?: string;
          preferences?: Json;
          skeleton?: Json | null;
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          athlete_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          status?: string;
          preferences?: Json;
          skeleton?: Json | null;
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'seasons_athlete_id_fkey';
            columns: ['athlete_id'];
            isOneToOne: false;
            referencedRelation: 'athletes';
            referencedColumns: ['id'];
          },
        ];
      };
      race_blocks: {
        Row: {
          id: string;
          season_id: string;
          athlete_id: string;
          name: string;
          goal_id: string | null;
          start_date: string;
          end_date: string;
          total_weeks: number;
          status: string;
          phases: Json;
          locked_at: string | null;
          pushed_to_intervals_at: string | null;
          weekly_compliance: Json;
          overall_compliance: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          season_id: string;
          athlete_id: string;
          name: string;
          start_date: string;
          end_date: string;
          total_weeks: number;
          goal_id?: string | null;
          status?: string;
          phases?: Json;
          locked_at?: string | null;
          pushed_to_intervals_at?: string | null;
          weekly_compliance?: Json;
          overall_compliance?: Json | null;
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          season_id?: string;
          athlete_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          total_weeks?: number;
          goal_id?: string | null;
          status?: string;
          phases?: Json;
          locked_at?: string | null;
          pushed_to_intervals_at?: string | null;
          weekly_compliance?: Json;
          overall_compliance?: Json | null;
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'race_blocks_season_fk';
            columns: ['season_id', 'athlete_id'];
            isOneToOne: false;
            referencedRelation: 'seasons';
            referencedColumns: ['id', 'athlete_id'];
          },
          {
            foreignKeyName: 'race_blocks_athlete_id_fkey';
            columns: ['athlete_id'];
            isOneToOne: false;
            referencedRelation: 'athletes';
            referencedColumns: ['id'];
          },
        ];
      };
      workouts: {
        Row: {
          id: string;
          block_id: string;
          athlete_id: string;
          date: string;
          week_number: number;
          name: string;
          sport: string;
          workout_type: string | null;
          planned_duration_minutes: number;
          planned_tss: number | null;
          planned_distance_meters: number | null;
          structure: Json;
          description_dsl: string;
          intervals_target: string;
          sync_status: string;
          external_id: string;
          intervals_event_id: string | null;
          actual_duration_minutes: number | null;
          actual_tss: number | null;
          actual_distance_meters: number | null;
          actual_avg_power: number | null;
          actual_avg_pace_sec_per_km: number | null;
          actual_avg_hr: number | null;
          completed_at: string | null;
          intervals_activity_id: string | null;
          compliance: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          block_id: string;
          athlete_id: string;
          date: string;
          week_number: number;
          name: string;
          sport: string;
          planned_duration_minutes: number;
          structure: Json;
          external_id: string;
          workout_type?: string | null;
          planned_tss?: number | null;
          planned_distance_meters?: number | null;
          description_dsl?: string;
          intervals_target?: string;
          sync_status?: string;
          intervals_event_id?: string | null;
          actual_duration_minutes?: number | null;
          actual_tss?: number | null;
          actual_distance_meters?: number | null;
          actual_avg_power?: number | null;
          actual_avg_pace_sec_per_km?: number | null;
          actual_avg_hr?: number | null;
          completed_at?: string | null;
          intervals_activity_id?: string | null;
          compliance?: Json | null;
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          block_id?: string;
          athlete_id?: string;
          date?: string;
          week_number?: number;
          name?: string;
          sport?: string;
          planned_duration_minutes?: number;
          structure?: Json;
          external_id?: string;
          workout_type?: string | null;
          planned_tss?: number | null;
          planned_distance_meters?: number | null;
          description_dsl?: string;
          intervals_target?: string;
          sync_status?: string;
          intervals_event_id?: string | null;
          actual_duration_minutes?: number | null;
          actual_tss?: number | null;
          actual_distance_meters?: number | null;
          actual_avg_power?: number | null;
          actual_avg_pace_sec_per_km?: number | null;
          actual_avg_hr?: number | null;
          completed_at?: string | null;
          intervals_activity_id?: string | null;
          compliance?: Json | null;
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workouts_block_fk';
            columns: ['block_id', 'athlete_id'];
            isOneToOne: false;
            referencedRelation: 'race_blocks';
            referencedColumns: ['id', 'athlete_id'];
          },
          {
            foreignKeyName: 'workouts_athlete_id_fkey';
            columns: ['athlete_id'];
            isOneToOne: false;
            referencedRelation: 'athletes';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_adaptations: {
        Row: {
          id: string;
          block_id: string;
          athlete_id: string;
          trigger: string;
          status: string;
          affected_workouts: Json;
          reason: string;
          context: Json | null;
          rolled_back_at: string | null;
          rolled_back_by: string | null;
          rollback_adaptation_id: string | null;
          created_at: string;
        };
        Insert: {
          block_id: string;
          athlete_id: string;
          trigger: string;
          reason: string;
          status?: string;
          affected_workouts?: Json;
          context?: Json | null;
          rolled_back_at?: string | null;
          rolled_back_by?: string | null;
          rollback_adaptation_id?: string | null;
          id?: string;
          created_at?: string;
        };
        Update: {
          block_id?: string;
          athlete_id?: string;
          trigger?: string;
          reason?: string;
          status?: string;
          affected_workouts?: Json;
          context?: Json | null;
          rolled_back_at?: string | null;
          rolled_back_by?: string | null;
          rollback_adaptation_id?: string | null;
          id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'adaptations_block_fk';
            columns: ['block_id', 'athlete_id'];
            isOneToOne: false;
            referencedRelation: 'race_blocks';
            referencedColumns: ['id', 'athlete_id'];
          },
          {
            foreignKeyName: 'plan_adaptations_athlete_id_fkey';
            columns: ['athlete_id'];
            isOneToOne: false;
            referencedRelation: 'athletes';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          athlete_id: string;
          title: string | null;
          started_at: string;
          last_message_at: string;
          is_archived: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          title?: string | null;
          started_at?: string;
          last_message_at?: string;
          is_archived?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          title?: string | null;
          started_at?: string;
          last_message_at?: string;
          is_archived?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_athlete_id_fkey';
            columns: ['athlete_id'];
            isOneToOne: false;
            referencedRelation: 'athletes';
            referencedColumns: ['id'];
          },
        ];
      };
      embeddings: {
        Row: {
          id: string;
          content_type: string;
          source_id: string | null;
          chunk_index: number;
          title: string;
          content: string;
          metadata: Json;
          embedding: string;
          athlete_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content_type: string;
          source_id?: string | null;
          chunk_index?: number;
          title: string;
          content: string;
          metadata?: Json;
          embedding: string;
          athlete_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content_type?: string;
          source_id?: string | null;
          chunk_index?: number;
          title?: string;
          content?: string;
          metadata?: Json;
          embedding?: string;
          athlete_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'embeddings_athlete_id_fkey';
            columns: ['athlete_id'];
            isOneToOne: false;
            referencedRelation: 'athletes';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_embeddings: {
        Args: {
          query_embedding: string;
          match_count?: number;
          match_threshold?: number;
          filter_content_type?: string | null;
          filter_athlete_id?: string | null;
        };
        Returns: {
          id: string;
          content_type: string;
          title: string;
          content: string;
          metadata: Json;
          similarity: number;
        }[];
      };
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

/** Conversation row type */
export type ConversationRow = Database['public']['Tables']['conversations']['Row'];

/** Conversation insert type */
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];

/** Conversation update type (omits immutable system-managed fields) */
export type ConversationUpdate = Omit<
  Database['public']['Tables']['conversations']['Update'],
  'id' | 'athlete_id' | 'created_at'
>;

/** Message row type */
export type MessageRow = Database['public']['Tables']['messages']['Row'];

/** Message insert type */
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];

/** Message update type (omits immutable system-managed fields) */
export type MessageUpdate = Omit<
  Database['public']['Tables']['messages']['Update'],
  'id' | 'conversation_id' | 'created_at'
>;

/** Season row type */
export type SeasonRow = Database['public']['Tables']['seasons']['Row'];

/** Season insert type */
export type SeasonInsert = Database['public']['Tables']['seasons']['Insert'];

/** Season update type (omits immutable system-managed fields) */
export type SeasonUpdate = Omit<
  Database['public']['Tables']['seasons']['Update'],
  'id' | 'athlete_id' | 'created_at'
>;

/** Race block row type */
export type RaceBlockRow = Database['public']['Tables']['race_blocks']['Row'];

/** Race block insert type */
export type RaceBlockInsert = Database['public']['Tables']['race_blocks']['Insert'];

/** Race block update type (omits immutable system-managed fields) */
export type RaceBlockUpdate = Omit<
  Database['public']['Tables']['race_blocks']['Update'],
  'id' | 'season_id' | 'athlete_id' | 'created_at'
>;

/** Workout row type */
export type WorkoutRow = Database['public']['Tables']['workouts']['Row'];

/** Workout insert type */
export type WorkoutInsert = Database['public']['Tables']['workouts']['Insert'];

/** Workout update type (omits immutable system-managed fields) */
export type WorkoutUpdate = Omit<
  Database['public']['Tables']['workouts']['Update'],
  'id' | 'block_id' | 'athlete_id' | 'created_at'
>;

/** Plan adaptation row type */
export type PlanAdaptationRow = Database['public']['Tables']['plan_adaptations']['Row'];

/** Plan adaptation insert type */
export type PlanAdaptationInsert = Database['public']['Tables']['plan_adaptations']['Insert'];

/** Plan adaptation update type (omits immutable system-managed fields) */
export type PlanAdaptationUpdate = Omit<
  Database['public']['Tables']['plan_adaptations']['Update'],
  'id' | 'block_id' | 'athlete_id' | 'created_at'
>;

// =============================================================================
// TYPED CLIENT
// =============================================================================

/**
 * Typed Supabase client for Khepri database
 */
export type KhepriSupabaseClient = SupabaseClient<Database>;
