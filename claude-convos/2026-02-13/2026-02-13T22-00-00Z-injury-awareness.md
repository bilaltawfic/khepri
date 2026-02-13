# P4-B-02: Add Injury Awareness to AI Recommendations

## Date
2026-02-13

## Goal
Enhance both the `ai-coach` and `ai-orchestrator` Edge Functions so that injury constraints are deeply integrated into AI recommendations. Instead of passing constraints as simple title strings, the AI now receives structured injury data (body part, severity, restrictions) and has explicit system prompt instructions for injury-safe recommendations.

## Key Decisions

1. **Extended Orchestrator `Constraint` type** with optional `injury_body_part`, `injury_severity`, and `injury_restrictions` fields — backwards compatible, all optional
2. **Extended ai-coach constraint type** similarly with `injuryBodyPart`, `injurySeverity`, `injuryRestrictions` (using camelCase to match existing coach conventions)
3. **Added injury safety rules** to both system prompts — severity-based guidance (mild/moderate/severe)
4. **Added tool usage guidance** to orchestrator prompt — instructs Claude to use `check_constraint_compatibility` before recommending workouts with active injuries
5. **Set up test infrastructure** for supabase functions — new pnpm workspace, jest config, coverage reporting
6. **Exported `formatConstraint` and `formatCoachConstraint`** as testable, reusable functions

## Files Changed

- `supabase/functions/ai-orchestrator/types.ts` — Added injury fields to `Constraint` interface
- `supabase/functions/ai-orchestrator/prompts.ts` — Added `formatConstraint()`, injury safety rules, tool usage guidance
- `supabase/functions/ai-coach/prompts.ts` — Added `formatCoachConstraint()`, extended constraint type, injury safety guidelines
- `supabase/functions/ai-orchestrator/__tests__/prompts.test.ts` — 17 tests for orchestrator prompt building
- `supabase/functions/ai-coach/__tests__/prompts.test.ts` — 13 tests for coach prompt building
- `supabase/package.json` — New workspace package with jest/ts-jest test deps
- `supabase/jest.config.js` — ESM-compatible jest config handling `.ts` imports
- `pnpm-workspace.yaml` — Added `supabase` workspace
- `sonar-project.properties` — Added `supabase` to sources and coverage paths

## Learnings

- Supabase Edge Functions use Deno-style `.ts` imports, but the prompt/type files are pure TypeScript with no Deno-specific APIs, so they can be tested with Jest using `moduleNameMapper` to strip `.ts` extensions
- Biome enforces sorted imports and specific formatting — always run `biome check --write` before committing
