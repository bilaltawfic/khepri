# P4-A-04: Integrate AI Orchestrator with Context Builder

## Date
2026-02-14

## Goals
- Enable the ai-orchestrator edge function to automatically fetch athlete context from the database when given an `athlete_id`
- Add fitness threshold fields (running pace, CSS, HR zones) to athlete context
- Enrich goal details with race-specific information
- Add HR metrics (resting HR, HRV) to daily check-in context
- Maintain backward compatibility with manual `athlete_context` passing

## Key Decisions
1. **DB-to-type mapping**: The context builder maps DB column names (e.g., `constraint_type`) to type interface names (e.g., `type`) to maintain clean API contracts
2. **Parallel fetching**: All 4 data sources (athlete, goals, constraints, check-in) are fetched via `Promise.all` for performance
3. **Graceful degradation**: Goals/constraints DB errors result in empty arrays rather than throwing, while athlete-not-found is a hard error
4. **Format helpers exported**: `formatPace`, `formatSwimPace`, `formatRaceTime` are exported for testability
5. **Optional chaining in tests**: Used `?.` instead of `!` for Biome compliance

## Files Changed
- `supabase/functions/ai-orchestrator/types.ts` - Added `athlete_id` to request, fitness thresholds to `AthleteContext`, race fields to `Goal`, HR fields to `CheckinSummary`
- `supabase/functions/ai-orchestrator/context-builder.ts` - NEW: Fetches and assembles athlete context from Supabase
- `supabase/functions/ai-orchestrator/prompts.ts` - Added fitness thresholds section, race goal details, HR metrics in check-in, pace/time formatters
- `supabase/functions/ai-orchestrator/index.ts` - Added auto-fetch logic when `athlete_id` provided without `athlete_context`
- `supabase/functions/ai-orchestrator/__tests__/context-builder.test.ts` - NEW: 10 tests covering happy path, errors, edge cases, parallel execution
- `supabase/functions/ai-orchestrator/__tests__/prompts.test.ts` - Added tests for fitness thresholds, race goals, HR metrics, formatPace, formatSwimPace, formatRaceTime
- `supabase/jest.config.js` - Added context-builder.ts to coverage collection

## Learnings
- In ESM mode with ts-jest, `jest` global is not available - must import from `@jest/globals`
- Biome auto-fix (`--write`) handles formatting but not unsafe fixes; need `--write --unsafe` for non-null assertion fixes
- Supabase mock chains need per-table instances to control responses independently
