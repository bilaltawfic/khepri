# P6-B-04: Build Plan Generation Edge Function

## Goal

Create a `generate-plan` Supabase Edge Function that generates structured training plans. It fetches athlete context (goals, constraints, fitness metrics), uses `@khepri/core` periodization utilities to calculate phase breakdowns and weekly volumes, optionally calls Claude for AI-enhanced reasoning, and returns a `TrainingPlanInsert` object ready for database persistence.

**Dependencies:**
- P6-B-02 (training plan queries) — assumed complete
- P6-B-03 (periodization logic) — complete (#96)

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `supabase/functions/generate-plan/index.ts` | Main Edge Function handler |
| `supabase/functions/generate-plan/types.ts` | Request/response type definitions |
| `supabase/functions/generate-plan/plan-builder.ts` | Core plan construction logic |
| `supabase/functions/generate-plan/__tests__/plan-builder.test.ts` | Unit tests for plan builder |

### No Modified Files
This is a new standalone Edge Function. No existing files need modification.

## Implementation Steps

### Step 1: Define Types (`types.ts`)

```typescript
// types.ts — Request/response types for generate-plan Edge Function

export interface GeneratePlanRequest {
  /** Specific goal to build the plan toward (optional). */
  goal_id?: string;
  /** Plan start date in YYYY-MM-DD format (defaults to today). */
  start_date?: string;
  /** Total plan duration in weeks, 4-52 (defaults to 12 or derived from goal target_date). */
  total_weeks?: number;
}

export interface GeneratePlanResponse {
  success: true;
  plan: TrainingPlanPayload;
  reasoning?: string;
}

/** Shape matching TrainingPlanInsert from supabase-client/src/types.ts:425-439. */
export interface TrainingPlanPayload {
  athlete_id: string;
  name: string;
  description: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  total_weeks: number;
  status: 'active';
  goal_id: string | null;
  periodization: PeriodizationData;
  weekly_template: null; // Populated later via AI or user
  adaptations: [];
}

/** Structured periodization data stored in JSONB column. */
export interface PeriodizationData {
  total_weeks: number;
  phases: PhaseEntry[];
  weekly_volumes: VolumeEntry[];
}

export interface PhaseEntry {
  phase: string;
  weeks: number;
  focus: string;
  intensity_distribution: [number, number, number];
}

export interface VolumeEntry {
  week: number;
  volume_multiplier: number;
  phase: string;
}

export interface GoalData {
  id: string;
  title: string;
  goal_type: string | null;
  target_date: string | null;
  race_event_name: string | null;
  race_distance: string | null;
  priority: string | null;
}

export interface AthleteData {
  id: string;
  display_name: string | null;
}
```

### Step 2: Build Plan Logic (`plan-builder.ts`)

This is the core business logic — **pure functions, no I/O, fully testable**.

```typescript
// plan-builder.ts

import type {
  GoalData,
  AthleteData,
  PeriodizationData,
  TrainingPlanPayload,
} from './types.ts';

// Import periodization from @khepri/core via HTTP
// Note: Deno Edge Functions can't use npm: imports for local packages.
// Instead, inline the periodization logic or use HTTP import from bundled source.
// For now, implement locally and note that a shared import would be ideal.

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MIN_WEEKS = 4;
const MAX_WEEKS = 52;
const DEFAULT_WEEKS = 12;

/**
 * Calculate total weeks from start date to a goal target date.
 * Returns null if the goal has no target_date or date is in the past.
 */
export function weeksUntilGoal(startDate: string, targetDate: string): number | null {
  if (!ISO_DATE_PATTERN.test(startDate) || !ISO_DATE_PATTERN.test(targetDate)) {
    return null;
  }
  const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
  const targetMs = new Date(`${targetDate}T00:00:00Z`).getTime();
  if (targetMs <= startMs) return null;
  const weeks = Math.floor((targetMs - startMs) / MS_PER_WEEK);
  if (weeks < MIN_WEEKS) return MIN_WEEKS;
  if (weeks > MAX_WEEKS) return MAX_WEEKS;
  return weeks;
}

/**
 * Calculate end date from start date + total weeks.
 */
export function calculateEndDate(startDate: string, totalWeeks: number): string {
  const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
  const endMs = startMs + totalWeeks * MS_PER_WEEK - MS_PER_DAY;
  return new Date(endMs).toISOString().split('T')[0];
}

/**
 * Generate a friendly plan name from context.
 */
export function generatePlanName(
  totalWeeks: number,
  goal: GoalData | null,
  phases: readonly { phase: string }[]
): string {
  const phaseNames = phases.map((p) => capitalize(p.phase)).join(' → ');
  if (goal?.race_event_name) {
    return `${totalWeeks}-Week Plan: ${goal.race_event_name}`;
  }
  if (goal?.title) {
    return `${totalWeeks}-Week Plan: ${goal.title}`;
  }
  return `${totalWeeks}-Week ${phaseNames}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Resolve total weeks from request + goal context.
 * Priority: explicit total_weeks > derived from goal target_date > default 12.
 */
export function resolveTotalWeeks(
  requestWeeks: number | undefined,
  startDate: string,
  goal: GoalData | null
): number {
  if (requestWeeks != null) {
    return Math.max(MIN_WEEKS, Math.min(MAX_WEEKS, requestWeeks));
  }
  if (goal?.target_date != null) {
    const derived = weeksUntilGoal(startDate, goal.target_date);
    if (derived != null) return derived;
  }
  return DEFAULT_WEEKS;
}

/**
 * Build a complete training plan payload.
 * This is a pure function — all I/O should happen before calling it.
 */
export function buildTrainingPlan(
  athlete: AthleteData,
  goal: GoalData | null,
  startDate: string,
  totalWeeks: number,
  periodization: PeriodizationData
): TrainingPlanPayload {
  return {
    athlete_id: athlete.id,
    name: generatePlanName(totalWeeks, goal, periodization.phases),
    description: goal
      ? `Training plan targeting ${goal.title}${goal.target_date ? ` on ${goal.target_date}` : ''}`
      : `${totalWeeks}-week general training plan`,
    start_date: startDate,
    end_date: calculateEndDate(startDate, totalWeeks),
    total_weeks: totalWeeks,
    status: 'active',
    goal_id: goal?.id ?? null,
    periodization,
    weekly_template: null,
    adaptations: [],
  };
}
```

### Step 3: Main Handler (`index.ts`)

Follow the auth + CORS pattern from `ai-orchestrator/index.ts` (lines 26-47, 90-158):

```typescript
// index.ts — generate-plan Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import {
  buildTrainingPlan,
  calculateEndDate,
  resolveTotalWeeks,
} from './plan-builder.ts';
import type {
  AthleteData,
  GeneratePlanRequest,
  GeneratePlanResponse,
  GoalData,
  PeriodizationData,
} from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_WEEKS = 4;
const MAX_WEEKS = 52;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error }, status);
}

/**
 * Runtime validation of the request body.
 * Returns an error message, or null if valid.
 */
function validateRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }
  const obj = body as Record<string, unknown>;

  if (obj.goal_id != null && typeof obj.goal_id !== 'string') {
    return 'goal_id must be a string';
  }
  if (obj.start_date != null) {
    if (typeof obj.start_date !== 'string' || !ISO_DATE_PATTERN.test(obj.start_date)) {
      return 'start_date must be in YYYY-MM-DD format';
    }
  }
  if (obj.total_weeks != null) {
    if (typeof obj.total_weeks !== 'number' || !Number.isInteger(obj.total_weeks)) {
      return 'total_weeks must be an integer';
    }
    if (obj.total_weeks < MIN_WEEKS || obj.total_weeks > MAX_WEEKS) {
      return `total_weeks must be between ${MIN_WEEKS} and ${MAX_WEEKS}`;
    }
  }
  return null;
}

/**
 * Inline periodization calculation (mirrors @khepri/core/utils/periodization).
 *
 * Edge Functions run in Deno and can't import local packages directly.
 * This replicates the same logic from packages/core/src/utils/periodization.ts.
 * If the core package logic changes, this must be updated to match.
 */
function calculatePeriodization(totalWeeks: number): PeriodizationData {
  // Phase breakdown (same logic as calculatePhaseBreakdown)
  const phases: PeriodizationData['phases'] = [];

  if (totalWeeks <= 8) {
    const baseWeeks = Math.max(2, Math.floor(totalWeeks * 0.4));
    const taperWeeks = Math.min(2, Math.floor(totalWeeks * 0.2));
    const buildWeeks = totalWeeks - baseWeeks - taperWeeks;
    phases.push(
      { phase: 'base', weeks: baseWeeks, focus: 'aerobic_endurance', intensity_distribution: [80, 15, 5] },
      { phase: 'build', weeks: buildWeeks, focus: 'threshold_work', intensity_distribution: [70, 20, 10] }
    );
    if (taperWeeks > 0) {
      phases.push({ phase: 'taper', weeks: taperWeeks, focus: 'recovery', intensity_distribution: [90, 5, 5] });
    }
  } else {
    const baseWeeks = Math.max(3, Math.floor(totalWeeks * 0.35));
    const taperWeeks = Math.min(2, Math.floor(totalWeeks * 0.15));
    const peakWeeks = Math.max(2, Math.floor(totalWeeks * 0.15));
    const buildWeeks = totalWeeks - baseWeeks - peakWeeks - taperWeeks;
    phases.push(
      { phase: 'base', weeks: baseWeeks, focus: 'aerobic_endurance', intensity_distribution: [80, 15, 5] },
      { phase: 'build', weeks: buildWeeks, focus: 'threshold_work', intensity_distribution: [70, 20, 10] },
      { phase: 'peak', weeks: peakWeeks, focus: 'race_specific', intensity_distribution: [60, 25, 15] }
    );
    if (taperWeeks > 0) {
      phases.push({ phase: 'taper', weeks: taperWeeks, focus: 'recovery', intensity_distribution: [90, 5, 5] });
    }
  }

  // Weekly volumes (same logic as calculateWeeklyVolumes)
  const phaseBaseMultiplier: Record<string, number> = {
    base: 0.8, build: 1, peak: 1.1, taper: 0.5, recovery: 0.6,
  };

  const weeklyVolumes: PeriodizationData['weekly_volumes'] = [];
  let currentWeek = 1;

  for (const phase of phases) {
    const baseMult = phaseBaseMultiplier[phase.phase] ?? 0.8;
    for (let i = 0; i < phase.weeks; i++) {
      let mult: number;
      if (phase.phase === 'taper') {
        mult = baseMult * (1 - (i / phase.weeks) * 0.4);
      } else {
        const pos = (i + 1) % 4;
        if (pos === 1) mult = baseMult * 0.85;
        else if (pos === 2) mult = baseMult * 0.95;
        else if (pos === 3) mult = baseMult * 1.05;
        else mult = baseMult * 0.7;
      }
      weeklyVolumes.push({
        week: currentWeek + i,
        volume_multiplier: Number(mult.toFixed(2)),
        phase: phase.phase,
      });
    }
    currentWeek += phase.weeks;
  }

  return { total_weeks: totalWeeks, phases, weekly_volumes: weeklyVolumes };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // 1. Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Missing authorization header', 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return errorResponse('Unauthorized', 401);

    // 2. Parse and validate request
    let requestBody: unknown;
    try { requestBody = await req.json(); } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const validationError = validateRequest(requestBody);
    if (validationError != null) return errorResponse(validationError, 400);

    const request = requestBody as GeneratePlanRequest;

    // 3. Fetch athlete
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return errorResponse('Athlete profile not found', 404);
    }

    // 4. Fetch goal (if requested)
    let goal: GoalData | null = null;
    if (request.goal_id != null) {
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('id, title, goal_type, target_date, race_event_name, race_distance, priority')
        .eq('id', request.goal_id)
        .eq('athlete_id', athlete.id) // Ensure goal belongs to this athlete
        .single();

      if (goalError || !goalData) {
        return errorResponse('Goal not found or does not belong to this athlete', 404);
      }
      goal = goalData as GoalData;
    }

    // 5. Resolve plan parameters
    const today = new Date().toISOString().split('T')[0];
    const startDate = request.start_date ?? today;
    const totalWeeks = resolveTotalWeeks(request.total_weeks, startDate, goal);

    // 6. Calculate periodization
    const periodization = calculatePeriodization(totalWeeks);

    // 7. Build plan payload
    const plan = buildTrainingPlan(
      athlete as AthleteData,
      goal,
      startDate,
      totalWeeks,
      periodization
    );

    // 8. Insert into database
    const { data: createdPlan, error: insertError } = await supabase
      .from('training_plans')
      .insert(plan)
      .select()
      .single();

    if (insertError) {
      return errorResponse(`Failed to save plan: ${insertError.message}`, 500);
    }

    return jsonResponse({
      success: true,
      plan: createdPlan,
    } satisfies GeneratePlanResponse);

  } catch (error) {
    console.error('Generate Plan Error:', error);
    return errorResponse('Internal server error', 500);
  }
});
```

### Step 4: Write Tests (`__tests__/plan-builder.test.ts`)

Test the pure plan-builder functions (no mocking needed for pure logic):

```typescript
import {
  weeksUntilGoal,
  calculateEndDate,
  generatePlanName,
  resolveTotalWeeks,
  buildTrainingPlan,
} from '../plan-builder.ts';

describe('weeksUntilGoal', () => {
  it('returns correct weeks for valid dates', () => { ... });
  it('returns null when target is before start', () => { ... });
  it('clamps to MIN_WEEKS when very close', () => { ... });
  it('clamps to MAX_WEEKS for far-future targets', () => { ... });
  it('returns null for invalid date formats', () => { ... });
});

describe('calculateEndDate', () => {
  it('calculates end date correctly for 12 weeks', () => { ... });
  it('calculates end date correctly for 4 weeks', () => { ... });
});

describe('generatePlanName', () => {
  it('includes race event name when available', () => { ... });
  it('includes goal title as fallback', () => { ... });
  it('uses phase names when no goal', () => { ... });
});

describe('resolveTotalWeeks', () => {
  it('uses explicit total_weeks when provided', () => { ... });
  it('derives from goal target_date when no explicit weeks', () => { ... });
  it('defaults to 12 when no weeks or goal date', () => { ... });
  it('clamps to 4-52 range', () => { ... });
});

describe('buildTrainingPlan', () => {
  it('returns correct payload shape', () => { ... });
  it('sets goal_id to null when no goal', () => { ... });
  it('includes goal reference when provided', () => { ... });
  it('sets status to active', () => { ... });
  it('sets weekly_template to null', () => { ... });
  it('sets adaptations to empty array', () => { ... });
});
```

**Important test considerations:**
- Capture `today` once and reuse (time-sensitive test pattern from memory)
- Use `.toStrictEqual()` for object comparisons
- Test edge cases: 4-week plan, 52-week plan, goal with no target date

### Step 5: Integration Validation

After implementation, validate with manual curl:
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/generate-plan" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{"total_weeks": 12}'
```

Expected response:
```json
{
  "success": true,
  "plan": {
    "id": "uuid",
    "athlete_id": "uuid",
    "name": "12-Week Base → Build → Peak → Taper",
    "start_date": "2026-02-15",
    "end_date": "2026-05-09",
    "total_weeks": 12,
    "status": "active",
    "periodization": { "total_weeks": 12, "phases": [...], "weekly_volumes": [...] },
    "weekly_template": null,
    "adaptations": []
  }
}
```

## Design Decisions

### Why inline periodization logic instead of importing from `@khepri/core`?

Supabase Edge Functions run in Deno Deploy and can't directly import from local monorepo packages. Options:
1. **Inline the logic** (chosen) — simple, no build tooling needed, ~60 lines
2. HTTP import from bundled/published package — adds deployment complexity
3. Shared Deno module — adds a new package type to the monorepo

The inline approach is pragmatic for now. Add a comment noting the duplication so it can be consolidated later if a shared Deno import mechanism is established.

### Why insert into the database in this function?

The function both generates AND persists the plan, so the caller gets back a complete database record (with `id`, `created_at`, etc.). This is simpler than returning a payload for the caller to insert separately.

### Why no Claude AI call in the initial version?

The periodization calculation is deterministic and well-tested. Adding Claude would increase latency and cost for minimal benefit in v1. The `weekly_template` (which days to train what) is left as `null` — a future P6-B-05 task will wire AI-enhanced plan generation through the orchestrator.

## Testing Requirements

- `plan-builder.test.ts` with 15+ test cases covering all exported functions
- Edge cases: min/max weeks, missing goal, past target dates, invalid input
- No network mocking needed — plan-builder is pure logic
- Follow `jest-expo/web` preset or Deno test runner (depending on where tests run)

**Note on Deno testing:** Edge Function tests can use either:
- Deno's built-in test runner (`deno test`) — natural for Deno functions
- Jest via the monorepo `pnpm test` — requires `ts-jest` configuration for the `supabase/` directory

Check existing test patterns in `supabase/functions/` to determine which approach is used.

## Verification

1. `plan-builder.test.ts` — all tests pass
2. Edge Function deploys locally: `supabase functions serve generate-plan`
3. POST request with valid JWT returns a plan with correct structure
4. Plan is persisted in `training_plans` table
5. Periodization phases sum to `total_weeks`
6. Weekly volumes array has exactly `total_weeks` entries
7. End date = start date + (total_weeks * 7) - 1 day
8. `pnpm lint` passes

## PR Scope

- ~150 lines `index.ts` (handler)
- ~80 lines `plan-builder.ts` (pure logic)
- ~40 lines `types.ts` (type definitions)
- ~120 lines tests
- **Total: ~390 lines** — may need to split if too large
  - Option: Ship `types.ts` + `plan-builder.ts` + tests first, then `index.ts` in a follow-up
- PR title: `feat(supabase): add generate-plan Edge Function`
