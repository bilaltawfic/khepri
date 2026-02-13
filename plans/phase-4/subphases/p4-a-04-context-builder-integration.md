# P4-A-04: Integrate AI Orchestrator with Context Builder

## Goal

Enable the ai-orchestrator edge function to automatically fetch and assemble comprehensive athlete context from the database, rather than relying on the caller to pass pre-assembled context. This provides richer, more consistent context for AI coaching responses.

## Current State

- The ai-orchestrator accepts an optional `athlete_context` in the request body
- Callers must manually assemble context before calling the orchestrator
- The `ai-client` package has a comprehensive `context-builder.ts` (Node/NPM) that cannot be directly imported in Deno edge functions
- The `supabase-client` package has query functions for all needed data sources

## Target State

- The orchestrator fetches context automatically when given an `athlete_id`
- Backward compatible: still accepts manually-passed `athlete_context`
- Context includes: athlete profile, active goals, active constraints, today's check-in
- All data fetched in parallel for performance

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/ai-orchestrator/context-builder.ts` | Fetch and assemble athlete context from DB |
| `supabase/functions/ai-orchestrator/__tests__/context-builder.test.ts` | Unit tests for context builder |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/ai-orchestrator/index.ts` | Add auto-fetch logic when `athlete_id` provided without `athlete_context` |
| `supabase/functions/ai-orchestrator/types.ts` | Update `OrchestratorRequest` to support `athlete_id` field |
| `supabase/functions/ai-orchestrator/prompts.ts` | Enhance `buildSystemPrompt()` with additional context sections |

## Implementation Steps

### Step 1: Update Request Types (`types.ts`)

Add `athlete_id` as an optional field to `OrchestratorRequest`:

```typescript
export interface OrchestratorRequest {
  messages: Message[];
  athlete_context?: AthleteContext;  // existing - manual context
  athlete_id?: string;               // NEW - auto-fetch context
  stream?: boolean;
}
```

Update `AthleteContext` to include richer fields:

```typescript
export interface AthleteContext {
  athlete_id: string;
  display_name?: string;
  ftp_watts?: number;
  weight_kg?: number;
  running_threshold_pace_sec_per_km?: number;
  css_sec_per_100m?: number;
  max_heart_rate?: number;
  lthr?: number;
  active_goals: ActiveGoal[];
  active_constraints: ActiveConstraint[];
  recent_checkin?: RecentCheckin;
}

export interface ActiveGoal {
  id: string;
  title: string;
  goal_type: string;
  target_date?: string;
  priority: number;
  race_event_name?: string;
  race_distance?: string;
  race_target_time_seconds?: number;
}

export interface ActiveConstraint {
  id: string;
  constraint_type: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  injury_body_part?: string;
  injury_severity?: string;
  injury_restrictions?: string[];
}

export interface RecentCheckin {
  checkin_date: string;
  energy_level?: number;
  sleep_quality?: number;
  stress_level?: number;
  muscle_soreness?: number;
  resting_hr?: number;
  hrv_ms?: number;
}
```

### Step 2: Create Context Builder (`context-builder.ts`)

```typescript
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { AthleteContext } from './types.ts';

export interface ContextBuilderOptions {
  includeCheckin?: boolean; // default true
}

export async function fetchAthleteContext(
  supabase: SupabaseClient,
  athleteId: string,
  options?: ContextBuilderOptions,
): Promise<AthleteContext> {
  const includeCheckin = options?.includeCheckin !== false;
  const today = new Date().toISOString().split('T')[0];

  // Fetch all data in parallel
  const [athleteResult, goalsResult, constraintsResult, checkinResult] = await Promise.all([
    supabase
      .from('athletes')
      .select('id, display_name, ftp_watts, weight_kg, running_threshold_pace_sec_per_km, css_sec_per_100m, max_heart_rate, lthr')
      .eq('id', athleteId)
      .single(),
    supabase
      .from('goals')
      .select('id, title, goal_type, target_date, priority, race_event_name, race_distance, race_target_time_seconds')
      .eq('athlete_id', athleteId)
      .eq('status', 'active')
      .order('priority'),
    supabase
      .from('constraints')
      .select('id, constraint_type, description, start_date, end_date, injury_body_part, injury_severity, injury_restrictions')
      .eq('athlete_id', athleteId)
      .eq('status', 'active')
      .or(`end_date.is.null,end_date.gte.${today}`),
    includeCheckin
      ? supabase
          .from('daily_checkins')
          .select('checkin_date, energy_level, sleep_quality, stress_level, muscle_soreness, resting_hr, hrv_ms')
          .eq('athlete_id', athleteId)
          .eq('checkin_date', today)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (athleteResult.error != null) {
    throw new Error(`Failed to fetch athlete: ${athleteResult.error.message}`);
  }

  if (athleteResult.data == null) {
    throw new Error(`Athlete not found: ${athleteId}`);
  }

  const athlete = athleteResult.data;

  return {
    athlete_id: athleteId,
    display_name: athlete.display_name ?? undefined,
    ftp_watts: athlete.ftp_watts ?? undefined,
    weight_kg: athlete.weight_kg ?? undefined,
    running_threshold_pace_sec_per_km: athlete.running_threshold_pace_sec_per_km ?? undefined,
    css_sec_per_100m: athlete.css_sec_per_100m ?? undefined,
    max_heart_rate: athlete.max_heart_rate ?? undefined,
    lthr: athlete.lthr ?? undefined,
    active_goals: goalsResult.data ?? [],
    active_constraints: constraintsResult.data ?? [],
    recent_checkin: checkinResult.data ?? undefined,
  };
}
```

### Step 3: Enhance System Prompt (`prompts.ts`)

Add sections for new context fields:

- **Fitness thresholds** - running pace, CSS, HR zones (if available)
- **Goal details** - race event name, distance, target time (for race goals)
- **Constraint details** - injury body part, severity, restrictions list

Example additions to `buildSystemPrompt()`:

```typescript
// Fitness thresholds section
if (context.running_threshold_pace_sec_per_km != null || context.css_sec_per_100m != null) {
  sections.push('## Fitness Thresholds');
  if (context.running_threshold_pace_sec_per_km != null) {
    const pace = formatPace(context.running_threshold_pace_sec_per_km);
    sections.push(`- Running Threshold Pace: ${pace}/km`);
  }
  if (context.css_sec_per_100m != null) {
    const css = formatSwimPace(context.css_sec_per_100m);
    sections.push(`- CSS: ${css}/100m`);
  }
  if (context.max_heart_rate != null) {
    sections.push(`- Max HR: ${context.max_heart_rate} bpm`);
  }
  if (context.lthr != null) {
    sections.push(`- LTHR: ${context.lthr} bpm`);
  }
}
```

### Step 4: Update Main Handler (`index.ts`)

Add auto-fetch logic at the start of request handling:

```typescript
// Resolve athlete context
let athleteContext = requestBody.athlete_context;

if (athleteContext == null && requestBody.athlete_id != null) {
  try {
    athleteContext = await fetchAthleteContext(supabase, requestBody.athlete_id);
  } catch (err) {
    return errorResponse(
      `Failed to fetch athlete context: ${err instanceof Error ? err.message : 'Unknown error'}`,
      500,
    );
  }
}

// Pass context to prompt builder (existing code)
const systemPrompt = buildSystemPrompt(athleteContext);
```

### Step 5: Write Tests (`__tests__/context-builder.test.ts`)

Test cases:

1. **Happy path** - All data fetched successfully, context assembled correctly
2. **Athlete not found** - Throws descriptive error
3. **DB error on athlete fetch** - Throws with error message
4. **No active goals** - Returns empty array, no error
5. **No active constraints** - Returns empty array, no error
6. **No check-in today** - `recent_checkin` is undefined
7. **Null optional fields** - Mapped to undefined (not null)
8. **Goals/constraints DB errors** - Graceful handling (empty arrays or throw)
9. **Parallel execution** - All queries fire concurrently (mock timing)
10. **includeCheckin=false** - Skips check-in query

Mock pattern (following existing test conventions):

```typescript
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
};
```

## Testing Requirements

- All new functions have unit tests
- Mock Supabase client responses (no real DB calls)
- Test edge cases: missing data, DB errors, null fields
- Run `pnpm test` from monorepo root
- Run `pnpm lint` to verify no Biome issues

## Verification

1. `pnpm test` passes with new tests
2. `pnpm lint` passes
3. `pnpm typecheck` passes (if applicable to Deno functions)
4. Context builder fetches all required data in parallel
5. Backward compatible: existing `athlete_context` field still works
6. New `athlete_id` field triggers auto-fetch
7. Enhanced system prompt includes fitness thresholds and detailed goal/constraint info

## Dependencies

- P4-A-01 ✅ (ai-orchestrator scaffold)
- P4-A-02 ✅ (tool execution pipeline)
- P4-A-03 ✅ (streaming support)

## Estimated Scope

~150-200 lines of new code + ~200 lines of tests. Should fit within a single focused PR.
