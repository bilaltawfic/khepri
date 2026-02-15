# P7-C-01: Gym Workout Templates

## Goals
- Create a gym workout template system in `@khepri/core` for structured strength training
- Provide 6 curated templates for cyclists: lower body, core stability, injury prevention, upper body balance, explosive power, full-body maintenance
- Include lookup functions for querying templates by ID, category, and difficulty

## Key Decisions
- Template types derived from const arrays (`DIFFICULTY_LEVELS`, `WORKOUT_CATEGORIES`, `MUSCLE_GROUPS`) for single source of truth
- Type guards (`isDifficultyLevel`, `isWorkoutCategory`) accept `unknown` with `typeof` checks for runtime validation
- All type properties and arrays marked `readonly` for immutability
- Templates include `estimatedTss` alongside duration for integration with training load tracking
- Exercises support both numeric reps and string reps (e.g., "8-12", "30s") for flexibility

## Files Changed
- `packages/core/src/types/templates.ts` — New: template type definitions, const arrays, type guards
- `packages/core/src/templates/gym.ts` — New: 6 gym workout templates + lookup functions
- `packages/core/src/templates/index.ts` — New: barrel export for templates
- `packages/core/src/types/index.ts` — Modified: export template types
- `packages/core/src/index.ts` — Modified: export template types and templates
- `packages/core/src/__tests__/gym-templates.test.ts` — New: validation + lookup tests

## Learnings
- Biome enforces multi-line formatting for arrays with many string items (8+ elements)
- Using `for...of` with `describe` blocks allows parameterized test generation across all templates and exercises
