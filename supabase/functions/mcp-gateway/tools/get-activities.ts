import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { MCPToolEntry, MCPToolResult } from '../types.ts';
import { getIntervalsCredentials } from '../utils/credentials.ts';
import { IntervalsApiError, fetchActivities } from '../utils/intervals-api.ts';

/**
 * Activity data shape used in tool responses.
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

/** Date-only pattern: YYYY-MM-DD without a time component. */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a date string, normalizing date-only values to the start of the day (UTC).
 */
function toStartOfDay(value: string): Date {
  if (DATE_ONLY_RE.test(value)) {
    return new Date(`${value}T00:00:00Z`);
  }
  return new Date(value);
}

/**
 * Parse a date string, normalizing date-only values to the end of the day (UTC).
 */
function toEndOfDay(value: string): Date {
  if (DATE_ONLY_RE.test(value)) {
    return new Date(`${value}T23:59:59.999Z`);
  }
  return new Date(value);
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
 * Get mock activities with filtering applied.
 * Used as fallback when no Intervals.icu credentials are configured.
 */
function getMockActivities(params: {
  limit: number;
  oldest?: string;
  newest?: string;
  activityType?: string;
}): MCPToolResult {
  let filtered: Activity[] = [...MOCK_ACTIVITIES];

  if (params.activityType != null) {
    filtered = filtered.filter((a) => a.type.toLowerCase() === params.activityType?.toLowerCase());
  }

  // Apply date range filtering based on activity start_date.
  // Date-only strings (e.g. "2026-02-13") are normalized so that
  // oldest = start of day and newest = end of day for inclusive behavior.
  if (params.oldest != null || params.newest != null) {
    const oldestDate = params.oldest != null ? toStartOfDay(params.oldest) : undefined;
    const newestDate = params.newest != null ? toEndOfDay(params.newest) : undefined;

    if (oldestDate != null && newestDate != null && oldestDate > newestDate) {
      return {
        success: false,
        error: 'oldest date must not be after newest date',
        code: 'INVALID_DATE_RANGE',
      };
    }

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
      source: 'mock',
      filters_applied: {
        limit: params.limit,
        oldest: params.oldest,
        newest: params.newest,
        activity_type: params.activityType,
      },
    },
  };
}

/**
 * Handler for get_activities tool.
 * Fetches real data from Intervals.icu when credentials are configured,
 * otherwise falls back to mock data.
 */
async function handler(
  input: Record<string, unknown>,
  athleteId: string,
  supabase: SupabaseClient
): Promise<MCPToolResult> {
  try {
    const params = parseInput(input);

    // Attempt to get Intervals.icu credentials
    const credentials = await getIntervalsCredentials(supabase, athleteId);

    if (!credentials) {
      // No credentials configured - return mock data
      return getMockActivities(params);
    }

    // Fetch real data from Intervals.icu
    const activities = await fetchActivities(credentials, {
      oldest: params.oldest,
      newest: params.newest,
    });

    // Transform Intervals.icu format to our response format and apply filters
    const transformed: Activity[] = activities
      .filter(
        (a) =>
          params.activityType == null || a.type.toLowerCase() === params.activityType.toLowerCase()
      )
      .slice(0, params.limit)
      .map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        start_date: a.start_date_local,
        duration: a.moving_time,
        distance: a.distance,
        tss: a.icu_training_load,
        ctl: a.icu_ctl,
        atl: a.icu_atl,
      }));

    return {
      success: true,
      data: {
        activities: transformed,
        total: transformed.length,
        source: 'intervals.icu',
        filters_applied: {
          limit: params.limit,
          oldest: params.oldest,
          newest: params.newest,
          activity_type: params.activityType,
        },
      },
    };
  } catch (error) {
    if (error instanceof IntervalsApiError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
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
