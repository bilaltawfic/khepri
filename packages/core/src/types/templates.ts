/** Difficulty levels for workout templates */
export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

/** Workout categories */
export const WORKOUT_CATEGORIES = ['strength', 'mobility', 'core', 'plyometric'] as const;
export type WorkoutCategory = (typeof WORKOUT_CATEGORIES)[number];

/** Target muscle groups */
export const MUSCLE_GROUPS = [
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'hip_flexors',
  'lower_back',
  'upper_back',
  'shoulders',
  'chest',
  'arms',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** A single exercise within a workout template */
export type Exercise = {
  readonly name: string;
  readonly sets: number;
  readonly reps: number | string;
  readonly restSeconds: number;
  readonly notes?: string;
  readonly targetMuscles: readonly MuscleGroup[];
};

/** A workout template */
export type WorkoutTemplate = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: WorkoutCategory;
  readonly difficulty: DifficultyLevel;
  readonly estimatedDurationMinutes: number;
  readonly estimatedTss: number;
  readonly exercises: readonly Exercise[];
  readonly targetMuscles: readonly MuscleGroup[];
  readonly tags: readonly string[];
};

/** Type guard for DifficultyLevel */
export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return typeof value === 'string' && (DIFFICULTY_LEVELS as readonly string[]).includes(value);
}

/** Type guard for WorkoutCategory */
export function isWorkoutCategory(value: unknown): value is WorkoutCategory {
  return typeof value === 'string' && (WORKOUT_CATEGORIES as readonly string[]).includes(value);
}

/** Type guard for MuscleGroup */
export function isMuscleGroup(value: unknown): value is MuscleGroup {
  return typeof value === 'string' && (MUSCLE_GROUPS as readonly string[]).includes(value);
}
