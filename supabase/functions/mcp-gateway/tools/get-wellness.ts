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

/**
 * Get date string in YYYY-MM-DD format.
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse and validate input parameters.
 * Returns validated oldest/newest date strings.
 */
function parseInput(input: Record<string, unknown>): {
  oldest: string;
  newest: string;
} {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let oldest: string;
  if (typeof input.oldest === 'string' && ISO_DATE_PATTERN.test(input.oldest)) {
    oldest = input.oldest;
  } else {
    oldest = formatDate(sevenDaysAgo);
  }

  let newest: string;
  if (typeof input.newest === 'string' && ISO_DATE_PATTERN.test(input.newest)) {
    newest = input.newest;
  } else {
    newest = formatDate(now);
  }

  // Ensure oldest is not after newest
  if (oldest > newest) {
    const temp = oldest;
    oldest = newest;
    newest = temp;
  }

  return { oldest, newest };
}

/**
 * Generate mock wellness data for a date range.
 * Returns realistic-looking data with natural day-to-day variation.
 */
function generateMockWellnessData(oldest: string, newest: string): WellnessData[] {
  const data: WellnessData[] = [];
  const start = new Date(oldest);
  const end = new Date(newest);

  // Guard against invalid dates
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return data;
  }

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
