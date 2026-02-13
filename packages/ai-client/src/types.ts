/**
 * @khepri/ai-client - Type definitions
 *
 * These types define the data structures used for AI coaching interactions,
 * aligned with the database schema in supabase/migrations/001_initial_schema.sql
 */

// =============================================================================
// ATHLETE PROFILE TYPES
// =============================================================================

/**
 * Athlete profile with fitness metrics and preferences
 */
export interface AthleteProfile {
  id: string;
  displayName?: string;
  dateOfBirth?: string;
  weightKg?: number;
  heightCm?: number;

  // Fitness metrics (can sync from Intervals.icu)
  ftpWatts?: number;
  runningThresholdPaceSecPerKm?: number;
  cssSecPer100m?: number;
  restingHeartRate?: number;
  maxHeartRate?: number;
  lthr?: number;

  // Preferences
  preferredUnits: 'metric' | 'imperial';
  timezone: string;
  dailyCheckinTime?: string;

  // Intervals.icu connection
  intervalsIcuAthleteId?: string;
  intervalsIcuConnected: boolean;
}

// =============================================================================
// GOAL TYPES
// =============================================================================

export type GoalType = 'race' | 'performance' | 'fitness' | 'health';
export type GoalPriority = 'A' | 'B' | 'C';
export type GoalStatus = 'active' | 'completed' | 'cancelled';

/**
 * Base goal interface with common fields
 */
export interface BaseGoal {
  id: string;
  athleteId: string;
  goalType: GoalType;
  title: string;
  description?: string;
  targetDate?: string;
  priority: GoalPriority;
  status: GoalStatus;
}

/**
 * Race goal with event details
 */
export interface RaceGoal extends BaseGoal {
  goalType: 'race';
  raceEventName?: string;
  raceDistance?: string;
  raceLocation?: string;
  raceTargetTimeSeconds?: number;
}

/**
 * Performance goal targeting specific metrics
 */
export interface PerformanceGoal extends BaseGoal {
  goalType: 'performance';
  perfMetric?: string;
  perfCurrentValue?: number;
  perfTargetValue?: number;
}

/**
 * Fitness goal for volume or consistency
 */
export interface FitnessGoal extends BaseGoal {
  goalType: 'fitness';
  fitnessMetric?: string;
  fitnessTargetValue?: number;
}

/**
 * Health goal for weight or body composition
 */
export interface HealthGoal extends BaseGoal {
  goalType: 'health';
  healthMetric?: string;
  healthCurrentValue?: number;
  healthTargetValue?: number;
}

export type Goal = RaceGoal | PerformanceGoal | FitnessGoal | HealthGoal;

// =============================================================================
// CONSTRAINT TYPES
// =============================================================================

export type ConstraintType = 'injury' | 'travel' | 'availability';
export type ConstraintStatus = 'active' | 'resolved';
export type InjurySeverity = 'mild' | 'moderate' | 'severe';

/**
 * Base constraint interface
 */
export interface BaseConstraint {
  id: string;
  athleteId: string;
  constraintType: ConstraintType;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: ConstraintStatus;
}

/**
 * Injury constraint with body part and restrictions
 */
export interface InjuryConstraint extends BaseConstraint {
  constraintType: 'injury';
  injuryBodyPart?: string;
  injurySeverity?: InjurySeverity;
  injuryRestrictions?: string[];
}

/**
 * Travel constraint with equipment/facility availability
 */
export interface TravelConstraint extends BaseConstraint {
  constraintType: 'travel';
  travelDestination?: string;
  travelEquipmentAvailable?: string[];
  travelFacilitiesAvailable?: string[];
}

/**
 * Availability constraint for reduced training time
 */
export interface AvailabilityConstraint extends BaseConstraint {
  constraintType: 'availability';
  availabilityHoursPerWeek?: number;
  availabilityDaysAvailable?: string[];
}

export type Constraint = InjuryConstraint | TravelConstraint | AvailabilityConstraint;

// =============================================================================
// DAILY CHECK-IN TYPES
// =============================================================================

export type TravelStatus = 'home' | 'traveling' | 'returning';
export type UserResponse = 'accepted' | 'modified' | 'skipped' | 'alternative';

/**
 * Body soreness mapping by area
 */
export interface SorenessAreas {
  legs?: number;
  back?: number;
  shoulders?: number;
  arms?: number;
  neck?: number;
  core?: number;
  [key: string]: number | undefined;
}

/**
 * Daily wellness check-in data
 */
export interface DailyCheckIn {
  id: string;
  athleteId: string;
  checkinDate: string;

  // Wellness metrics (1-10 scale)
  sleepQuality?: number;
  sleepHours?: number;
  energyLevel?: number;
  stressLevel?: number;
  overallSoreness?: number;

  // Specific soreness by body area
  sorenessAreas?: SorenessAreas;

  // Objective data
  restingHr?: number;
  hrvMs?: number;
  weightKg?: number;

  // Context for today
  availableTimeMinutes?: number;
  equipmentAccess?: string[];
  travelStatus?: TravelStatus;
  notes?: string;

  // AI recommendation
  aiRecommendation?: WorkoutRecommendation;
  aiRecommendationGeneratedAt?: string;

  // User response
  userResponse?: UserResponse;
  userResponseNotes?: string;
}

// =============================================================================
// TRAINING PLAN TYPES
// =============================================================================

export type PlanStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

/**
 * Training plan phase (e.g., base, build, peak, taper)
 */
export interface TrainingPhase {
  name: string;
  startWeek: number;
  endWeek: number;
  focus: string;
  description?: string;
}

/**
 * Weekly training structure template
 */
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
  workoutType?: string;
  durationMinutes?: number;
  intensity?: 'recovery' | 'easy' | 'moderate' | 'threshold' | 'hard';
}

/**
 * Plan adjustment record
 */
export interface PlanAdjustment {
  date: string;
  reason: string;
  changes: string;
  aiGenerated: boolean;
}

/**
 * Structured training plan
 */
export interface TrainingPlan {
  id: string;
  athleteId: string;
  title: string;
  description?: string;
  durationWeeks: number;
  startDate: string;
  endDate: string;
  targetGoalId?: string;
  status: PlanStatus;
  phases: TrainingPhase[];
  weeklyTemplate?: WeeklyTemplate;
  adjustmentsLog: PlanAdjustment[];
}

// =============================================================================
// ACTIVITY TYPES (from Intervals.icu)
// =============================================================================

export type ActivityType =
  | 'Ride'
  | 'Run'
  | 'Swim'
  | 'WeightTraining'
  | 'Walk'
  | 'Hike'
  | 'VirtualRide'
  | 'VirtualRun'
  | 'Other';

/**
 * Activity summary from Intervals.icu
 */
export interface Activity {
  id: string;
  name: string;
  type: ActivityType;
  startDate: string;
  movingTime: number; // seconds
  distance?: number; // meters
  totalElevationGain?: number; // meters
  averageHeartrate?: number;
  maxHeartrate?: number;
  averageWatts?: number;
  normalizedPower?: number;
  trainingLoad?: number; // TSS or equivalent
  icu_training_load?: number;
  intensity?: number; // IF
  description?: string;
}

/**
 * Wellness data from Intervals.icu
 */
export interface WellnessData {
  date: string;
  weight?: number;
  restingHR?: number;
  hrv?: number;
  sleepQuality?: number;
  sleepHours?: number;
  fatigue?: number;
  mood?: number;
  soreness?: number;
  stress?: number;
  notes?: string;
}

/**
 * Fitness metrics (CTL/ATL/TSB)
 */
export interface FitnessMetrics {
  date: string;
  ctl: number; // Chronic Training Load (fitness)
  atl: number; // Acute Training Load (fatigue)
  tsb: number; // Training Stress Balance (form)
  rampRate?: number;
}

// =============================================================================
// COACHING CONTEXT TYPES
// =============================================================================

/**
 * Complete context for AI coaching decisions
 */
export interface CoachingContext {
  // Athlete information
  athlete: AthleteProfile;

  // Current goals and constraints
  goals: Goal[];
  constraints: Constraint[];

  // Today's check-in data
  checkIn?: DailyCheckIn;

  // Recent training history
  recentActivities: Activity[];
  wellnessHistory: WellnessData[];

  // Fitness metrics
  fitnessMetrics?: FitnessMetrics;

  // Active training plan
  trainingPlan?: TrainingPlan;

  // Current phase context
  currentPhase?: TrainingPhase;
  weekInPlan?: number;

  // Calculated context
  daysToNextRace?: number;
  nextRaceGoal?: RaceGoal;
}

// =============================================================================
// WORKOUT RECOMMENDATION TYPES
// =============================================================================

export type WorkoutSport = 'swim' | 'bike' | 'run' | 'strength' | 'rest';
export type WorkoutIntensity =
  | 'recovery'
  | 'easy'
  | 'moderate'
  | 'tempo'
  | 'threshold'
  | 'vo2max'
  | 'sprint';

/**
 * Workout interval/segment
 */
export interface WorkoutSegment {
  name: string;
  durationMinutes?: number;
  distanceMeters?: number;
  intensity: WorkoutIntensity;
  instructions?: string;
  targetHR?: { min: number; max: number };
  targetPower?: { min: number; max: number };
  targetPace?: { minSecPerKm: number; maxSecPerKm: number };
}

/**
 * AI-generated workout recommendation
 */
export interface WorkoutRecommendation {
  id: string;
  sport: WorkoutSport;
  title: string;
  description: string;
  durationMinutes: number;
  intensity: WorkoutIntensity;
  estimatedTSS?: number;

  // Workout structure
  warmup?: WorkoutSegment;
  mainSet: WorkoutSegment[];
  cooldown?: WorkoutSegment;

  // Context and reasoning
  reasoning: string;
  adaptations?: string[];
  safetyNotes?: string[];

  // Alternatives
  alternatives?: {
    easier: string;
    harder: string;
    different: string;
  };
}

// =============================================================================
// AI CLIENT TYPES
// =============================================================================

export type CoachingScenario =
  | 'daily-checkin'
  | 'workout-recommendation'
  | 'plan-adjustment'
  | 'general-coaching';

/**
 * Options for AI coaching request
 */
export interface CoachingRequestOptions {
  scenario: CoachingScenario;
  context: CoachingContext;
  userMessage?: string;
}

/**
 * AI coaching response
 */
export interface CoachingResponse {
  message: string;
  recommendation?: WorkoutRecommendation;
  planAdjustments?: PlanAdjustment[];
  suggestedActions?: string[];
}

/**
 * Streaming chunk from AI response
 */
export interface CoachingStreamChunk {
  type: 'text' | 'recommendation' | 'done';
  content?: string;
  recommendation?: Partial<WorkoutRecommendation>;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isRaceGoal(goal: Goal): goal is RaceGoal {
  return goal.goalType === 'race';
}

export function isPerformanceGoal(goal: Goal): goal is PerformanceGoal {
  return goal.goalType === 'performance';
}

export function isFitnessGoal(goal: Goal): goal is FitnessGoal {
  return goal.goalType === 'fitness';
}

export function isHealthGoal(goal: Goal): goal is HealthGoal {
  return goal.goalType === 'health';
}

export function isInjuryConstraint(constraint: Constraint): constraint is InjuryConstraint {
  return constraint.constraintType === 'injury';
}

export function isTravelConstraint(constraint: Constraint): constraint is TravelConstraint {
  return constraint.constraintType === 'travel';
}

export function isAvailabilityConstraint(
  constraint: Constraint
): constraint is AvailabilityConstraint {
  return constraint.constraintType === 'availability';
}

// =============================================================================
// TRAINING LOAD VALIDATION TYPES
// =============================================================================

export type OvertrainingRisk = 'low' | 'moderate' | 'high' | 'critical';

/**
 * Result of training load validation
 */
export interface TrainingLoadValidation {
  isValid: boolean;
  risk: OvertrainingRisk;
  currentLoad: LoadMetrics;
  projectedLoad?: LoadMetrics;
  warnings: LoadWarning[];
  recommendations: string[];
}

export interface LoadMetrics {
  weeklyTSS: number;
  ctl: number;
  atl: number;
  tsb: number;
  rampRate: number;
  monotony?: number;
  strain?: number;
}

export interface LoadWarning {
  type: 'overreaching' | 'ramp_rate' | 'monotony' | 'strain' | 'consecutive_hard';
  severity: 'info' | 'warning' | 'danger';
  message: string;
  metric?: string;
  threshold?: number;
  actual?: number;
}

/**
 * Input for validating a proposed workout
 */
export interface ProposedWorkout {
  sport: Exclude<WorkoutSport, 'rest'>;
  durationMinutes: number;
  intensity: WorkoutIntensity;
  estimatedTSS?: number;
}

/**
 * Historical training data for validation context
 */
export interface TrainingHistory {
  /**
   * Daily aggregated training load.
   *
   * - `date` must be a calendar date in `YYYY-MM-DD` format (no time/timezone).
   * - Each entry represents the total TSS for that calendar day.
   * - There should be at most one entry per date.
   */
  activities: ReadonlyArray<{
    date: string;
    tss: number;
    intensity: string;
  }>;
  fitnessMetrics: FitnessMetrics;
  wellnessData?: WellnessData[];
}

// =============================================================================
// WORKOUT MODIFICATION TYPES
// =============================================================================

export const WORKOUT_INTENSITIES = [
  'recovery',
  'easy',
  'moderate',
  'tempo',
  'threshold',
  'vo2max',
  'sprint',
] as const;

export function isWorkoutIntensity(value: unknown): value is WorkoutIntensity {
  return (
    typeof value === 'string' && (WORKOUT_INTENSITIES as ReadonlyArray<string>).includes(value)
  );
}

export const INTENSITY_ORDER: Record<WorkoutIntensity, number> = {
  recovery: 0,
  easy: 1,
  moderate: 2,
  tempo: 3,
  threshold: 4,
  vo2max: 5,
  sprint: 6,
};

export type ModificationReason =
  | 'feeling_good'
  | 'feeling_bad'
  | 'time_constraint'
  | 'equipment_unavailable'
  | 'weather'
  | 'other';

export type ModificationWarningType =
  | 'intensity_jump'
  | 'load_increase'
  | 'constraint_violation'
  | 'fatigue_risk'
  | 'consecutive_hard_days'
  | 'duration_increase';

export interface ModificationWarning {
  readonly type: ModificationWarningType;
  readonly severity: 'info' | 'warning' | 'danger';
  readonly message: string;
}

export interface WorkoutModificationValidation {
  readonly isValid: boolean;
  readonly risk: 'low' | 'moderate' | 'high' | 'critical';
  readonly warnings: readonly ModificationWarning[];
  readonly recommendations: readonly string[];
  readonly suggestedModification?: ProposedWorkout;
}
