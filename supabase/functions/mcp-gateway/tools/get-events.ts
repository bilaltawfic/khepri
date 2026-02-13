import type { MCPToolEntry, MCPToolResult } from '../types.ts';

/**
 * Calendar event shape matching Intervals.icu API.
 */
interface CalendarEvent {
  id: string;
  name: string;
  type: 'workout' | 'race' | 'note' | 'rest_day' | 'travel';
  start_date: string; // ISO 8601
  end_date?: string; // For multi-day events
  description?: string;
  category?: string; // e.g., "Ride", "Run", "Swim"
  planned_duration?: number; // seconds
  planned_tss?: number;
  planned_distance?: number; // meters
  indoor?: boolean;
  priority?: 'A' | 'B' | 'C'; // Race priority
}

/**
 * Allowed event type values for runtime validation.
 */
const VALID_EVENT_TYPES: ReadonlySet<string> = new Set([
  'workout',
  'race',
  'note',
  'rest_day',
  'travel',
]);

/**
 * Tool definition for get_events.
 */
const definition = {
  name: 'get_events',
  description:
    "Get upcoming calendar events from the athlete's Intervals.icu account. Returns planned workouts, races, rest days, and notes.",
  input_schema: {
    type: 'object' as const,
    properties: {
      oldest: {
        type: 'string',
        description:
          'Start date for events (ISO 8601 format, e.g., 2026-02-14). Defaults to today.',
      },
      newest: {
        type: 'string',
        description:
          'End date for events (ISO 8601 format, e.g., 2026-02-28). Defaults to 14 days from today.',
      },
      types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by event types: workout, race, note, rest_day, travel',
      },
      category: {
        type: 'string',
        description: 'Filter by activity category (Ride, Run, Swim, etc.)',
      },
    },
    required: [] as const,
  },
} as const;

/** ISO date pattern: YYYY-MM-DD */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Maximum number of days that can be requested in a single call. */
const MAX_DAYS = 90;

/** One day in milliseconds. */
const MS_PER_DAY = 86_400_000;

/**
 * Get date string in YYYY-MM-DD format from a UTC timestamp.
 */
function formatDateUTC(ms: number): string {
  return new Date(ms).toISOString().split('T')[0];
}

/**
 * Validate a date string by parsing it and round-tripping through formatting.
 * Returns true only for valid calendar dates in YYYY-MM-DD format.
 */
function isValidDate(dateStr: string): boolean {
  if (!ISO_DATE_PATTERN.test(dateStr)) return false;
  const parsed = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  // Round-trip check: ensures e.g. "2026-02-30" doesn't slip through
  return formatDateUTC(parsed.getTime()) === dateStr;
}

/**
 * Parse and validate input parameters.
 * Returns validated oldest/newest date strings plus optional filters.
 * Invalid dates fall back to defaults; swapped dates get corrected.
 */
function parseInput(input: Record<string, unknown>): {
  oldest: string;
  newest: string;
  types: string[] | undefined;
  category: string | undefined;
} {
  const nowMs = Date.now();
  const fourteenDaysLaterMs = nowMs + 14 * MS_PER_DAY;

  let oldest: string;
  if (typeof input.oldest === 'string' && isValidDate(input.oldest)) {
    oldest = input.oldest;
  } else {
    oldest = formatDateUTC(nowMs);
  }

  let newest: string;
  if (typeof input.newest === 'string' && isValidDate(input.newest)) {
    newest = input.newest;
  } else {
    newest = formatDateUTC(fourteenDaysLaterMs);
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

  // Validate types filter: keep only known event types
  let types: string[] | undefined;
  if (Array.isArray(input.types)) {
    const validated = input.types.filter(
      (t: unknown) => typeof t === 'string' && VALID_EVENT_TYPES.has(t)
    );
    if (validated.length > 0) {
      types = validated;
    }
  }

  const category = typeof input.category === 'string' ? input.category : undefined;

  return { oldest, newest, types, category };
}

const MOCK_EVENTS: readonly CalendarEvent[] = [
  {
    id: 'mock-event-1',
    name: 'Zone 2 Endurance Ride',
    type: 'workout',
    start_date: '2026-02-14T07:00:00Z',
    category: 'Ride',
    planned_duration: 5400,
    planned_tss: 65,
    indoor: false,
  },
  {
    id: 'mock-event-2',
    name: 'Recovery Day',
    type: 'rest_day',
    start_date: '2026-02-15T00:00:00Z',
    description: 'Active recovery or complete rest',
  },
  {
    id: 'mock-event-3',
    name: 'Interval Session',
    type: 'workout',
    start_date: '2026-02-16T06:30:00Z',
    category: 'Run',
    planned_duration: 3600,
    planned_tss: 72,
    planned_distance: 12000,
    indoor: false,
    description: '4x1km at threshold with 90s recovery',
  },
  {
    id: 'mock-event-4',
    name: 'Easy Swim',
    type: 'workout',
    start_date: '2026-02-17T12:00:00Z',
    category: 'Swim',
    planned_duration: 2700,
    planned_distance: 2000,
    indoor: true,
  },
  {
    id: 'mock-event-5',
    name: 'Travel to Race Venue',
    type: 'travel',
    start_date: '2026-02-28T10:00:00Z',
    end_date: '2026-02-28T16:00:00Z',
    description: 'Drive to race venue, check in',
  },
  {
    id: 'mock-event-6',
    name: 'Local Sprint Triathlon',
    type: 'race',
    start_date: '2026-03-01T08:00:00Z',
    category: 'Triathlon',
    priority: 'B',
    description: 'Season opener',
  },
  {
    id: 'mock-event-7',
    name: 'Training Notes',
    type: 'note',
    start_date: '2026-02-18T00:00:00Z',
    description: 'Start taper week for sprint tri. Reduce volume by 30%.',
  },
];

/**
 * Filter events whose start_date falls within the given date range (inclusive).
 * Date-only boundaries are expanded to cover the full day in UTC.
 */
function filterEventsByDateRange(
  events: readonly CalendarEvent[],
  oldest: string,
  newest: string
): CalendarEvent[] {
  const rangeStart = new Date(`${oldest}T00:00:00Z`).getTime();
  const rangeEnd = new Date(`${newest}T23:59:59.999Z`).getTime();

  return events.filter((e) => {
    const eventMs = new Date(e.start_date).getTime();
    if (Number.isNaN(eventMs)) return false;
    return eventMs >= rangeStart && eventMs <= rangeEnd;
  });
}

/**
 * Handler for get_events tool.
 * Returns mock data for now; real API integration in P3-A-05.
 */
async function handler(input: Record<string, unknown>, _athleteId: string): Promise<MCPToolResult> {
  try {
    const params = parseInput(input);

    // TODO (P3-A-05): Fetch real data from Intervals.icu API
    let filtered = filterEventsByDateRange(MOCK_EVENTS, params.oldest, params.newest);

    if (params.types != null && params.types.length > 0) {
      filtered = filtered.filter((e) => params.types?.includes(e.type));
    }

    if (params.category != null) {
      filtered = filtered.filter(
        (e) => e.category?.toLowerCase() === params.category?.toLowerCase()
      );
    }

    return {
      success: true,
      data: {
        events: filtered,
        total: filtered.length,
        date_range: {
          oldest: params.oldest,
          newest: params.newest,
        },
        filters_applied: {
          types: params.types,
          category: params.category,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get events',
      code: 'GET_EVENTS_ERROR',
    };
  }
}

/**
 * Exported tool entry for registration.
 */
export const getEventsTool: MCPToolEntry = {
  definition,
  handler,
};
