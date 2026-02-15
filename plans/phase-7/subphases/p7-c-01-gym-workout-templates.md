# P7-C-01: Add Gym Workout Templates

## Goal

Create a gym workout template system in `packages/core/src/templates/gym.ts` that provides structured strength training templates for different goals (general fitness, cycling strength, injury prevention, core stability). Templates include exercises with sets, reps, rest periods, and estimated duration/TSS. These templates will be consumed by the mobile app's ad-hoc workout screen (P7-C-03) and potentially by the AI orchestrator for workout suggestions.

## Dependencies

- None (standalone task)

## Files to Create

1. `packages/core/src/types/templates.ts` — Template type definitions
2. `packages/core/src/templates/gym.ts` — Gym workout template data
3. `packages/core/src/templates/index.ts` — Templates barrel export
4. `packages/core/src/__tests__/gym-templates.test.ts` — Validation tests

## Files to Modify

1. `packages/core/src/types/index.ts` — Export template types
2. `packages/core/src/index.ts` — Export templates

## Implementation Steps

### Step 1: Define Template Types

Create `packages/core/src/types/templates.ts`:

```ts
/** Difficulty levels for workout templates */
export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

/** Workout categories */
export const WORKOUT_CATEGORIES = ['strength', 'mobility', 'core', 'plyometric'] as const;
export type WorkoutCategory = (typeof WORKOUT_CATEGORIES)[number];

/** Target muscle groups */
export const MUSCLE_GROUPS = [
  'quadriceps', 'hamstrings', 'glutes', 'calves',
  'core', 'hip_flexors', 'lower_back', 'upper_back',
  'shoulders', 'chest', 'arms',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** A single exercise within a workout template */
export type Exercise = {
  readonly name: string;
  readonly sets: number;
  readonly reps: number | string; // number or range like "8-12" or duration like "30s"
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
```

### Step 2: Create Gym Workout Templates

Create `packages/core/src/templates/gym.ts`:

Provide 6-8 curated templates covering common cyclist strength needs:

1. **`cycling-lower-body`** — Lower body strength for cyclists
   - Category: strength, Difficulty: intermediate
   - Exercises: squats, Romanian deadlifts, Bulgarian split squats, calf raises, single-leg press
   - Target: quadriceps, hamstrings, glutes, calves
   - Est. 45 min, ~40 TSS

2. **`core-stability`** — Core stability for endurance athletes
   - Category: core, Difficulty: beginner
   - Exercises: plank, side plank, dead bug, bird dog, Pallof press, hollow hold
   - Target: core, lower_back, hip_flexors
   - Est. 30 min, ~20 TSS

3. **`injury-prevention`** — Injury prevention and prehab
   - Category: mobility, Difficulty: beginner
   - Exercises: single-leg balance, clamshells, IT band stretch, hip flexor stretch, foam rolling movements
   - Target: hip_flexors, glutes, hamstrings, calves
   - Est. 25 min, ~15 TSS

4. **`upper-body-balance`** — Upper body to balance cycling posture
   - Category: strength, Difficulty: intermediate
   - Exercises: rows, reverse flyes, face pulls, push-ups, shoulder external rotation
   - Target: upper_back, shoulders, chest, arms
   - Est. 35 min, ~30 TSS

5. **`explosive-power`** — Plyometric power development
   - Category: plyometric, Difficulty: advanced
   - Exercises: box jumps, jump squats, lunge jumps, kettlebell swings, power cleans
   - Target: quadriceps, glutes, hamstrings, calves
   - Est. 40 min, ~50 TSS

6. **`full-body-maintenance`** — Full-body maintenance during taper
   - Category: strength, Difficulty: beginner
   - Exercises: goblet squats, push-ups, TRX rows, glute bridges, plank
   - Target: quadriceps, glutes, core, upper_back, chest
   - Est. 30 min, ~25 TSS

Export as `GYM_TEMPLATES: readonly WorkoutTemplate[]` and helper functions:
- `getGymTemplateById(id: string): WorkoutTemplate | undefined`
- `getGymTemplatesByCategory(category: WorkoutCategory): WorkoutTemplate[]`
- `getGymTemplatesByDifficulty(difficulty: DifficultyLevel): WorkoutTemplate[]`

### Step 3: Create Templates Barrel Export

Create `packages/core/src/templates/index.ts`:

```ts
export {
  GYM_TEMPLATES,
  getGymTemplateById,
  getGymTemplatesByCategory,
  getGymTemplatesByDifficulty,
} from './gym.js';
```

### Step 4: Wire Exports

Update `packages/core/src/types/index.ts` — add section:

```ts
// ==== Templates ====
export type {
  DifficultyLevel,
  Exercise,
  MuscleGroup,
  WorkoutCategory,
  WorkoutTemplate,
} from './templates.js';
export {
  DIFFICULTY_LEVELS,
  MUSCLE_GROUPS,
  WORKOUT_CATEGORIES,
  isDifficultyLevel,
  isWorkoutCategory,
} from './templates.js';
```

Update `packages/core/src/index.ts` — add section:

```ts
// ==== Template Types ====
export type {
  DifficultyLevel,
  Exercise,
  MuscleGroup,
  WorkoutCategory,
  WorkoutTemplate,
} from './types/index.js';
export {
  DIFFICULTY_LEVELS,
  MUSCLE_GROUPS,
  WORKOUT_CATEGORIES,
  isDifficultyLevel,
  isWorkoutCategory,
} from './types/index.js';

// ==== Templates ====
export {
  GYM_TEMPLATES,
  getGymTemplateById,
  getGymTemplatesByCategory,
  getGymTemplatesByDifficulty,
} from './templates/index.js';
```

### Step 5: Write Tests

Create `packages/core/src/__tests__/gym-templates.test.ts`:

**Template validation tests:**
- All templates have unique IDs
- All templates have valid `category` (use `isWorkoutCategory` type guard)
- All templates have valid `difficulty` (use `isDifficultyLevel` type guard)
- All exercises have `sets > 0`, `restSeconds >= 0`
- All exercise `targetMuscles` are valid `MuscleGroup` values
- Template `targetMuscles` is a superset of exercise `targetMuscles`
- `estimatedDurationMinutes > 0` and `estimatedTss >= 0`
- No empty `exercises` arrays
- `tags` arrays are non-empty

**Lookup function tests:**
- `getGymTemplateById()` returns correct template
- `getGymTemplateById()` returns `undefined` for unknown ID
- `getGymTemplatesByCategory('strength')` returns only strength templates
- `getGymTemplatesByCategory('core')` returns only core templates
- `getGymTemplatesByDifficulty('beginner')` returns only beginner templates
- `getGymTemplatesByDifficulty('advanced')` returns only advanced templates

**Type guard tests:**
- `isDifficultyLevel()` accepts valid values, rejects invalid
- `isWorkoutCategory()` accepts valid values, rejects invalid

## Code Patterns to Follow

- Derive types from const arrays: `typeof CONST[number]` (single source of truth)
- Type guards accept `unknown` with `typeof` checks
- ESM `.js` extensions in all imports
- Section comments in barrel exports: `// ==== Templates ====`
- `readonly` on all type properties and arrays
- Named exports, no default exports

## Testing Requirements

- All templates pass structural validation
- All lookup functions work correctly
- Type guards accept/reject correctly
- Run `pnpm test` — all tests pass
- Run `pnpm lint` — no lint errors
- Run `pnpm typecheck` — no type errors

## Verification

1. `pnpm test` passes
2. `pnpm lint` passes
3. `pnpm build` passes
4. All template types are importable from `@khepri/core`
5. All gym templates are importable from `@khepri/core`
6. Lookup functions return correct results
