# P3-A-02: Add get_activities Tool Handler

## Branch
```bash
git checkout feat/p3-a-02-get-activities-tool
```

## Goal

Add a `get_activities` MCP tool to the gateway that returns a list of recent activities from the athlete's Intervals.icu account. For this task, return mock data to establish the tool pattern. Real API integration happens in P3-A-05.

## Files to Create/Modify

```
supabase/functions/mcp-gateway/
├── tools/
│   ├── index.ts                    # Register the new tool
│   └── get-activities.ts           # NEW: Tool implementation
└── types.ts                        # Add Activity type (optional)
```

## Implementation Steps

### 1. Create Activity Types

Add to `types.ts` or create inline in the tool file:

```typescript
// Activity data shape matching Intervals.icu API
export interface Activity {
  id: string;
  name: string;
  type: string;          // 'Ride', 'Run', 'Swim', etc.
  start_date: string;    // ISO 8601 datetime
  duration: number;      // seconds
  distance?: number;     // meters
  tss?: number;          // Training Stress Score
  ctl?: number;          // Chronic Training Load (fitness)
  atl?: number;          // Acute Training Load (fatigue)
}
```

### 2. Create tools/get-activities.ts

```typescript
// supabase/functions/mcp-gateway/tools/get-activities.ts

import type { MCPToolEntry, MCPToolResult } from '../types.ts';

/**
 * Tool definition for get_activities.
 * Matches Anthropic's tool use specification.
 */
const definition = {
  name: 'get_activities',
  description: 'Get recent activities from the athlete\'s Intervals.icu account. Returns activity list with type, duration, distance, and training metrics.',
  input_schema: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of activities to return (default: 10, max: 50)',
      },
      oldest: {
        type: 'string',
        description: 'Oldest date to include (ISO 8601 format, e.g., 2026-01-01)',
      },
      newest: {
        type: 'string',
        description: 'Newest date to include (ISO 8601 format, e.g., 2026-02-13)',
      },
      activity_type: {
        type: 'string',
        description: 'Filter by activity type (Ride, Run, Swim, etc.)',
      },
    },
    required: [] as const,
  },
} as const;

/**
 * Validate and normalize input parameters.
 */
function parseInput(input: Record<string, unknown>): {
  limit: number;
  oldest?: string;
  newest?: string;
  activityType?: string;
} {
  const limit = typeof input.limit === 'number'
    ? Math.min(Math.max(1, input.limit), 50)
    : 10;

  const oldest = typeof input.oldest === 'string' ? input.oldest : undefined;
  const newest = typeof input.newest === 'string' ? input.newest : undefined;
  const activityType = typeof input.activity_type === 'string' ? input.activity_type : undefined;

  return { limit, oldest, newest, activityType };
}

/**
 * Handler for get_activities tool.
 * Returns mock data for now; real API integration in P3-A-05.
 */
async function handler(
  input: Record<string, unknown>,
  _athleteId: string
): Promise<MCPToolResult> {
  try {
    const params = parseInput(input);

    // TODO (P3-A-05): Fetch real data from Intervals.icu API
    // For now, return mock data that matches the expected shape
    const mockActivities = [
      {
        id: 'mock-1',
        name: 'Morning Zone 2 Ride',
        type: 'Ride',
        start_date: '2026-02-13T07:00:00Z',
        duration: 3600,      // 1 hour
        distance: 35000,     // 35 km
        tss: 55,
        ctl: 72,
        atl: 65,
      },
      {
        id: 'mock-2',
        name: 'Tempo Run',
        type: 'Run',
        start_date: '2026-02-12T06:30:00Z',
        duration: 2700,      // 45 min
        distance: 8000,      // 8 km
        tss: 48,
        ctl: 71,
        atl: 62,
      },
      {
        id: 'mock-3',
        name: 'Recovery Swim',
        type: 'Swim',
        start_date: '2026-02-11T12:00:00Z',
        duration: 1800,      // 30 min
        distance: 1500,      // 1.5 km
        tss: 25,
        ctl: 70,
        atl: 58,
      },
    ];

    // Apply filters (simplified for mock data)
    let filtered = mockActivities;

    if (params.activityType) {
      filtered = filtered.filter(a =>
        a.type.toLowerCase() === params.activityType!.toLowerCase()
      );
    }

    // Apply limit
    const activities = filtered.slice(0, params.limit);

    return {
      success: true,
      data: {
        activities,
        total: activities.length,
        filters_applied: {
          limit: params.limit,
          oldest: params.oldest,
          newest: params.newest,
          activity_type: params.activityType,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get activities',
      code: 'GET_ACTIVITIES_ERROR',
    };
  }
}

/**
 * Exported tool entry for registration.
 */
export const getActivitiesTool: MCPToolEntry = {
  definition,
  handler,
};
```

### 3. Register the Tool in tools/index.ts

Update `tools/index.ts` to import and register the tool:

```typescript
import type { MCPToolDefinition, MCPToolEntry } from '../types.ts';
import { getActivitiesTool } from './get-activities.ts';

const toolRegistry: Map<string, MCPToolEntry> = new Map();

export function registerTool(entry: MCPToolEntry): void {
  toolRegistry.set(entry.definition.name, entry);
}

export function getToolDefinitions(): MCPToolDefinition[] {
  return Array.from(toolRegistry.values()).map((entry) => entry.definition);
}

export function getTool(name: string): MCPToolEntry | undefined {
  return toolRegistry.get(name);
}

// ============================================================
// Tool registrations
// ============================================================
registerTool(getActivitiesTool);
// - P3-A-03: registerTool(getWellnessDataTool)
// - P3-A-04: registerTool(getEventsTool)
```

## Testing Requirements

For now, manual testing is acceptable since Edge Functions require Deno test infrastructure.

**Verification Steps:**

1. Deploy locally: `supabase functions serve mcp-gateway`

2. Test list_tools includes get_activities:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/mcp-gateway \
     -H "Authorization: Bearer <jwt>" \
     -H "Content-Type: application/json" \
     -d '{"action": "list_tools"}'
   ```
   Should return tools array with `get_activities` definition.

3. Test execute_tool with get_activities:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/mcp-gateway \
     -H "Authorization: Bearer <jwt>" \
     -H "Content-Type: application/json" \
     -d '{"action": "execute_tool", "tool_name": "get_activities", "tool_input": {"limit": 5}}'
   ```
   Should return mock activities.

4. Test with activity type filter:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/mcp-gateway \
     -H "Authorization: Bearer <jwt>" \
     -H "Content-Type: application/json" \
     -d '{"action": "execute_tool", "tool_name": "get_activities", "tool_input": {"activity_type": "Run"}}'
   ```
   Should return only Run activities.

## PR Guidelines

- Commit: `feat(supabase): add get_activities MCP tool handler`
- Keep PR focused on just this tool - no other tool implementations
- Mock data is intentional; real API integration is P3-A-05

## Dependencies

- P3-A-01: MCP gateway scaffold (✅ Complete)

## Enables

- P3-A-05: Wire to real Intervals.icu API (needs all tool handlers first)
- P3-B-03: Fetch and display recent activities (needs P3-A-05)
