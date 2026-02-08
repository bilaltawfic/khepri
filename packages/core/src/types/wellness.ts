/**
 * Shared wellness types used across the Khepri monorepo.
 */

export const BODY_AREAS = ['legs', 'back', 'shoulders', 'arms', 'core', 'neck'] as const;

export type BodyArea = (typeof BODY_AREAS)[number];

export type SorenessAreas = Partial<Record<BodyArea, number>>;

export const TRAVEL_STATUSES = ['home', 'traveling', 'returning'] as const;

export type TravelStatus = (typeof TRAVEL_STATUSES)[number];

export function isBodyArea(value: unknown): value is BodyArea {
  return typeof value === 'string' && (BODY_AREAS as readonly string[]).includes(value);
}

export function isTravelStatus(value: unknown): value is TravelStatus {
  return typeof value === 'string' && (TRAVEL_STATUSES as readonly string[]).includes(value);
}
