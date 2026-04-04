/**
 * Intervals.icu Sync Engine — shared logic for webhook, cron, and push.
 *
 * Handles:
 * - Activity → Workout matching (by date + sport, closest duration)
 * - Compliance computation (TSS > Duration > Distance)
 * - Event diff detection (last-write-wins)
 */

// ====================================================================
// Types
// ====================================================================

/** Inbound activity from Intervals.icu */
export interface SyncActivity {
  readonly id: string;
  readonly type: string; // Ride, Run, Swim, etc.
  readonly start_date_local: string; // YYYY-MM-DD...
  readonly moving_time: number; // seconds
  readonly distance?: number; // meters
  readonly icu_training_load?: number; // TSS
  readonly average_watts?: number;
  readonly gap?: number; // grade-adjusted pace (sec/km)
  readonly average_heartrate?: number;
}

/** Local planned workout (minimal fields needed for matching) */
export interface PlannedWorkout {
  readonly id: string;
  readonly date: string; // YYYY-MM-DD
  readonly sport: string; // swim, bike, run, strength, rest
  readonly planned_duration_minutes: number;
  readonly planned_tss: number | null;
  readonly planned_distance_meters: number | null;
  readonly name: string;
  readonly external_id: string;
  readonly block_id: string;
  readonly intervals_activity_id: string | null;
}

/** Local event fields for diffing against Intervals.icu */
export interface LocalEventState {
  readonly name: string;
  readonly description_dsl: string;
  readonly planned_duration_minutes: number;
  readonly date: string;
}

/** Intervals.icu event for diffing */
export interface RemoteEventState {
  readonly id: number;
  readonly name: string;
  readonly description?: string;
  readonly moving_time?: number; // seconds
  readonly start_date_local: string;
}

export type MatchConfidence = 'exact' | 'probable' | 'weak';

export interface MatchResult {
  readonly workout: PlannedWorkout;
  readonly confidence: MatchConfidence;
}

export type ComplianceColor = 'green' | 'amber' | 'red';

export interface ComplianceResult {
  readonly score: number;
  readonly color: ComplianceColor;
  readonly durationMatch: number | null;
  readonly tssMatch: number | null;
  readonly distanceMatch: number | null;
  readonly completionStatus: 'completed' | 'partial' | 'skipped' | 'pending';
}

export interface DiffResult {
  readonly changed: boolean;
  readonly fields: string[];
}

// ====================================================================
// Sport Mapping
// ====================================================================

const INTERVALS_SPORT_TO_KHEPRI: Record<string, string> = {
  Ride: 'bike',
  VirtualRide: 'bike',
  MountainBikeRide: 'bike',
  GravelRide: 'bike',
  TrackRide: 'bike',
  Run: 'run',
  VirtualRun: 'run',
  TrailRun: 'run',
  Swim: 'swim',
  OpenWaterSwim: 'swim',
  WeightTraining: 'strength',
  Yoga: 'strength',
};

/**
 * Map an Intervals.icu activity type to a Khepri sport.
 * Returns null for unrecognised types.
 */
export function mapIntervalsTypeToSport(intervalsType: string): string | null {
  return INTERVALS_SPORT_TO_KHEPRI[intervalsType] ?? null;
}

const KHEPRI_SPORT_TO_INTERVALS: Record<string, string> = {
  bike: 'Ride',
  run: 'Run',
  swim: 'Swim',
  strength: 'WeightTraining',
};

/**
 * Map a Khepri sport to an Intervals.icu activity type.
 */
export function mapSportToIntervalsType(sport: string): string {
  return KHEPRI_SPORT_TO_INTERVALS[sport] ?? 'Other';
}

// ====================================================================
// Activity → Workout Matching
// ====================================================================

/**
 * Extract YYYY-MM-DD from a date string.
 * Handles both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss..." formats.
 */
function extractDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

/**
 * Match a completed activity to a planned workout.
 *
 * Logic:
 * 1. Filter workouts to same date as activity
 * 2. Match by sport type
 * 3. If multiple same-sport workouts on same day, pick closest by duration
 * 4. If no match → return null (unplanned session)
 */
export function matchActivityToWorkout(
  activity: SyncActivity,
  plannedWorkouts: readonly PlannedWorkout[]
): MatchResult | null {
  const activityDate = extractDate(activity.start_date_local);
  const activitySport = mapIntervalsTypeToSport(activity.type);

  if (activitySport == null) {
    return null;
  }

  // Filter to same date and sport, allowing unlinked workouts or ones already linked
  // to this activity so repeated activity.update webhooks remain idempotent.
  const candidates = plannedWorkouts.filter(
    (w) =>
      w.date === activityDate &&
      w.sport === activitySport &&
      (w.intervals_activity_id == null || w.intervals_activity_id === activity.id)
  );

  if (candidates.length === 0) {
    return null;
  }

  const activityDurationMin = activity.moving_time / 60;

  if (candidates.length === 1) {
    const durationRatio =
      candidates[0].planned_duration_minutes > 0
        ? activityDurationMin / candidates[0].planned_duration_minutes
        : 1;
    const confidence = getConfidence(durationRatio);
    return { workout: candidates[0], confidence };
  }

  // Multiple candidates: pick closest by duration
  let bestCandidate = candidates[0];
  let bestDiff = Math.abs(activityDurationMin - candidates[0].planned_duration_minutes);

  for (let i = 1; i < candidates.length; i++) {
    const diff = Math.abs(activityDurationMin - candidates[i].planned_duration_minutes);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCandidate = candidates[i];
    }
  }

  const durationRatio =
    bestCandidate.planned_duration_minutes > 0
      ? activityDurationMin / bestCandidate.planned_duration_minutes
      : 1;

  return { workout: bestCandidate, confidence: getConfidence(durationRatio) };
}

function getConfidence(durationRatio: number): MatchConfidence {
  if (durationRatio >= 0.8 && durationRatio <= 1.2) return 'exact';
  if (durationRatio >= 0.5 && durationRatio <= 1.5) return 'probable';
  return 'weak';
}

// ====================================================================
// Compliance Computation
// ====================================================================

/**
 * Compute a ratio as a percentage. Returns null if planned is null/zero.
 */
function computeRatio(actual: number, planned: number | null): number | null {
  if (planned == null || planned === 0) return null;
  return (actual / planned) * 100;
}

/**
 * Map a ratio to a compliance color.
 *
 * Thresholds: green 80–120%, amber 50–79% or 121–150%, red <50% or >150%.
 */
function ratioToColor(ratio: number): ComplianceColor {
  if (ratio >= 80 && ratio <= 120) return 'green';
  if (ratio >= 50 && ratio <= 150) return 'amber';
  return 'red';
}

/**
 * Compute compliance from planned vs actual metrics.
 *
 * Priority: TSS > Duration > Distance.
 * The primary metric determines the score; secondary metrics are informational.
 */
export function computeCompliance(
  planned: {
    readonly duration_minutes: number;
    readonly tss?: number | null;
    readonly distance_meters?: number | null;
  },
  actual: {
    readonly duration_minutes: number;
    readonly tss?: number | null;
    readonly distance_meters?: number | null;
  }
): ComplianceResult {
  // Only compute ratio when both planned and actual values are present,
  // so a missing actual metric falls through to the next priority level.
  const tssMatch =
    actual.tss != null && planned.tss != null ? computeRatio(actual.tss, planned.tss) : null;
  const durationMatch = computeRatio(actual.duration_minutes, planned.duration_minutes);
  const distanceMatch =
    actual.distance_meters != null && planned.distance_meters != null
      ? computeRatio(actual.distance_meters, planned.distance_meters)
      : null;

  // Priority: TSS > Duration > Distance
  const primaryRatio = tssMatch ?? durationMatch ?? distanceMatch;
  const score = primaryRatio == null ? 0 : Math.round(primaryRatio);
  const color = primaryRatio == null ? 'red' : ratioToColor(primaryRatio);

  let completionStatus: ComplianceResult['completionStatus'] = 'partial';
  if (actual.duration_minutes === 0) {
    completionStatus = 'skipped';
  } else if (score >= 50) {
    completionStatus = 'completed';
  }

  return {
    score,
    color,
    durationMatch: durationMatch == null ? null : Math.round(durationMatch),
    tssMatch: tssMatch == null ? null : Math.round(tssMatch),
    distanceMatch: distanceMatch == null ? null : Math.round(distanceMatch),
    completionStatus,
  };
}

// ====================================================================
// Event Diff Detection
// ====================================================================

/**
 * Compare a remote Intervals.icu event against the local workout state.
 * Returns which fields have changed (used for last-write-wins logic).
 */
export function diffEventVsWorkout(remote: RemoteEventState, local: LocalEventState): DiffResult {
  const fields: string[] = [];

  if (remote.name !== local.name) {
    fields.push('name');
  }

  if ((remote.description ?? '') !== local.description_dsl) {
    fields.push('description');
  }

  const remoteDurationMin = remote.moving_time == null ? null : Math.round(remote.moving_time / 60);
  if (remoteDurationMin != null && remoteDurationMin !== local.planned_duration_minutes) {
    fields.push('duration');
  }

  const remoteDate = extractDate(remote.start_date_local);
  if (remoteDate !== local.date) {
    fields.push('date');
  }

  return { changed: fields.length > 0, fields };
}
