import type { MCPToolEntry, MCPToolResult } from '../types.ts';

/**
 * Activity data shape matching Intervals.icu API.
 */
interface Activity {
  id: string;
  name: string;
  type: string;
  start_date: string;
  duration: number;
  distance?: number;
  tss?: number;
  ctl?: number;
  atl?: number;
}

/**
 * Tool definition for get_activities.
 * Matches Anthropic's tool use specification.
 */
const definition = {
  name: 'get_activities',
  description:
    "Get recent activities from the athlete's Intervals.icu account. Returns activity list with type, duration, distance, and training metrics.",
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
  const limit = typeof input.limit === 'number' ? Math.min(Math.max(1, input.limit), 50) : 10;

  const oldest = typeof input.oldest === 'string' ? input.oldest : undefined;
  const newest = typeof input.newest === 'string' ? input.newest : undefined;
  const activityType = typeof input.activity_type === 'string' ? input.activity_type : undefined;

  return { limit, oldest, newest, activityType };
}

const MOCK_ACTIVITIES: readonly Activity[] = [
  {
    id: 'mock-1',
    name: 'Morning Zone 2 Ride',
    type: 'Ride',
    start_date: '2026-02-13T07:00:00Z',
    duration: 3600,
    distance: 35000,
    tss: 55,
    ctl: 72,
    atl: 65,
  },
  {
    id: 'mock-2',
    name: 'Tempo Run',
    type: 'Run',
    start_date: '2026-02-12T06:30:00Z',
    duration: 2700,
    distance: 8000,
    tss: 48,
    ctl: 71,
    atl: 62,
  },
  {
    id: 'mock-3',
    name: 'Recovery Swim',
    type: 'Swim',
    start_date: '2026-02-11T12:00:00Z',
    duration: 1800,
    distance: 1500,
    tss: 25,
    ctl: 70,
    atl: 58,
  },
];

/**
 * Handler for get_activities tool.
 * Returns mock data for now; real API integration in P3-A-05.
 */
async function handler(input: Record<string, unknown>, _athleteId: string): Promise<MCPToolResult> {
  try {
    const params = parseInput(input);

    // TODO (P3-A-05): Fetch real data from Intervals.icu API
    let filtered: Activity[] = [...MOCK_ACTIVITIES];

    if (params.activityType != null) {
      filtered = filtered.filter(
        (a) => a.type.toLowerCase() === params.activityType?.toLowerCase()
      );
    }

    // Apply date range filtering based on activity start_date
    if (params.oldest != null || params.newest != null) {
      const oldestDate = params.oldest != null ? new Date(params.oldest) : undefined;
      const newestDate = params.newest != null ? new Date(params.newest) : undefined;

      filtered = filtered.filter((a) => {
        const start = new Date(a.start_date);
        if (Number.isNaN(start.getTime())) return false;
        if (oldestDate != null && start < oldestDate) return false;
        if (newestDate != null && start > newestDate) return false;
        return true;
      });
    }

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
