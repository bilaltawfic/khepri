# P9D: Workout Generation Pipeline

## Date
2026-04-04

## Goals
Implement the workout generation pipeline for Phase 9D: DSL serializer, DSL validator, workout template engine with sport-specific templates (swim/bike/run), Claude-powered workout generation prompt, and week assembly logic.

## Key Decisions

1. **WorkoutStep.repeat as section-level repeat** — The `repeat` field on `WorkoutStep` is used to indicate section-level repeats in DSL output (e.g., `Main Set 4x`). The serializer checks all steps in a section for a repeat value > 1.

2. **Template registry pattern** — Used a global mutable registry with `registerTemplates()` / `clearTemplates()` for testability. Templates are registered at startup.

3. **Template selection fallback chain** — Exact match (sport + phase + focus + duration) → relaxed duration → same sport + phase → same sport. Closest duration range center is used for tiebreaking.

4. **Week assembler sport allocation** — Priority-weighted allocation: 1st sport gets ~50%, 2nd ~30%, 3rd ~20% of sessions. Hard/easy alternation prevents consecutive hard days.

5. **Claude tier vs template tier** — Template tier renders WorkoutStructure + DSL immediately. Claude tier leaves structure/dsl null for async generation.

## Files Changed

### New Files
- `packages/core/src/utils/dsl-serializer.ts` — WorkoutStructure → Intervals.icu DSL
- `packages/core/src/utils/dsl-validator.ts` — DSL syntax validation
- `packages/core/src/utils/week-assembler.ts` — Weekly workout allocation
- `packages/core/src/templates/workout-templates.ts` — Template engine
- `packages/core/src/templates/swim/index.ts` — 7 swim templates
- `packages/core/src/templates/bike/index.ts` — 9 bike templates
- `packages/core/src/templates/run/index.ts` — 10 run templates
- `packages/ai-client/src/prompts/workout-generation.ts` — Claude generation prompt + validation
- `packages/core/src/__tests__/dsl-serializer.test.ts` — 8 tests
- `packages/core/src/__tests__/dsl-validator.test.ts` — 27 tests
- `packages/core/src/__tests__/workout-templates.test.ts` — 40 tests
- `packages/core/src/__tests__/week-assembler.test.ts` — 11 tests
- `packages/ai-client/src/__tests__/workout-generation.test.ts` — 13 tests

### Modified Files
- `packages/core/src/utils/index.ts` — Added DSL and week assembly exports
- `packages/core/src/templates/index.ts` — Added workout template exports
- `packages/core/src/index.ts` — Added barrel exports
- `packages/ai-client/src/prompts/index.ts` — Added workout generation exports
- `packages/ai-client/src/index.ts` — Added workout generation exports

## Test Results
- Core: 720 tests passed (86 new)
- AI Client: 306 tests passed (13 new)
- Lint: 0 errors, 8 warnings
- Build: passes
- TypeCheck: passes (mobile pre-existing issue unrelated)

## Learnings
- Biome enforces `Number.POSITIVE_INFINITY` over `Infinity`
- Biome enforces optional chaining over manual null checks
- TypeScript strict mode requires explicit undefined guards for array indexing
- `CoachingContext` requires `recentActivities` and `wellnessHistory` arrays
