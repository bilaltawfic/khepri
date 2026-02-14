# P6-A-02: Wire Calendar Tools into AI Orchestrator

**Branch:** `feat/p6-a-02-wire-calendar-tools-orchestrator`
**Depends on:** P6-A-01 (✅ Complete - create/update event MCP tools)
**Blocks:** P6-A-03 (Build calendar screen in mobile app)

## Goal

Enable the AI coach (Khepri) to create and update events on the athlete's Intervals.icu calendar. Currently the orchestrator can only **read** data (get_activities, get_wellness_data, get_events, search_knowledge). This task adds **write** capabilities (create_event, update_event) so the AI can push workouts, races, and rest days to the calendar when coaching.

## Files to Modify

### AI Orchestrator
- `supabase/functions/ai-orchestrator/prompts.ts` — Add `create_event` and `update_event` tool definitions; update system prompt capabilities section
- `supabase/functions/ai-orchestrator/__tests__/prompts.test.ts` — Add tests for new tool definitions and updated system prompt

### No Changes Required
- `supabase/functions/ai-orchestrator/tool-executor.ts` — Already generic; routes any tool name to MCP gateway
- `supabase/functions/ai-orchestrator/index.ts` — Agentic loop already handles any tools in `TOOL_DEFINITIONS`
- `supabase/functions/mcp-gateway/tools/` — Tools already registered in P6-A-01

## Implementation Steps

### 1. Add Tool Definitions to `prompts.ts`

Append two new entries to the `TOOL_DEFINITIONS` array (after `search_knowledge`):

```typescript
{
  name: 'create_event',
  description:
    "Create a new event on the athlete's Intervals.icu calendar. Use CalendarEvent field names (matching get_events output). Supports workouts, races, rest days, notes, and travel.",
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Event name' },
      type: {
        type: 'string',
        enum: ['workout', 'race', 'note', 'rest_day', 'travel'],
        description: 'Event type',
      },
      start_date: {
        type: 'string',
        description: 'Start date/time in ISO 8601 format (e.g., "2026-02-20" or "2026-02-20T07:00:00")',
      },
      end_date: {
        type: 'string',
        description: 'End date/time in ISO 8601 format',
      },
      description: {
        type: 'string',
        description: 'Workout description, structured workout steps, or notes',
      },
      category: {
        type: 'string',
        description: 'Activity category (Ride, Run, Swim, etc.)',
      },
      planned_duration: {
        type: 'number',
        description: 'Planned duration in seconds',
      },
      planned_tss: {
        type: 'number',
        description: 'Planned Training Stress Score (TSS)',
      },
      planned_distance: {
        type: 'number',
        description: 'Planned distance in meters',
      },
      indoor: {
        type: 'boolean',
        description: 'Whether this is an indoor workout',
      },
      priority: {
        type: 'string',
        enum: ['A', 'B', 'C'],
        description: 'Race priority (A = goal race, B = important, C = training race)',
      },
    },
    required: ['name', 'type', 'start_date'],
  },
},
{
  name: 'update_event',
  description:
    "Update an existing event on the athlete's Intervals.icu calendar. Only include fields that should change. Use CalendarEvent field names (matching get_events output).",
  input_schema: {
    type: 'object',
    properties: {
      event_id: {
        type: 'string',
        description: 'The numeric ID of the event to update (from get_events)',
      },
      name: { type: 'string', description: 'Updated event name' },
      type: {
        type: 'string',
        enum: ['workout', 'race', 'note', 'rest_day', 'travel'],
        description: 'Updated event type',
      },
      start_date: {
        type: 'string',
        description: 'Updated start date/time in ISO 8601 format',
      },
      end_date: {
        type: 'string',
        description: 'Updated end date/time in ISO 8601 format',
      },
      description: {
        type: 'string',
        description: 'Updated description or workout steps',
      },
      category: {
        type: 'string',
        description: 'Updated activity category (Ride, Run, Swim, etc.)',
      },
      planned_duration: {
        type: 'number',
        description: 'Updated planned duration in seconds',
      },
      planned_tss: {
        type: 'number',
        description: 'Updated planned TSS',
      },
      planned_distance: {
        type: 'number',
        description: 'Updated planned distance in meters',
      },
      indoor: {
        type: 'boolean',
        description: 'Updated indoor/outdoor setting',
      },
      priority: {
        type: 'string',
        enum: ['A', 'B', 'C'],
        description: 'Updated race priority',
      },
    },
    required: ['event_id'],
  },
},
```

### 2. Update System Prompt Capabilities Section

In `BASE_PROMPT`, update the `## Your Capabilities` section to include write tools:

**Current:**
```
## Your Capabilities
You have access to tools that let you fetch real training data from the athlete's Intervals.icu account:
- get_activities: Fetch recent workouts (rides, runs, swims, etc.)
- get_wellness_data: Fetch wellness metrics (CTL/ATL/TSB, HRV, sleep quality, readiness)
- get_events: Fetch scheduled events, planned workouts, and races
- search_knowledge: Search the exercise science knowledge base for evidence-based training principles
```

**Updated:**
```
## Your Capabilities
You have access to tools that let you read and write training data from the athlete's Intervals.icu account:
- get_activities: Fetch recent workouts (rides, runs, swims, etc.)
- get_wellness_data: Fetch wellness metrics (CTL/ATL/TSB, HRV, sleep quality, readiness)
- get_events: Fetch scheduled events, planned workouts, and races
- create_event: Create a new event on the athlete's calendar (workout, race, rest day, note, travel)
- update_event: Update an existing event on the athlete's calendar
- search_knowledge: Search the exercise science knowledge base for evidence-based training principles
```

### 3. Add Calendar Safety Guidelines to System Prompt

Add a new section in `BASE_PROMPT` after the `## Guidelines` section:

```
## Calendar Write Safety
When creating or updating calendar events:
1. **Always confirm with the athlete** before creating workouts or modifying their calendar
2. **Check existing events** first (get_events) to avoid scheduling conflicts
3. **Respect constraints**: Never schedule workouts during travel, rest periods, or that aggravate injuries
4. **Include workout details**: When creating workouts, include description with specific intervals/structure, planned_duration, and category
5. **Use correct types**: workout for training, race for events, rest_day for recovery, note for reminders
```

### 4. Update Tests in `prompts.test.ts`

Add tests for the new tool definitions and updated system prompt:

```typescript
// =============================================================================
// TOOL_DEFINITIONS
// =============================================================================

describe('TOOL_DEFINITIONS', () => {
  it('includes create_event tool', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'create_event');
    expect(tool).toBeDefined();
    expect(tool!.input_schema.required).toEqual(['name', 'type', 'start_date']);
    expect(tool!.input_schema.properties).toHaveProperty('planned_duration');
    expect(tool!.input_schema.properties).toHaveProperty('planned_tss');
  });

  it('includes update_event tool', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'update_event');
    expect(tool).toBeDefined();
    expect(tool!.input_schema.required).toEqual(['event_id']);
    expect(tool!.input_schema.properties).toHaveProperty('event_id');
  });

  it('has 6 total tools', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(6);
  });

  it('create_event uses CalendarEvent field names', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'create_event')!;
    const propNames = Object.keys(tool.input_schema.properties);
    // CalendarEvent names (not Intervals.icu API names)
    expect(propNames).toContain('start_date');
    expect(propNames).toContain('planned_duration');
    expect(propNames).toContain('planned_tss');
    expect(propNames).toContain('priority');
    // Should NOT have API-style names
    expect(propNames).not.toContain('start_date_local');
    expect(propNames).not.toContain('moving_time');
    expect(propNames).not.toContain('icu_training_load');
    expect(propNames).not.toContain('event_priority');
  });

  it('update_event uses CalendarEvent field names', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'update_event')!;
    const propNames = Object.keys(tool.input_schema.properties);
    expect(propNames).toContain('start_date');
    expect(propNames).not.toContain('start_date_local');
  });

  it('create_event type enum uses lowercase values', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'create_event')!;
    const typeProp = tool.input_schema.properties.type as { enum: string[] };
    expect(typeProp.enum).toEqual(['workout', 'race', 'note', 'rest_day', 'travel']);
  });

  it('all tools have name, description, and input_schema', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.input_schema).toBeDefined();
      expect(tool.input_schema.type).toBe('object');
    }
  });
});
```

Add test for updated system prompt:

```typescript
it('system prompt mentions calendar write capabilities', () => {
  const prompt = buildSystemPrompt();
  expect(prompt).toContain('create_event');
  expect(prompt).toContain('update_event');
  expect(prompt).toContain('read and write');
});

it('system prompt includes calendar write safety guidelines', () => {
  const prompt = buildSystemPrompt();
  expect(prompt).toContain('Calendar Write Safety');
  expect(prompt).toContain('Always confirm with the athlete');
  expect(prompt).toContain('Check existing events');
});
```

## Testing

### Test Coverage
- `prompts.test.ts`: Verify `TOOL_DEFINITIONS` array includes both new tools with correct schemas
- `prompts.test.ts`: Verify system prompt mentions all 6 tools
- `prompts.test.ts`: Verify CalendarEvent field names (not API names) in tool schemas
- `prompts.test.ts`: Verify calendar safety guidelines present

### Verification Checklist
- [ ] `pnpm test` — all tests pass (especially `ai-orchestrator/__tests__/prompts.test.ts`)
- [ ] `pnpm lint` — no linting errors
- [ ] `pnpm build` — builds successfully
- [ ] `pnpm typecheck` — type checking passes
- [ ] Tool definitions use CalendarEvent field names (matching get_events output)
- [ ] Tool definitions use lowercase event type enum values
- [ ] System prompt mentions all 6 tools
- [ ] Safety guidelines present for calendar writes

### Integration Verification (Manual)
- [ ] Deploy ai-orchestrator and verify Claude receives all 6 tools
- [ ] Verify Claude can call `create_event` and it routes through MCP gateway correctly
- [ ] Verify Claude can call `update_event` and it routes through MCP gateway correctly

## PR Details

- **Branch:** `feat/p6-a-02-wire-calendar-tools-orchestrator`
- **Title:** `feat(supabase): wire calendar tools into ai-orchestrator`
- **Scope:** ~50-80 lines of changes (small PR)
- **Conversation log:** `claude-convos/YYYY-MM-DD/` (worker creates this)
