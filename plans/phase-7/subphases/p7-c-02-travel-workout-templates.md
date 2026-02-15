# P7-C-02: Travel Workout Templates

## Goal

Add travel-friendly workout templates to `@khepri/core` that mirror the existing gym template system. These are bodyweight-focused workouts designed for athletes traveling without gym access (hotel rooms, parks, minimal/no equipment).

## Dependencies

- P7-C-01 (Gym workout templates) — **COMPLETE** (#108)

## Files to Create

| File | Purpose |
|------|---------|
| `packages/core/src/templates/travel.ts` | Travel template data + lookup functions |
| `packages/core/src/__tests__/travel-templates.test.ts` | Template validation tests |

## Files to Modify

| File | Change |
|------|--------|
| `packages/core/src/templates/index.ts` | Add travel template exports |
| `packages/core/src/index.ts` | Add travel template re-exports |

## Implementation Steps

### 1. Create `packages/core/src/templates/travel.ts`

Mirror the exact structure of `gym.ts`. Create 5-6 travel workout templates:

1. **`hotel-room-circuit`** (core, beginner, ~20min, TSS ~15)
   - Bodyweight-only circuit for small spaces
   - Exercises: Push-ups, bodyweight squats, plank, mountain climbers, lunges, glute bridges

2. **`park-strength`** (strength, intermediate, ~35min, TSS ~30)
   - Uses benches, bars, and open space
   - Exercises: Step-ups, bench dips, pull-ups (if bar available), pistol squats, push-up variations

3. **`band-resistance-travel`** (strength, intermediate, ~30min, TSS ~25)
   - Resistance band only (packable)
   - Exercises: Band squats, band pull-aparts, band deadlifts, lateral walks, band rows

4. **`airport-mobility`** (mobility, beginner, ~15min, TSS ~10)
   - Quick mobility routine for long travel days
   - Exercises: Standing quad stretch, hip circles, ankle circles, thoracic rotations, neck stretches

5. **`bodyweight-hiit`** (plyometric, advanced, ~25min, TSS ~40)
   - High-intensity bodyweight intervals
   - Exercises: Burpees, jump squats, high knees, push-up to t-rotation, tuck jumps

6. **`yoga-for-cyclists`** (mobility, beginner, ~30min, TSS ~10)
   - Yoga-inspired flexibility routine targeting cycling tightness
   - Exercises: Downward dog, pigeon pose, figure-4 stretch, cat-cow, child's pose, thread the needle

Include lookup functions mirroring `gym.ts`:

```typescript
import type { DifficultyLevel, WorkoutCategory, WorkoutTemplate } from '../types/templates.js';

export const TRAVEL_TEMPLATES: readonly WorkoutTemplate[] = [ ... ];

export function getTravelTemplateById(id: string): WorkoutTemplate | undefined {
  return TRAVEL_TEMPLATES.find((t) => t.id === id);
}

export function getTravelTemplatesByCategory(category: WorkoutCategory): WorkoutTemplate[] {
  return TRAVEL_TEMPLATES.filter((t) => t.category === category);
}

export function getTravelTemplatesByDifficulty(difficulty: DifficultyLevel): WorkoutTemplate[] {
  return TRAVEL_TEMPLATES.filter((t) => t.difficulty === difficulty);
}
```

### 2. Create `packages/core/src/__tests__/travel-templates.test.ts`

Mirror `gym-templates.test.ts` structure exactly:

- Validate each template has unique ID
- Validate category and difficulty are valid enum values
- Validate duration > 0 and TSS >= 0
- Validate each exercise has sets > 0, restSeconds >= 0, valid target muscles
- Validate template-level targetMuscles covers all exercise muscles
- Test lookup functions (known ID, unknown ID, empty string)
- Test category/difficulty filtering

### 3. Update `packages/core/src/templates/index.ts`

Add travel exports:

```typescript
export {
  GYM_TEMPLATES,
  getGymTemplateById,
  getGymTemplatesByCategory,
  getGymTemplatesByDifficulty,
} from './gym.js';

export {
  TRAVEL_TEMPLATES,
  getTravelTemplateById,
  getTravelTemplatesByCategory,
  getTravelTemplatesByDifficulty,
} from './travel.js';
```

### 4. Update `packages/core/src/index.ts`

Add travel template re-exports in the `// ==== Templates ====` section:

```typescript
export {
  GYM_TEMPLATES,
  getGymTemplateById,
  getGymTemplatesByCategory,
  getGymTemplatesByDifficulty,
  TRAVEL_TEMPLATES,
  getTravelTemplateById,
  getTravelTemplatesByCategory,
  getTravelTemplatesByDifficulty,
} from './templates/index.js';
```

## Code Patterns to Follow

- All imports use `.js` extensions (ESM)
- Use `readonly` on all type properties and arrays
- Export const arrays with `as const`
- Template IDs are kebab-case
- Tags include 'cycling' and relevant keywords
- All exercises have `targetMuscles` arrays using valid `MuscleGroup` values
- Template-level `targetMuscles` is the union of all exercise target muscles

## Testing Requirements

- Run `pnpm test` — all tests pass
- Run `pnpm lint` — no lint errors (Biome sorted imports)
- Run `pnpm build` — builds cleanly
- Run `pnpm typecheck` — no type errors

## Verification Checklist

- [ ] 5-6 travel templates created with realistic exercises
- [ ] All template IDs unique (no collision with gym template IDs)
- [ ] Categories and difficulties use valid enum values
- [ ] All exercises have valid MuscleGroup targets
- [ ] Lookup functions work correctly
- [ ] Barrel exports updated in `templates/index.ts` and `src/index.ts`
- [ ] Tests mirror `gym-templates.test.ts` structure
- [ ] `pnpm test && pnpm lint && pnpm build && pnpm typecheck` all pass
- [ ] Conversation log created in `claude-convos/2026-02-15/`
