import type { OnboardingData, OnboardingGoal } from '@/contexts';
import { supabase } from '@/lib/supabase';
import {
  type GoalInsert,
  createAthlete,
  createGoal,
  createTrainingPlan,
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
 * Format a Date as YYYY-MM-DD for Supabase date columns.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Saves all onboarding data to Supabase.
 * - Updates athlete profile with fitness numbers
 * - Creates goals from onboarding goals list
 * - Creates training plan if structured plan was selected
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
    // 1. Resolve or create athlete record from auth user ID
    const athleteResult = await getAthleteByAuthUser(supabase, authUserId);

    if (athleteResult.error) {
      return { success: false, error: athleteResult.error.message };
    }

    let athlete = athleteResult.data;

    if (!athlete) {
      // Create athlete record if it doesn't exist yet (first-time onboarding)
      const createResult = await createAthlete(supabase, { auth_user_id: authUserId });
      if (createResult.error || !createResult.data) {
        return {
          success: false,
          error: createResult.error?.message ?? 'Failed to create athlete profile',
        };
      }
      athlete = createResult.data;
    }

    // 2. Update athlete profile with all 6 fitness numbers
    const updateResult = await updateAthlete(supabase, athlete.id, {
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

    // 3. Create goals from onboarding
    const goalErrors: string[] = [];

    for (const goal of data.goals) {
      const goalInsert = buildGoalInsert(athlete.id, goal);
      const goalResult = await createGoal(supabase, goalInsert);

      if (goalResult.error) {
        goalErrors.push(`Failed to create goal "${goal.title}": ${goalResult.error.message}`);
      }
    }

    // 4. Create training plan if structured plan was selected
    if (data.planDurationWeeks != null) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + data.planDurationWeeks * 7);

      const planResult = await createTrainingPlan(supabase, {
        athlete_id: athlete.id,
        name: `${data.planDurationWeeks}-Week Training Plan`,
        total_weeks: data.planDurationWeeks,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      });

      if (planResult.error) {
        goalErrors.push(`Failed to create training plan: ${planResult.error.message}`);
      }
    }

    // Report partial success if some goals or plan failed
    if (goalErrors.length > 0) {
      return {
        success: true,
        error: `Profile saved but some items failed: ${goalErrors.join('; ')}`,
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
