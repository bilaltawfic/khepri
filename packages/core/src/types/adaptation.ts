/**
 * Plan adaptation types for the Khepri training plan model.
 */

export const ADAPTATION_TRIGGERS = [
  'coach_suggestion',
  'athlete_request',
  'block_review',
  'external_sync',
] as const;
export type AdaptationTrigger = (typeof ADAPTATION_TRIGGERS)[number];

export const ADAPTATION_STATUSES = ['suggested', 'accepted', 'rejected', 'rolled_back'] as const;
export type AdaptationStatus = (typeof ADAPTATION_STATUSES)[number];

export const COMPLIANCE_COLORS = ['green', 'amber', 'red'] as const;
export type ComplianceColor = (typeof COMPLIANCE_COLORS)[number];

export function isAdaptationTrigger(value: unknown): value is AdaptationTrigger {
  return typeof value === 'string' && (ADAPTATION_TRIGGERS as readonly string[]).includes(value);
}

export function isAdaptationStatus(value: unknown): value is AdaptationStatus {
  return typeof value === 'string' && (ADAPTATION_STATUSES as readonly string[]).includes(value);
}

export function isComplianceColor(value: unknown): value is ComplianceColor {
  return typeof value === 'string' && (COMPLIANCE_COLORS as readonly string[]).includes(value);
}

export interface ComplianceResult {
  readonly score: number;
  readonly color: ComplianceColor;
  readonly durationMatch: number | null;
  readonly tssMatch: number | null;
  readonly distanceMatch: number | null;
  readonly completionStatus: 'completed' | 'partial' | 'skipped' | 'pending';
}

export interface WorkoutSnapshot {
  readonly workoutId: string;
  readonly before: Record<string, unknown>;
  readonly after: Record<string, unknown>;
  readonly changeType: 'modified' | 'swapped' | 'skipped' | 'added' | 'removed';
}

export interface PlanAdaptation {
  readonly id: string;
  readonly blockId: string;
  readonly athleteId: string;
  readonly trigger: AdaptationTrigger;
  readonly status: AdaptationStatus;
  readonly affectedWorkouts: readonly WorkoutSnapshot[];
  readonly reason: string;
  readonly context: Record<string, unknown> | null;
}
