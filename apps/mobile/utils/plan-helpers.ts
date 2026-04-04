import type { Ionicons } from '@expo/vector-icons';

import type { Colors } from '@/constants/Colors';

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
