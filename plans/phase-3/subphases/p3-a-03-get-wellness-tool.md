# P3-A-03: Add get_wellness_data Tool Handler

## Branch
```bash
git checkout feat/p3-a-03-get-wellness-tool
```

## Goal

Add a `get_wellness_data` MCP tool to the gateway that returns wellness metrics from the athlete's Intervals.icu account. These metrics include sleep, HRV, resting HR, weight, and other daily wellness data. For this task, return mock data to establish the tool pattern. Real API integration happens in P3-A-05.

## Files to Create/Modify

```
supabase/functions/mcp-gateway/
├── tools/
│   ├── index.ts                    # Register the new tool
│   └── get-wellness.ts             # NEW: Tool implementation
```

## Implementation Steps

### 1. Create tools/get-wellness.ts

```typescript
// supabase/functions/mcp-gateway/tools/get-wellness.ts

import type { MCPToolEntry, MCPToolResult } from '../types.ts';

/**
 * Wellness data point shape matching Intervals.icu API.
 */
interface WellnessData {
  date: string;           // YYYY-MM-DD
  ctl: number;            // Chronic Training Load (fitness)
  atl: number;            // Acute Training Load (fatigue)
  tsb: number;            // Training Stress Balance (form)
  rampRate: number;       // Weekly CTL increase rate
  restingHR?: number;     // bpm
  hrv?: number;           // ms (RMSSD or similar)
  hrvSDNN?: number;       // ms
  sleepQuality?: number;  // 1-5 scale
  sleepHours?: number;    // hours
  weight?: number;        // kg
  fatigue?: number;       // 1-5 scale
  soreness?: number;      // 1-5 scale
  stress?: number;        // 1-5 scale
  mood?: number;          // 1-5 scale
}

/**
 * Tool definition for get_wellness_data.
 */
const definition = {
  name: 'get_wellness_data',
  description: 'Get wellness metrics from the athlete\'s Intervals.icu account. Returns daily wellness data including CTL/ATL/TSB (fitness/fatigue/form), resting HR, HRV, sleep, weight, and subjective metrics.',
  input_schema: {
    type: 'object' as const,
    properties: {
      oldest: {
        type: 'string',
        description: 'Start date for wellness data (ISO 8601 format, e.g., 2026-02-01). Defaults to 7 days ago.',
      },
      newest: {
        type: 'string',
        description: 'End date for wellness data (ISO 8601 format, e.g., 2026-02-13). Defaults to today.',
      },
    },
    required: [] as const,
  },
} as const;

/**
 * Get date string in YYYY-MM-DD format.
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse and validate input parameters.
 * Returns validated oldest/newest date strings.
 * Invalid dates fall back to defaults; swapped dates get corrected.
 */
function parseInput(input: Record<string, unknown>): {
  oldest: string;
  newest: string;
} {
  const nowMs = Date.now();
  const sixDaysAgoMs = nowMs - 6 * MS_PER_DAY;

  let oldest: string;
  if (typeof input.oldest === 'string' && isValidDate(input.oldest)) {
    oldest = input.oldest;
  } else {
    oldest = formatDateUTC(sixDaysAgoMs);
  }

  let newest: string;
  if (typeof input.newest === 'string' && isValidDate(input.newest)) {
    newest = input.newest;
  } else {
    newest = formatDateUTC(nowMs);
  }

  // Ensure oldest is not after newest
  if (oldest > newest) {
    const temp = oldest;
    oldest = newest;
    newest = temp;
  }

  // Clamp range to MAX_DAYS
  const oldestMs = new Date(`${oldest}T00:00:00Z`).getTime();
  const newestMs = new Date(`${newest}T00:00:00Z`).getTime();
  const daySpan = Math.round((newestMs - oldestMs) / MS_PER_DAY) + 1;
  if (daySpan > MAX_DAYS) {
    oldest = formatDateUTC(newestMs - (MAX_DAYS - 1) * MS_PER_DAY);
  }

  return { oldest, newest };
}

/**
 * Generate mock wellness data for a date range.
 */
function generateMockWellnessData(oldest: string, newest: string): WellnessData[] {
  const data: WellnessData[] = [];
  const start = new Date(oldest);
  const end = new Date(newest);

  // Base values for realistic progression
  let ctl = 70;
  let atl = 65;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Simulate natural variation
    const dayVariation = Math.random() * 0.1 - 0.05;
    ctl = Math.round((ctl + dayVariation * 2) * 10) / 10;
    atl = Math.round((atl + (Math.random() * 8 - 4)) * 10) / 10;
    const tsb = Math.round((ctl - atl) * 10) / 10;

    data.push({
      date: formatDate(new Date(d)),
      ctl,
      atl,
      tsb,
      rampRate: Math.round((Math.random() * 6 - 1) * 10) / 10,
      restingHR: 48 + Math.floor(Math.random() * 8),
      hrv: 45 + Math.floor(Math.random() * 25),
      sleepQuality: 3 + Math.floor(Math.random() * 3),
      sleepHours: 6.5 + Math.random() * 2,
      weight: 72 + Math.random() * 1.5,
      fatigue: 2 + Math.floor(Math.random() * 3),
      soreness: 1 + Math.floor(Math.random() * 3),
      stress: 2 + Math.floor(Math.random() * 2),
      mood: 3 + Math.floor(Math.random() * 2),
    });
  }

  return data;
}

/**
 * Handler for get_wellness_data tool.
 * Returns mock data for now; real API integration in P3-A-05.
 */
async function handler(
  input: Record<string, unknown>,
  _athleteId: string
): Promise<MCPToolResult> {
  try {
    const params = parseInput(input);

    // TODO (P3-A-05): Fetch real data from Intervals.icu API
    const wellnessData = generateMockWellnessData(params.oldest, params.newest);

    // Calculate summary statistics
    const latestData = wellnessData[wellnessData.length - 1];
    const avgSleep = wellnessData.reduce((sum, d) => sum + (d.sleepHours ?? 0), 0) / wellnessData.length;
    const avgHRV = wellnessData.reduce((sum, d) => sum + (d.hrv ?? 0), 0) / wellnessData.length;

    return {
      success: true,
      data: {
        wellness: wellnessData,
        summary: {
          current_ctl: latestData.ctl,
          current_atl: latestData.atl,
          current_tsb: latestData.tsb,
          form_status: latestData.tsb > 5 ? 'fresh' : latestData.tsb < -10 ? 'fatigued' : 'optimal',
          avg_sleep_hours: Math.round(avgSleep * 10) / 10,
          avg_hrv: Math.round(avgHRV),
          days_included: wellnessData.length,
        },
        date_range: {
          oldest: params.oldest,
          newest: params.newest,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get wellness data',
      code: 'GET_WELLNESS_ERROR',
    };
  }
}

/**
 * Exported tool entry for registration.
 */
export const getWellnessDataTool: MCPToolEntry = {
  definition,
  handler,
};
```

### 2. Register the Tool in tools/index.ts

Update `tools/index.ts` to import and register:

```typescript
import type { MCPToolDefinition, MCPToolEntry } from '../types.ts';
import { getWellnessDataTool } from './get-wellness.ts';

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
// - P3-A-02: registerTool(getActivitiesTool)
registerTool(getWellnessDataTool);
// - P3-A-04: registerTool(getEventsTool)
```

**Note:** If P3-A-02 merges first, include its import too. Each PR should add its own tool to whatever state index.ts is in.

## Testing Requirements

**Verification Steps:**

1. Deploy locally: `supabase functions serve mcp-gateway`

2. Test list_tools includes get_wellness_data:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/mcp-gateway \
     -H "Authorization: Bearer <jwt>" \
     -H "Content-Type: application/json" \
     -d '{"action": "list_tools"}'
   ```
   Should return tools array with `get_wellness_data` definition.

3. Test with default date range (last 7 days):
   ```bash
   curl -X POST http://localhost:54321/functions/v1/mcp-gateway \
     -H "Authorization: Bearer <jwt>" \
     -H "Content-Type: application/json" \
     -d '{"action": "execute_tool", "tool_name": "get_wellness_data", "tool_input": {}}'
   ```
   Should return 7 days of mock wellness data with summary.

4. Test with custom date range:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/mcp-gateway \
     -H "Authorization: Bearer <jwt>" \
     -H "Content-Type: application/json" \
     -d '{"action": "execute_tool", "tool_name": "get_wellness_data", "tool_input": {"oldest": "2026-02-01", "newest": "2026-02-13"}}'
   ```
   Should return wellness data for specified range.

## Key Data Points

The wellness data returned is crucial for AI coaching:

- **CTL (Chronic Training Load)**: Fitness indicator, built over ~42 days
- **ATL (Acute Training Load)**: Fatigue indicator, built over ~7 days
- **TSB (Training Stress Balance)**: Form = CTL - ATL
  - Positive TSB: Fresh, ready for hard efforts
  - Negative TSB: Fatigued, need recovery
- **HRV**: Heart rate variability, indicator of recovery status
- **Resting HR**: Lower = better recovered (relative to baseline)
- **Subjective metrics**: Sleep, fatigue, soreness, stress, mood (1-5 scale)

## PR Guidelines

- Commit: `feat(supabase): add get_wellness_data MCP tool handler`
- Keep PR focused on just this tool
- Mock data with realistic variation is intentional

## Dependencies

- P3-A-01: MCP gateway scaffold (✅ Complete)

## Enables

- P3-A-05: Wire to real Intervals.icu API
- P3-B-04: Sync wellness data to daily check-in
