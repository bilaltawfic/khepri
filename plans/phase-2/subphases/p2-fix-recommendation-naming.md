# Fix: Standardize ai_recommendation JSON Shape to camelCase

## Problem

The `ai_recommendation` column (`Json` type) has inconsistent naming conventions across the codebase:

- **Integration tests** use snake_case: `{ workout_type, duration_minutes, intensity, rationale }`
- **AI client types** (`WorkoutRecommendation`) use camelCase: `{ durationMinutes, intensity, title, description, reasoning }`
- **Dashboard parser** uses camelCase: `{ workoutSuggestion, intensityLevel, duration, summary }`

Since the column is schemaless `Json`, any shape can be stored. This needs to be standardized before the AI service is wired to write real recommendations.

## Decision

**Standardize on camelCase** for the JSON payload contents. Rationale:

1. The producer (ai-client) and consumer (mobile app) are both TypeScript — camelCase is the standard convention
2. The database column _name_ (`ai_recommendation`) is correctly snake_case (Postgres convention), but the JSON _contents_ are application data, not schema identifiers
3. The snake_case in integration tests was manually inserted test data, not based on a real contract
4. The majority of the non-database codebase uses camelCase

## Scope

**Estimated effort:** <1 hour

### Files to Change

1. **`packages/supabase-client/src/__tests__/integration/checkins.integration.test.ts`**
   - Line ~239: Change `{ workout_type, duration_minutes, intensity, rationale }` to camelCase shape matching the parser expectations
   - Line ~322: Change `{ workout: 'pending_test' }` to a valid camelCase shape

2. **`packages/supabase-client/src/__tests__/queries/checkins.test.ts`**
   - Line ~57: Change `{ workout: 'Easy run' }` to a valid camelCase shape
   - Line ~260: Change `{ workout: 'Tempo run', duration: 45 }` to a valid camelCase shape

### Canonical Shape

The `parseRecommendation` function in `apps/mobile/hooks/useDashboard.ts` defines the expected shape:

```typescript
{
  workoutSuggestion: string;   // required
  summary: string;             // required
  intensityLevel: 'recovery' | 'easy' | 'moderate' | 'threshold' | 'hard'; // optional, defaults to 'moderate'
  duration: number;            // optional, defaults to 60
}
```

This should be aligned with or derived from the `WorkoutRecommendation` type in `packages/ai-client/src/types.ts`. Consider creating a shared `RecommendationSummary` type in `@khepri/core` if the full `WorkoutRecommendation` is too heavy for the JSON column.

### Out of Scope

- The `DayTemplate` type in `supabase-client` uses snake_case (`workout_type`, `duration_minutes`) — this is correct because it mirrors database column names for the `training_plans` table's JSONB structure. Do not change this.
- The `WorkoutRecommendation` type in ai-client is already camelCase. No changes needed there.

## Testing

- Run `pnpm test` — all existing tests should pass
- Run integration tests to verify the updated test data works against the real database
- Verify lint passes: `pnpm lint`
