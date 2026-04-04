/**
 * Season-based planning types for the Khepri training plan model.
 */

export const SEASON_STATUSES = ['active', 'completed', 'archived'] as const;
export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export const BLOCK_STATUSES = ['draft', 'locked', 'in_progress', 'completed', 'cancelled'] as const;
export type BlockStatus = (typeof BLOCK_STATUSES)[number];

export function isSeasonStatus(value: unknown): value is SeasonStatus {
  return typeof value === 'string' && (SEASON_STATUSES as readonly string[]).includes(value);
}

export function isBlockStatus(value: unknown): value is BlockStatus {
  return typeof value === 'string' && (BLOCK_STATUSES as readonly string[]).includes(value);
}

export interface SeasonPreferences {
  readonly weeklyHoursTarget: number;
  readonly availableDays: readonly number[];
  readonly sportPriority: readonly string[];
  readonly maxSessionsPerDay: number;
  readonly preferredRestDays: readonly number[];
}

export interface SeasonSkeleton {
  readonly phases: readonly SeasonSkeletonPhase[];
  readonly generatedAt: string;
}

export interface SeasonSkeletonPhase {
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly focus: string;
  readonly weeklyHours: number;
}

export interface BlockPhase {
  readonly name: string;
  readonly weeks: number;
  readonly focus: string;
  readonly weeklyHours: number;
}

export interface Season {
  readonly id: string;
  readonly athleteId: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: SeasonStatus;
  readonly preferences: SeasonPreferences;
  readonly skeleton: SeasonSkeleton | null;
}

export interface RaceBlock {
  readonly id: string;
  readonly seasonId: string;
  readonly athleteId: string;
  readonly name: string;
  readonly goalId: string | null;
  readonly startDate: string;
  readonly endDate: string;
  readonly totalWeeks: number;
  readonly status: BlockStatus;
  readonly phases: readonly BlockPhase[];
}
