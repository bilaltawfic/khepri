# P6-B-05: Wire Plan Generation into AI Orchestrator

## Goal

Enable the AI coach to generate personalized training plans during conversations by wiring the `generate-plan` Edge Function into the AI orchestrator's tool pipeline. This is the final task to complete Phase 6.

## Dependencies

- ✅ P6-B-02: Training plan queries (supabase-client) - #101
- ✅ P6-B-03: Periodization logic (core) - #96
- ✅ P6-B-04: Generate-plan Edge Function - #102

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/functions/mcp-gateway/tools/generate-plan.ts` | MCP tool handler that proxies to generate-plan Edge Function |
| Modify | `supabase/functions/mcp-gateway/tools/index.ts` | Register `generate_plan` tool |
| Modify | `supabase/functions/ai-orchestrator/prompts.ts` | Add tool definition + update system prompt |
| Create | `supabase/functions/mcp-gateway/tools/__tests__/generate-plan.test.ts` | Unit tests for MCP tool handler |
| Modify | `supabase/functions/ai-orchestrator/__tests__/prompts.test.ts` | Test new tool definition + prompt updates |

## Implementation Steps

### Step 1: Create MCP Gateway Tool Handler

**File:** `supabase/functions/mcp-gateway/tools/generate-plan.ts`

Follow the pattern from `create-event.ts`:

```typescript
import type { MCPToolDefinition, MCPToolHandler, MCPToolResult } from '../types.ts';

export const definition: MCPToolDefinition = {
  name: 'generate_plan',
  description:
    'Generate a personalized training plan based on athlete goals, current fitness, and periodization science. Creates a structured multi-week plan with progressive overload and recovery cycles.',
  inputSchema: {
    type: 'object',
    properties: {
      goal_id: {
        type: 'string',
        description: 'UUID of the goal to build the plan toward. If omitted, generates a general fitness plan.',
      },
      start_date: {
        type: 'string',
        description: 'Plan start date in YYYY-MM-DD format. Defaults to today if omitted.',
      },
      total_weeks: {
        type: 'number',
        description: 'Plan duration in weeks (4-52). If omitted, derived from goal target date or defaults to 12 weeks.',
      },
    },
    required: [],
  },
};

export const handler: MCPToolHandler = async (input, athleteId, supabase) => {
  // 1. Validate input parameters
  //    - total_weeks: must be number 4-52 if provided
  //    - start_date: must be valid YYYY-MM-DD if provided
  //    - goal_id: must be valid UUID string if provided

  // 2. Build request payload for generate-plan Edge Function
  const payload = {
    goal_id: input.goal_id,
    start_date: input.start_date,
    total_weeks: input.total_weeks,
  };

  // 3. Call generate-plan Edge Function via Supabase client
  //    Use supabase.functions.invoke('generate-plan', { body: payload })
  //    This preserves the athlete's JWT context

  // 4. Handle response
  //    - On success: return MCPToolResult with plan summary
  //    - On error: return MCPToolResult with error details

  // 5. Format result for AI consumption
  //    Include: plan name, duration, phases summary, start/end dates
  //    The AI can then describe the plan to the athlete conversationally
};
```

**Key Design Decisions:**
- Use `supabase.functions.invoke()` to call the Edge Function (preserves JWT auth)
- Return a summary for the AI, not the full plan payload (keep context window manageable)
- Validate inputs at the MCP layer before forwarding

### Step 2: Register Tool in MCP Gateway

**File:** `supabase/functions/mcp-gateway/tools/index.ts`

Add import and registration following existing pattern:

```typescript
import * as generatePlan from './generate-plan.ts';

// In the registration block:
registerTool(generatePlan);
```

### Step 3: Add Tool Definition to AI Orchestrator

**File:** `supabase/functions/ai-orchestrator/prompts.ts`

Add to `TOOL_DEFINITIONS` array:

```typescript
{
  name: 'generate_plan',
  description:
    'Generate a personalized training plan based on athlete goals, current fitness, and periodization science. Creates a structured multi-week plan with progressive overload and recovery cycles stored in the database.',
  input_schema: {
    type: 'object',
    properties: {
      goal_id: {
        type: 'string',
        description: 'UUID of the goal to build the plan toward. Omit for a general fitness plan.',
      },
      start_date: {
        type: 'string',
        description: 'Plan start date in YYYY-MM-DD format. Defaults to today.',
      },
      total_weeks: {
        type: 'number',
        description: 'Plan duration in weeks (4-52). Derived from goal target date if omitted.',
      },
    },
    required: [],
  },
},
```

### Step 4: Update System Prompt

**File:** `supabase/functions/ai-orchestrator/prompts.ts`

Add to capabilities section in `BASE_PROMPT`:

```markdown
- **generate_plan**: Generate personalized training plans with periodization
```

Add new safety/guidelines section:

```markdown
## Training Plan Generation Guidelines
1. Always discuss the athlete's goals and current fitness before generating a plan
2. If the athlete has an active goal with a target date, suggest using that goal
3. Confirm plan parameters (duration, start date) before generating
4. After generation, summarize the plan phases and weekly structure
5. Remind the athlete they can view the full plan in the Plan tab
6. Only generate one plan at a time — if they already have an active plan, discuss modifying vs. replacing it
```

### Step 5: Write Tests

**File:** `supabase/functions/mcp-gateway/tools/__tests__/generate-plan.test.ts`

```typescript
// Test cases:
// 1. Handler calls supabase.functions.invoke with correct params
// 2. Handler validates total_weeks range (4-52)
// 3. Handler validates start_date format
// 4. Handler returns success with plan summary
// 5. Handler returns error when Edge Function fails
// 6. Handler passes through goal_id when provided
// 7. Handler works with no parameters (all defaults)
// 8. Tool definition has correct name and schema
```

**File:** `supabase/functions/ai-orchestrator/__tests__/prompts.test.ts`

```typescript
// Test cases:
// 1. generate_plan is included in TOOL_DEFINITIONS
// 2. generate_plan tool has correct input schema
// 3. System prompt includes plan generation capabilities
// 4. System prompt includes plan generation guidelines
```

## Testing Requirements

- All new tests pass: `pnpm test`
- Existing tests still pass (no regressions)
- Lint passes: `pnpm lint`
- Build passes: `pnpm build`

## Verification

- [ ] `generate_plan` tool appears in MCP Gateway tool registry
- [ ] AI orchestrator includes `generate_plan` in Claude API calls
- [ ] System prompt mentions plan generation capabilities and guidelines
- [ ] MCP handler validates inputs and calls generate-plan Edge Function
- [ ] Error cases handled gracefully (invalid params, function failure)
- [ ] All tests pass with good coverage
- [ ] This completes Phase 6 — all tasks ✅
