import type { Ionicons } from '@expo/vector-icons';

import type { DayPreference as CoreDayPreference } from '@khepri/core';
import { isSport } from '@khepri/core';

import type { Colors } from '@/constants/Colors';

// =============================================================================
// Block setup helpers
// =============================================================================

/** Minimal UI shape of a per-day chip. Matches components/DayPreferenceRow. */
export interface UiDayPreference {
  readonly sport: string;
  readonly workoutLabel?: string;
}

/**
 * Flatten the UI's per-day chip state into a list of core `DayPreference`
 * entries suitable for the generate-block-workouts edge function.
 *
 * The UI uses `dayIndex` 0=Mon … 6=Sun for display reasons, but the edge
 * function follows the JavaScript `Date.getDay()` convention (0=Sun … 6=Sat),
 * so this helper remaps via `(dayIndex + 1) % 7`.
 *
 * Chips whose `sport` string does not map to a valid `Sport` are silently
 * dropped — the UI should never allow this, but we validate at the boundary.
 */
export function flattenDayPreferences(
  perDay: readonly (readonly UiDayPreference[])[]
): readonly CoreDayPreference[] {
  const result: CoreDayPreference[] = [];
  for (let dayIndex = 0; dayIndex < perDay.length; dayIndex++) {
    const jsDayOfWeek = (dayIndex + 1) % 7;
    for (const pref of perDay[dayIndex]) {
      const sportLower = pref.sport.toLowerCase();
      if (!isSport(sportLower)) continue;
      // `isSport` narrowed `sportLower` to `Sport` above.
      result.push({
        dayOfWeek: jsDayOfWeek,
        sport: sportLower,
        workoutLabel: pref.workoutLabel,
      });
    }
  }
  return result;
}

/**
 * Format a duration in minutes for workout display.
 * Examples: 45 -> "45m", 90 -> "1h 30m", 60 -> "1h"
 */
export function formatWorkoutDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Map a sport string to an Ionicons icon name. */
export function getSportIcon(sport: string): React.ComponentProps<typeof Ionicons>['name'] {
  switch (sport) {
    case 'swim':
      return 'water';
    case 'bike':
      return 'bicycle';
    case 'run':
      return 'footsteps';
    case 'strength':
      return 'barbell';
    case 'rest':
      return 'bed';
    default:
      return 'fitness';
  }
}

// =============================================================================
// Adaptation helpers
// =============================================================================

export interface AdaptationWorkoutPair {
  readonly original: { name: string; sport: string; durationMinutes: number; date: string };
  readonly modified: { name: string; sport: string; durationMinutes: number; date: string } | null;
}

/**
 * Extract original + modified workout summaries from a PlanAdaptationRow's
 * affected_workouts JSONB array.
 */
export function getAdaptationWorkoutPair(affected_workouts: unknown): AdaptationWorkoutPair | null {
  if (!Array.isArray(affected_workouts) || affected_workouts.length === 0) return null;
  const first = affected_workouts[0];
  if (typeof first !== 'object' || first == null || Array.isArray(first)) return null;
  const firstObj = first as Record<string, unknown>;
  const before = firstObj.before as Record<string, unknown> | null | undefined;
  if (before == null) return null;
  const workoutDate =
    typeof before.date === 'string' ? before.date : new Date().toISOString().slice(0, 10);
  const original = {
    name: typeof before.name === 'string' ? before.name : 'Workout',
    sport: typeof before.sport === 'string' ? before.sport : 'bike',
    durationMinutes:
      typeof before.plannedDurationMinutes === 'number' ? before.plannedDurationMinutes : 60,
    date: workoutDate,
  };
  const after = firstObj.after as Record<string, unknown> | null | undefined;
  const hasAfter =
    after != null &&
    typeof after === 'object' &&
    !Array.isArray(after) &&
    Object.keys(after).length > 0;
  const modified = hasAfter
    ? {
        name: typeof after.name === 'string' ? after.name : original.name,
        sport: typeof after.sport === 'string' ? after.sport : original.sport,
        durationMinutes:
          typeof after.plannedDurationMinutes === 'number'
            ? after.plannedDurationMinutes
            : original.durationMinutes,
        date: workoutDate,
      }
    : null;
  return { original, modified };
}

// =============================================================================
// Compliance helpers
// =============================================================================

/** Return a compliance icon + color for a workout, or null if not yet relevant. */
export function getComplianceIcon(
  workout: { readonly completed_at: string | null; readonly date: string },
  colors: typeof Colors.light
): { name: React.ComponentProps<typeof Ionicons>['name']; color: string } | null {
  if (workout.completed_at != null) {
    return { name: 'checkmark-circle', color: colors.success };
  }
  const workoutDate = new Date(`${workout.date}T23:59:59`);
  if (workoutDate.getTime() < Date.now()) {
    return { name: 'close-circle', color: colors.error };
  }
  return null;
}
