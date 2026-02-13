# P4-B-02: Add Injury Awareness to AI Recommendations

## Goal

Enhance both the `ai-coach` and `ai-orchestrator` Edge Functions so that injury constraints are deeply integrated into AI recommendations. Currently, constraints are passed as simple title strings (e.g., "Left knee pain (injury)") — the AI has no structured data about body part, severity, or specific restrictions to reason about.

This task ensures the AI:
1. Receives structured injury data (body part, severity, restrictions)
2. Has explicit system prompt instructions for injury-safe recommendations
3. Uses the `check_constraint_compatibility` safety tool before recommending workouts (orchestrator)
4. Produces workout alternatives that avoid injured areas

## Background

### Current State
- **ai-coach/prompts.ts**: Constraints are rendered as `"Left knee pain (injury)"` — no severity, body part, or restrictions
- **ai-orchestrator/prompts.ts**: Similar — constraints show type and description but lack structured injury fields
- **ai-orchestrator/types.ts**: `Constraint` interface has `type`, `description`, `start_date`, `end_date` only
- **safety-tools.ts**: `checkConstraintCompatibility()` already handles injury restrictions, sport restrictions, and intensity restrictions — but the orchestrator doesn't call it automatically
- **ai-client/types.ts**: Full `InjuryConstraint` type exists with `injuryBodyPart`, `injurySeverity`, `injuryRestrictions`

### Gap
The structured injury data exists in the database and type system but is lost when building prompts. The AI sees "Left knee pain" but doesn't know it's a `severe` injury to the `left_knee` with restrictions `["run", "high_intensity", "impact"]`.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/ai-orchestrator/types.ts` | Modify | Extend `Constraint` with injury-specific fields |
| `supabase/functions/ai-orchestrator/prompts.ts` | Modify | Render injury constraints with full detail, add injury guidelines |
| `supabase/functions/ai-coach/prompts.ts` | Modify | Render injury constraints with severity/restrictions, add guidelines |
| `supabase/functions/ai-orchestrator/__tests__/prompts.test.ts` | Create | Test prompt building with injury context |
| `supabase/functions/ai-coach/__tests__/prompts.test.ts` | Create | Test prompt building with injury context |

## Implementation Steps

### Step 1: Extend Orchestrator Constraint type (types.ts)

Add optional injury-specific fields to the `Constraint` interface:

```typescript
export interface Constraint {
  id: string;
  type: string;
  description: string;
  start_date?: string;
  end_date?: string;
  // Injury-specific fields (populated when type === 'injury')
  injury_body_part?: string;
  injury_severity?: 'mild' | 'moderate' | 'severe';
  injury_restrictions?: string[];
}
```

### Step 2: Enhance orchestrator prompts (ai-orchestrator/prompts.ts)

Update `buildSystemPrompt()` to:

1. **Render injury constraints with structured detail**:
   ```
   ### Active Constraints (MUST RESPECT)
   - [injury] Left knee pain
     Body part: left_knee | Severity: severe
     Restrictions: no running, no high_intensity, no impact activities
     (2026-01-15 to ongoing)
   ```

2. **Add injury-specific guidelines to the system prompt**:
   ```
   ## Injury Safety Rules
   - ALWAYS check active injury constraints before recommending any workout
   - For SEVERE injuries: only recommend activities that completely avoid the injured area
   - For MODERATE injuries: recommend low-intensity alternatives; avoid aggravating movements
   - For MILD injuries: allow training with modifications; suggest warm-up and monitoring
   - Never recommend "pushing through" pain
   - Suggest cross-training alternatives that don't stress the injured area
   - When in doubt, recommend rest and consulting a physiotherapist
   ```

3. **Add injury-aware tool usage guidance**:
   ```
   When making workout recommendations with active injuries:
   1. FIRST use check_constraint_compatibility to verify the workout is safe
   2. If incompatible, suggest modifications or alternatives
   3. Always mention the injury context in your recommendation reasoning
   ```

### Step 3: Enhance ai-coach prompts (ai-coach/prompts.ts)

Update the `AthleteContext.constraints` type and `buildSystemPrompt()`:

1. **Extend constraints type**:
   ```typescript
   constraints?: Array<{
     title: string;
     constraintType: string;
     description?: string;
     injuryBodyPart?: string;
     injurySeverity?: 'mild' | 'moderate' | 'severe';
     injuryRestrictions?: string[];
   }>;
   ```

2. **Render injury constraints with detail in the prompt**:
   Instead of `"Left knee pain (injury)"`, render:
   ```
   Active constraints:
   - INJURY (severe): Left knee pain — affects left_knee
     Restrictions: no running, no high_intensity, no impact
   ```

3. **Add injury safety to the base system prompt** (in the Safety Guidelines section):
   ```
   - When injury constraints are active, always recommend activities that avoid the injured area
   - For severe injuries, only suggest complete rest or activities that don't involve the injury site
   - Suggest specific alternatives (e.g., "swim instead of run for knee injuries")
   ```

### Step 4: Write tests for orchestrator prompts

```typescript
// Test cases:
// 1. buildSystemPrompt with no context returns base prompt
// 2. buildSystemPrompt with injury constraint renders body part, severity, restrictions
// 3. buildSystemPrompt with multiple constraints (injury + travel) renders both
// 4. buildSystemPrompt with severe injury includes "MUST RESPECT" language
// 5. buildSystemPrompt with injury_restrictions=[] renders "no specific restrictions listed"
// 6. buildSystemPrompt without injury fields renders constraint type and description only
// 7. System prompt always includes injury safety rules section
```

### Step 5: Write tests for ai-coach prompts

```typescript
// Test cases:
// 1. buildSystemPrompt with injury constraint includes severity and body part
// 2. buildSystemPrompt with constraint description renders inline
// 3. buildSystemPrompt with injuryRestrictions renders restriction list
// 4. buildSystemPrompt with non-injury constraint renders as before (no regression)
// 5. Safety guidelines section mentions injury awareness
```

## Testing Requirements

- Unit tests for prompt building with various constraint combinations
- Verify injury fields are rendered when present, gracefully omitted when absent
- Regression: non-injury constraints still render correctly
- Regression: prompts without any context work as before

## Verification

- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] Orchestrator prompt includes injury body part, severity, and restrictions when provided
- [ ] AI-coach prompt includes structured injury data
- [ ] Both prompts include injury safety guidelines
- [ ] Non-injury constraints render unchanged (backwards compatible)
- [ ] Empty/missing injury fields don't cause errors
- [ ] Orchestrator prompt guides Claude to use `check_constraint_compatibility` tool

## Design Decisions

1. **Structured over natural language**: Pass injury data as structured fields rather than relying on the AI to parse natural language descriptions. This ensures the AI always has access to severity and restrictions.

2. **Both functions updated**: Even though `ai-coach` doesn't have tool use, it still needs injury awareness in its prompts so it can give safe advice in simple chat mode.

3. **Severity-based guidance**: The system prompt gives Claude specific rules for each severity level (mild/moderate/severe), making recommendations more nuanced than a blanket "don't train with injuries."

4. **Backwards compatible**: All new fields are optional — existing callers that don't pass injury details will work as before.
