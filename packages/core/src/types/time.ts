/**
 * Shared time-related types used across the Khepri monorepo.
 */

export type AvailableTimeMinutes = 15 | 30 | 45 | 60 | 90 | 120;

export const AVAILABLE_TIME_VALUES: readonly AvailableTimeMinutes[] = [
  15, 30, 45, 60, 90, 120,
] as const;

export function isAvailableTimeMinutes(value: number): value is AvailableTimeMinutes {
  return (AVAILABLE_TIME_VALUES as readonly number[]).includes(value);
}
