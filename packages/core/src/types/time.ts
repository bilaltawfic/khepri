/**
 * Shared time-related types used across the Khepri monorepo.
 */

export const AVAILABLE_TIME_VALUES = [15, 30, 45, 60, 90, 120] as const;

export type AvailableTimeMinutes = (typeof AVAILABLE_TIME_VALUES)[number];

export function isAvailableTimeMinutes(value: unknown): value is AvailableTimeMinutes {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    (AVAILABLE_TIME_VALUES as readonly number[]).includes(value)
  );
}
