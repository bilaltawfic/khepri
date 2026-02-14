// Request/response types for generate-plan Edge Function

export interface GeneratePlanRequest {
  /** Specific goal to build the plan toward (optional). */
  readonly goal_id?: string;
  /** Plan start date in YYYY-MM-DD format (defaults to today). */
  readonly start_date?: string;
  /** Total plan duration in weeks, 4-52 (defaults to 12 or derived from goal target_date). */
  readonly total_weeks?: number;
}

export interface GeneratePlanResponse {
  readonly success: true;
  readonly plan: TrainingPlanPayload;
}

/** Shape matching TrainingPlanInsert from supabase-client. */
export interface TrainingPlanPayload {
  readonly athlete_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly start_date: string; // YYYY-MM-DD
  readonly end_date: string; // YYYY-MM-DD
  readonly total_weeks: number;
  readonly status: 'active';
  readonly goal_id: string | null;
  readonly periodization: PeriodizationData;
  readonly weekly_template: null; // Populated later via AI or user
  readonly adaptations: [];
}

/** Structured periodization data stored in JSONB column. */
export interface PeriodizationData {
  readonly total_weeks: number;
  readonly phases: readonly PhaseEntry[];
  readonly weekly_volumes: readonly VolumeEntry[];
}

export interface PhaseEntry {
  readonly phase: string;
  readonly weeks: number;
  readonly focus: string;
  readonly intensity_distribution: readonly [number, number, number];
}

export interface VolumeEntry {
  readonly week: number;
  readonly volume_multiplier: number;
  readonly phase: string;
}

export interface GoalData {
  readonly id: string;
  readonly title: string;
  readonly goal_type: string | null;
  readonly target_date: string | null;
  readonly race_event_name: string | null;
  readonly race_distance: string | null;
  readonly priority: string | null;
}

export interface AthleteData {
  readonly id: string;
  readonly display_name: string | null;
}
