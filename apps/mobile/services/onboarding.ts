import type { OnboardingData } from '@/contexts';
import { supabase } from '@/lib/supabase';
import { createAthlete, getAthleteByAuthUser, updateAthlete } from '@khepri/supabase-client';

export type SaveOnboardingResult = {
  readonly success: boolean;
  readonly error?: string;
};

/**
 * Resolve or create the athlete record for the given auth user.
 * Returns the athlete row or an error result.
 */
async function resolveAthlete(
  client: NonNullable<typeof supabase>,
  authUserId: string
): Promise<SaveOnboardingResult & { athleteId?: string }> {
  const athleteResult = await getAthleteByAuthUser(client, authUserId);

  if (athleteResult.error) {
    return { success: false, error: athleteResult.error.message };
  }

  if (athleteResult.data) {
    return { success: true, athleteId: athleteResult.data.id };
  }

  // Create athlete record if it doesn't exist yet (first-time onboarding)
  const createResult = await createAthlete(client, { auth_user_id: authUserId });
  if (createResult.error || !createResult.data) {
    return {
      success: false,
      error: createResult.error?.message ?? 'Failed to create athlete profile',
    };
  }
  return { success: true, athleteId: createResult.data.id };
}

/**
 * Saves onboarding data to Supabase.
 * Updates athlete profile with fitness numbers only.
 * Intervals.icu credentials are persisted during the connect step.
 */
export async function saveOnboardingData(
  authUserId: string,
  data: OnboardingData
): Promise<SaveOnboardingResult> {
  if (!supabase) {
    return { success: true };
  }

  try {
    const athleteResolution = await resolveAthlete(supabase, authUserId);
    if (!athleteResolution.success || !athleteResolution.athleteId) {
      return { success: false, error: athleteResolution.error };
    }
    const athleteId = athleteResolution.athleteId;

    const updateResult = await updateAthlete(supabase, athleteId, {
      ftp_watts: data.ftp ?? null,
      lthr: data.lthr ?? null,
      running_threshold_pace_sec_per_km: data.runThresholdPace ?? null,
      css_sec_per_100m: data.css ?? null,
      resting_heart_rate: data.restingHR ?? null,
      max_heart_rate: data.maxHR ?? null,
      weight_kg: data.weight ?? null,
    });

    if (updateResult.error) {
      return { success: false, error: updateResult.error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save onboarding data',
    };
  }
}
