import type { OnboardingData, OnboardingGoal } from '@/contexts';
import { supabase } from '@/lib/supabase';
import {
  type GoalInsert,
  createGoal,
  getAthleteByAuthUser,
  updateAthlete,
} from '@khepri/supabase-client';

export type SaveOnboardingResult = {
  readonly success: boolean;
  readonly error?: string;
};

function buildGoalInsert(athleteId: string, goal: OnboardingGoal): GoalInsert {
  return {
    athlete_id: athleteId,
    goal_type: goal.goalType,
    title: goal.title,
    target_date: goal.targetDate ?? null,
    priority: goal.priority,
    status: 'active',
  };
}

/**
 * Saves all onboarding data to Supabase.
 * - Updates athlete profile with fitness numbers
 * - Creates goals from onboarding goals list
 *
 * Note: Intervals.icu credentials are NOT saved here (Phase 3 - needs encryption)
 */
export async function saveOnboardingData(
  authUserId: string,
  data: OnboardingData
): Promise<SaveOnboardingResult> {
  // Dev mode bypass - no Supabase configured
  if (!supabase) {
    return { success: true };
  }

  try {
    // 1. Resolve athlete record from auth user ID
    const athleteResult = await getAthleteByAuthUser(supabase, authUserId);

    if (athleteResult.error) {
      return { success: false, error: athleteResult.error.message };
    }

    if (!athleteResult.data) {
      return { success: false, error: 'Athlete profile not found' };
    }

    const athlete = athleteResult.data;

    // 2. Update athlete profile with fitness numbers
    const updateResult = await updateAthlete(supabase, athlete.id, {
      ftp_watts: data.ftp ?? null,
      resting_heart_rate: data.restingHR ?? null,
      max_heart_rate: data.maxHR ?? null,
      weight_kg: data.weight ?? null,
    });

    if (updateResult.error) {
      return { success: false, error: updateResult.error.message };
    }

    // 3. Create goals from onboarding
    const goalErrors: string[] = [];

    for (const goal of data.goals) {
      const goalInsert = buildGoalInsert(athlete.id, goal);
      const goalResult = await createGoal(supabase, goalInsert);

      if (goalResult.error) {
        goalErrors.push(`Failed to create goal "${goal.title}": ${goalResult.error.message}`);
      }
    }

    // Report partial success if some goals failed
    if (goalErrors.length > 0) {
      return {
        success: true,
        error: `Profile saved but some goals failed: ${goalErrors.join('; ')}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save onboarding data',
    };
  }
}
