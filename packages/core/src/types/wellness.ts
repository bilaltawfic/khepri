/**
 * Shared wellness types used across the Khepri monorepo.
 */

export type BodyArea = 'legs' | 'back' | 'shoulders' | 'arms' | 'core' | 'neck';

export const BODY_AREAS: readonly BodyArea[] = [
  'legs',
  'back',
  'shoulders',
  'arms',
  'core',
  'neck',
] as const;

export type SorenessAreas = Partial<Record<BodyArea, number>>;

export type TravelStatus = 'home' | 'traveling' | 'returning';

export const TRAVEL_STATUSES: readonly TravelStatus[] = ['home', 'traveling', 'returning'] as const;

export function isBodyArea(value: string): value is BodyArea {
  return (BODY_AREAS as readonly string[]).includes(value);
}

export function isTravelStatus(value: string): value is TravelStatus {
  return (TRAVEL_STATUSES as readonly string[]).includes(value);
}
