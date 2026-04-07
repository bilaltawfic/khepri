// ==== Block Planning Types ====

import type { Sport } from './workout.js';

/** A date when the athlete is unavailable, with an optional reason. */
export interface UnavailableDate {
  readonly date: string; // YYYY-MM-DD
  readonly reason?: string;
}

/**
 * A day-of-week preference for a specific sport (and optional workout label),
 * collected during block setup. `dayOfWeek` follows the JavaScript convention
 * (0 = Sunday … 6 = Saturday) so it aligns with `Date.getDay()` and the
 * `availableDays` field on season preferences.
 */
export interface DayPreference {
  readonly dayOfWeek: number; // 0=Sun ... 6=Sat
  readonly sport: Sport;
  readonly workoutLabel?: string;
}
