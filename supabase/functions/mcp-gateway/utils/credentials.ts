import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { decrypt } from '../../credentials/index.ts';

export interface IntervalsCredentials {
  readonly intervalsAthleteId: string;
  readonly apiKey: string;
}

/**
 * Fetch and decrypt Intervals.icu credentials for an athlete.
 * Returns null if credentials are not configured.
 */
export async function getIntervalsCredentials(
  supabase: SupabaseClient,
  athleteId: string
): Promise<IntervalsCredentials | null> {
  const { data, error } = await supabase
    .from('intervals_credentials')
    .select('intervals_athlete_id, encrypted_api_key')
    .eq('athlete_id', athleteId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - credentials not configured
      return null;
    }
    throw new Error(`Failed to fetch credentials: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const apiKey = await decrypt(data.encrypted_api_key);

  return {
    intervalsAthleteId: data.intervals_athlete_id,
    apiKey,
  };
}
