// ==== Block Planning Types ====

import type { DayOfWeek } from '../utils/week-assembler.js';
import type { Sport } from './workout.js';

/** A date when the athlete is unavailable, with an optional reason. */
export interface UnavailableDate {
  readonly date: string; // YYYY-MM-DD
  readonly reason?: string;
}

/**
 * A day-of-week preference for a specific sport (and optional workout label),
 * collected during block setup and consumed by the week assembler.
 *
 * `dayOfWeek` uses the **`DayOfWeek` convention from `week-assembler`**
 * (0 = Monday … 6 = Sunday) so it can flow directly into `assembleWeek`'s
 * `DayConstraint` without remapping. This is *different* from JavaScript's
 * `Date.getDay()` convention (Sun=0) — callers that start from a `Date`
 * must convert.
 */
export interface DayPreference {
  readonly dayOfWeek: DayOfWeek;
  readonly sport: Sport;
  readonly workoutLabel?: string;
}
