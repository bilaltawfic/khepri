// =============================================================================
// Compliance Computation
//
// Compares planned vs actual training metrics (TSS > Duration > Distance)
// and produces green/amber/red compliance scores at workout, weekly, and block
// level — inspired by TrainingPeaks' colour-coded system, but with aggregated
// weekly and block scores that TrainingPeaks does not provide.
// =============================================================================

export interface WorkoutComplianceResult {
  readonly score: 'green' | 'amber' | 'red' | 'missed' | 'unplanned';
  readonly metric_used: 'tss' | 'duration';
  readonly planned_value: number;
  readonly actual_value: number;
  readonly ratio: number;
  readonly direction: 'under' | 'over' | 'on_target';
}

export interface WeeklyCompliance {
  readonly planned_sessions: number;
  readonly completed_sessions: number;
  readonly missed_sessions: number;
  readonly unplanned_sessions: number;
  readonly green_count: number;
  readonly amber_count: number;
  readonly red_count: number;
  readonly compliance_score: number;
  readonly compliance_color: 'green' | 'amber' | 'red';
  readonly planned_hours: number;
  readonly actual_hours: number;
  readonly planned_tss: number;
  readonly actual_tss: number;
}

export interface BlockCompliance {
  readonly total_weeks: number;
  readonly weeks_completed: number;
  readonly overall_score: number;
  readonly overall_color: 'green' | 'amber' | 'red';
  readonly trend: 'improving' | 'declining' | 'stable';
}

// =============================================================================
// Per-workout compliance (P9-G-01)
// =============================================================================

/**
 * Compute compliance for a single workout by comparing planned vs actual
 * metrics. Metric priority: TSS > Duration > Distance.
 *
 * This function expects both `planned` and `actual` workout objects and is used
 * only when an activity has been matched to a planned workout.
 * Missed workouts (no matched activity) are handled outside this function at the
 * weekly aggregation layer via `computeWeeklyCompliance`.
 * When planned duration is 0, the activity is considered unplanned.
 */
export function computeWorkoutCompliance(
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
): WorkoutComplianceResult {
  // Rest day / no planned workout — any activity is unplanned
  if (planned.duration_minutes === 0) {
    return {
      score: 'unplanned',
      metric_used: 'duration',
      planned_value: 0,
      actual_value: actual.duration_minutes,
      ratio: 0,
      direction: 'on_target',
    };
  }

  // Select metric: TSS first (when both non-null and planned > 0), then duration.
  // Distance is omitted: duration_minutes is always present in the data model and is
  // always non-zero here (the rest-day guard above catches duration === 0), so
  // falling back to distance is never needed.
  let metric_used: 'tss' | 'duration';
  let planned_value: number;
  let actual_value: number;

  if (planned.tss != null && planned.tss > 0 && actual.tss != null) {
    metric_used = 'tss';
    planned_value = planned.tss;
    actual_value = actual.tss;
  } else {
    // Duration: always available and > 0 (rest-day guard above ensures this).
    // Falls back to duration when TSS is absent or when planned TSS is 0.
    metric_used = 'duration';
    planned_value = planned.duration_minutes;
    actual_value = actual.duration_minutes;
  }
  // No division-by-zero guard needed:
  // - TSS path: planned.tss > 0 guaranteed by the condition above.
  // - Duration path: planned.duration_minutes > 0 guaranteed by the rest-day guard.

  const ratio = actual_value / planned_value;

  let score: WorkoutComplianceResult['score'];
  let direction: WorkoutComplianceResult['direction'];

  if (ratio >= 0.8 && ratio <= 1.2) {
    score = 'green';
    direction = 'on_target';
  } else if (ratio >= 0.5 && ratio < 0.8) {
    score = 'amber';
    direction = 'under';
  } else if (ratio > 1.2 && ratio <= 1.5) {
    score = 'amber';
    direction = 'over';
  } else if (ratio < 0.5) {
    score = 'red';
    direction = 'under';
  } else {
    // ratio > 1.5
    score = 'red';
    direction = 'over';
  }

  return { score, metric_used, planned_value, actual_value, ratio, direction };
}

// =============================================================================
// Weekly compliance (P9-G-02)
// =============================================================================

/** Map a workout compliance score to its weight in the weekly calculation. */
function scoreWeight(score: WorkoutComplianceResult['score']): number {
  if (score === 'green') return 1;
  if (score === 'amber') return 0.5;
  return 0;
}

/** Classify a single workout entry for session counting purposes. */
function classifySession(
  compliance: WorkoutComplianceResult | null,
  plannedDurationMinutes: number
): 'unplanned' | 'rest' | 'missed' | 'green' | 'amber' | 'red' {
  if (compliance?.score === 'unplanned') return 'unplanned';
  if (plannedDurationMinutes === 0 && compliance == null) return 'rest';
  if (compliance == null) return 'missed';
  return compliance.score;
}

/**
 * Score weights per workout:
 *   green = 1, amber = 0.5, red = 0, missed = 0
 *
 * Rest days (planned_duration_minutes === 0, no compliance result) are
 * excluded from planned_sessions.
 */
export function computeWeeklyCompliance(
  workouts: ReadonlyArray<{
    readonly compliance: WorkoutComplianceResult | null;
    readonly planned_duration_minutes: number;
    readonly actual_duration_minutes?: number | null;
    readonly planned_tss?: number | null;
    readonly actual_tss?: number | null;
  }>
): WeeklyCompliance {
  let planned_sessions = 0;
  let completed_sessions = 0;
  let missed_sessions = 0;
  let unplanned_sessions = 0;
  let green_count = 0;
  let amber_count = 0;
  let red_count = 0;
  let weight_sum = 0;
  let planned_hours = 0;
  let actual_hours = 0;
  let planned_tss = 0;
  let actual_tss = 0;

  for (const w of workouts) {
    // Accumulate volume totals for all entries (including rest days and unplanned)
    planned_hours += w.planned_duration_minutes / 60;
    actual_hours += (w.actual_duration_minutes ?? 0) / 60;
    planned_tss += w.planned_tss ?? 0;
    actual_tss += w.actual_tss ?? 0;

    const kind = classifySession(w.compliance, w.planned_duration_minutes);
    if (kind === 'unplanned') {
      unplanned_sessions += 1;
      continue;
    }
    if (kind === 'rest') continue;

    planned_sessions += 1;
    if (kind === 'missed') {
      missed_sessions += 1;
      continue;
    }

    completed_sessions += 1;
    if (kind === 'green') green_count += 1;
    else if (kind === 'amber') amber_count += 1;
    else if (kind === 'red') red_count += 1;
    weight_sum += scoreWeight(kind);
  }

  const compliance_score = planned_sessions === 0 ? 0 : weight_sum / planned_sessions;

  let compliance_color: WeeklyCompliance['compliance_color'];
  if (compliance_score >= 0.8) {
    compliance_color = 'green';
  } else if (compliance_score >= 0.5) {
    compliance_color = 'amber';
  } else {
    compliance_color = 'red';
  }

  return {
    planned_sessions,
    completed_sessions,
    missed_sessions,
    unplanned_sessions,
    green_count,
    amber_count,
    red_count,
    compliance_score,
    compliance_color,
    planned_hours,
    actual_hours,
    planned_tss,
    actual_tss,
  };
}

// =============================================================================
// Block compliance (P9-G-03)
// =============================================================================

/**
 * Aggregate weekly compliance across a block.
 * Weeks with no planned sessions are excluded from the average.
 * Trend compares the last 3 weeks' scores.
 */
export function computeBlockCompliance(weeks: readonly WeeklyCompliance[]): BlockCompliance {
  const total_weeks = weeks.length;

  // Only include weeks that have at least one planned session
  const scored = weeks.filter((w) => w.planned_sessions > 0);
  const weeks_completed = scored.length;

  const overall_score =
    weeks_completed === 0
      ? 0
      : scored.reduce((sum, w) => sum + w.compliance_score, 0) / weeks_completed;

  let overall_color: BlockCompliance['overall_color'];
  if (overall_score >= 0.8) {
    overall_color = 'green';
  } else if (overall_score >= 0.5) {
    overall_color = 'amber';
  } else {
    overall_color = 'red';
  }

  // Trend: compare last 3 scored weeks
  let trend: BlockCompliance['trend'] = 'stable';
  if (scored.length >= 3) {
    const last3 = scored.slice(-3);
    const first = last3[0]?.compliance_score ?? 0;
    const last = last3[2]?.compliance_score ?? 0;
    const delta = last - first;
    if (delta > 0.1) {
      trend = 'improving';
    } else if (delta < -0.1) {
      trend = 'declining';
    }
  }

  return { total_weeks, weeks_completed, overall_score, overall_color, trend };
}

// =============================================================================
// Color helper (shared with UI layer)
// =============================================================================

/** Map a compliance score string to a hex colour. */
export function complianceColor(
  score: WorkoutComplianceResult['score'] | WeeklyCompliance['compliance_color'] | null,
  colors: {
    readonly success: string;
    readonly warning: string;
    readonly error: string;
    readonly surfaceVariant: string;
  }
): string {
  switch (score) {
    case 'green':
      return colors.success;
    case 'amber':
      return colors.warning;
    case 'red':
    case 'missed':
      return colors.error;
    default:
      return colors.surfaceVariant;
  }
}
