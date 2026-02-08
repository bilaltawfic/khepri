/**
 * Shared daily constraint types used across the Khepri monorepo.
 */

export const DAILY_CONSTRAINT_TYPES = [
  'traveling',
  'limited_equipment',
  'feeling_unwell',
  'time_constrained',
  'outdoor_only',
  'indoor_only',
] as const;

export type DailyConstraintType = (typeof DAILY_CONSTRAINT_TYPES)[number];

export function isDailyConstraintType(value: unknown): value is DailyConstraintType {
  return typeof value === 'string' && (DAILY_CONSTRAINT_TYPES as readonly string[]).includes(value);
}
