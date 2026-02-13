import type { MCPToolEntry, MCPToolResult } from '../types.ts';

/**
 * Wellness data point shape matching Intervals.icu API.
 */
interface WellnessData {
  date: string; // YYYY-MM-DD
  ctl: number; // Chronic Training Load (fitness)
  atl: number; // Acute Training Load (fatigue)
  tsb: number; // Training Stress Balance (form)
  rampRate: number; // Weekly CTL increase rate
  restingHR?: number; // bpm
  hrv?: number; // ms (RMSSD or similar)
  hrvSDNN?: number; // ms
  sleepQuality?: number; // 1-5 scale
  sleepHours?: number; // hours
  weight?: number; // kg
  fatigue?: number; // 1-5 scale
  soreness?: number; // 1-5 scale
  stress?: number; // 1-5 scale
  mood?: number; // 1-5 scale
}

/**
 * Tool definition for get_wellness_data.
 */
const definition = {
  name: 'get_wellness_data',
  description:
    "Get wellness metrics from the athlete's Intervals.icu account. Returns daily wellness data including CTL/ATL/TSB (fitness/fatigue/form), resting HR, HRV, sleep, weight, and subjective metrics.",
  input_schema: {
    type: 'object' as const,
    properties: {
      oldest: {
        type: 'string',
        description:
          'Start date for wellness data (ISO 8601 format, e.g., 2026-02-01). Defaults to 7 days ago.',
      },
      newest: {
        type: 'string',
        description:
          'End date for wellness data (ISO 8601 format, e.g., 2026-02-13). Defaults to today.',
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
 * Returns realistic-looking data with natural day-to-day variation.
 * Uses UTC timestamps throughout to avoid timezone-related off-by-one errors.
 */
function generateMockWellnessData(oldest: string, newest: string): WellnessData[] {
  const data: WellnessData[] = [];
  const startMs = new Date(`${oldest}T00:00:00Z`).getTime();
  const endMs = new Date(`${newest}T00:00:00Z`).getTime();

  // Guard against invalid dates
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return data;
  }

  // Base values for realistic progression
  let ctl = 70;
  let atl = 65;

  for (let ms = startMs; ms <= endMs; ms += MS_PER_DAY) {
    // Simulate natural variation
    const dayVariation = Math.random() * 0.1 - 0.05;
    ctl = Math.round((ctl + dayVariation * 2) * 10) / 10;
    atl = Math.round((atl + (Math.random() * 8 - 4)) * 10) / 10;
    const tsb = Math.round((ctl - atl) * 10) / 10;

    data.push({
      date: formatDateUTC(ms),
      ctl,
      atl,
      tsb,
      rampRate: Math.round((Math.random() * 6 - 1) * 10) / 10,
      restingHR: 48 + Math.floor(Math.random() * 8),
      hrv: 45 + Math.floor(Math.random() * 25),
      sleepQuality: 3 + Math.floor(Math.random() * 3),
      sleepHours: Math.round((6.5 + Math.random() * 2) * 10) / 10,
      weight: Math.round((72 + Math.random() * 1.5) * 10) / 10,
      fatigue: 2 + Math.floor(Math.random() * 3),
      soreness: 1 + Math.floor(Math.random() * 3),
      stress: 2 + Math.floor(Math.random() * 2),
      mood: 3 + Math.floor(Math.random() * 2),
    });
  }

  return data;
}

/**
 * Determine form status from TSB value.
 */
function getFormStatus(tsb: number): 'fresh' | 'fatigued' | 'optimal' {
  if (tsb > 5) return 'fresh';
  if (tsb < -10) return 'fatigued';
  return 'optimal';
}

/**
 * Handler for get_wellness_data tool.
 * Returns mock data for now; real API integration in P3-A-05.
 */
async function handler(input: Record<string, unknown>, _athleteId: string): Promise<MCPToolResult> {
  try {
    const params = parseInput(input);

    // TODO (P3-A-05): Fetch real data from Intervals.icu API
    const wellnessData = generateMockWellnessData(params.oldest, params.newest);

    if (wellnessData.length === 0) {
      return {
        success: true,
        data: {
          wellness: [],
          summary: null,
          date_range: {
            oldest: params.oldest,
            newest: params.newest,
          },
        },
      };
    }

    const latestData = wellnessData[wellnessData.length - 1];
    const avgSleep =
      wellnessData.reduce((sum, d) => sum + (d.sleepHours ?? 0), 0) / wellnessData.length;
    const avgHRV = wellnessData.reduce((sum, d) => sum + (d.hrv ?? 0), 0) / wellnessData.length;

    return {
      success: true,
      data: {
        wellness: wellnessData,
        summary: {
          current_ctl: latestData.ctl,
          current_atl: latestData.atl,
          current_tsb: latestData.tsb,
          form_status: getFormStatus(latestData.tsb),
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
