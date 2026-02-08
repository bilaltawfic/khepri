/**
 * Shared daily constraint types used across the Khepri monorepo.
 */

export type DailyConstraintType =
  | 'traveling'
  | 'limited_equipment'
  | 'feeling_unwell'
  | 'time_constrained'
  | 'outdoor_only'
  | 'indoor_only';

export const DAILY_CONSTRAINT_TYPES: readonly DailyConstraintType[] = [
  'traveling',
  'limited_equipment',
  'feeling_unwell',
  'time_constrained',
  'outdoor_only',
  'indoor_only',
] as const;

export function isDailyConstraintType(value: string): value is DailyConstraintType {
  return (DAILY_CONSTRAINT_TYPES as readonly string[]).includes(value);
}
