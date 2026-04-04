/**
 * Workout types for the Khepri training plan model.
 */

import type { ComplianceResult } from './adaptation.js';

export const SPORTS = ['swim', 'bike', 'run', 'strength', 'rest'] as const;
export type Sport = (typeof SPORTS)[number];

export const WORKOUT_TYPES = [
  'intervals',
  'endurance',
  'tempo',
  'threshold',
  'recovery',
  'race',
  'test',
] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const SYNC_STATUSES = ['pending', 'synced', 'conflict', 'not_connected'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const INTERVALS_TARGETS = ['POWER', 'PACE', 'HR', 'AUTO'] as const;
export type IntervalsTarget = (typeof INTERVALS_TARGETS)[number];

export function isSport(value: unknown): value is Sport {
  return typeof value === 'string' && (SPORTS as readonly string[]).includes(value);
}

export function isWorkoutType(value: unknown): value is WorkoutType {
  return typeof value === 'string' && (WORKOUT_TYPES as readonly string[]).includes(value);
}

export function isSyncStatus(value: unknown): value is SyncStatus {
  return typeof value === 'string' && (SYNC_STATUSES as readonly string[]).includes(value);
}

export function isIntervalsTarget(value: unknown): value is IntervalsTarget {
  return typeof value === 'string' && (INTERVALS_TARGETS as readonly string[]).includes(value);
}

export interface WorkoutStructure {
  readonly sections: readonly WorkoutSection[];
  readonly totalDurationMinutes: number;
  readonly notes?: string;
}

export interface WorkoutSection {
  readonly name: string;
  readonly steps: readonly WorkoutStep[];
  readonly durationMinutes: number;
}

export interface WorkoutStep {
  readonly description: string;
  readonly durationMinutes?: number;
  readonly durationMeters?: number;
  readonly repeat?: number;
  readonly zone?: string;
  readonly target?: string;
}

export interface Workout {
  readonly id: string;
  readonly blockId: string;
  readonly athleteId: string;
  readonly date: string;
  readonly weekNumber: number;
  readonly name: string;
  readonly sport: Sport;
  readonly workoutType: WorkoutType | null;
  readonly plannedDurationMinutes: number;
  readonly plannedTss: number | null;
  readonly structure: WorkoutStructure;
  readonly descriptionDsl: string;
  readonly intervalsTarget: IntervalsTarget;
  readonly syncStatus: SyncStatus;
  readonly externalId: string;
  readonly actualDurationMinutes: number | null;
  readonly actualTss: number | null;
  readonly completedAt: string | null;
  readonly compliance: ComplianceResult | null;
}
