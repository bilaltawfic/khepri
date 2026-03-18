import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { MCPToolEntry, MCPToolResult } from '../types.ts';
import { getIntervalsCredentials } from '../utils/credentials.ts';
import { IntervalsApiError, fetchAthleteProfile } from '../utils/intervals-api.ts';

/**
 * Tool definition for get_athlete_profile.
 * Returns fitness thresholds from the athlete's Intervals.icu profile.
 */
const definition = {
  name: 'get_athlete_profile',
  description:
    "Get the athlete's profile from Intervals.icu, including fitness thresholds (FTP, LTHR, max HR, resting HR, running threshold pace, CSS).",
  input_schema: {
    type: 'object' as const,
    properties: {},
    required: [] as const,
  },
} as const;

/**
 * Handler for get_athlete_profile tool.
 * Fetches real data from Intervals.icu when credentials are configured,
 * otherwise returns an error indicating no credentials.
 */
async function handler(
  _input: Record<string, unknown>,
  athleteId: string,
  supabase: SupabaseClient
): Promise<MCPToolResult> {
  try {
    const credentials = await getIntervalsCredentials(supabase, athleteId);

    if (!credentials) {
      return {
        success: false,
        error: 'Intervals.icu credentials not configured',
        code: 'NO_CREDENTIALS',
      };
    }

    const profile = await fetchAthleteProfile(credentials);

    return {
      success: true,
      data: {
        ftp: profile.ftp ?? null,
        lthr: profile.lthr ?? null,
        resting_hr: profile.resting_hr ?? null,
        max_hr: profile.max_hr ?? null,
        run_ftp: profile.run_ftp ?? null,
        swim_ftp: profile.swim_ftp ?? null,
        source: 'intervals.icu',
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
      error: error instanceof Error ? error.message : 'Failed to get athlete profile',
      code: 'GET_ATHLETE_PROFILE_ERROR',
    };
  }
}

/**
 * Exported tool entry for registration.
 */
export const getAthleteProfileTool: MCPToolEntry = {
  definition,
  handler,
};
