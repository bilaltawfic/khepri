// Core plan construction logic — pure functions, no I/O, fully testable.
//
// Periodization logic is inlined here because Supabase Edge Functions (Deno)
// cannot directly import local monorepo packages. This mirrors the logic in
// packages/core/src/utils/periodization.ts. If that changes, update here too.

import type {
  AthleteData,
  GoalData,
  PeriodizationData,
  PhaseEntry,
  TrainingPlanPayload,
  VolumeEntry,
} from './types.ts';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MIN_WEEKS = 4;
const MAX_WEEKS = 52;
const DEFAULT_WEEKS = 12;

/**
 * Calculate total weeks from start date to a goal target date.
 * Returns null if dates are invalid or target is in the past.
 */
export function weeksUntilGoal(startDate: string, targetDate: string): number | null {
  if (!ISO_DATE_PATTERN.test(startDate) || !ISO_DATE_PATTERN.test(targetDate)) {
    return null;
  }
  const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
  const targetMs = new Date(`${targetDate}T00:00:00Z`).getTime();
  if (targetMs <= startMs) return null;
  const weeks = Math.floor((targetMs - startMs) / MS_PER_WEEK);
  if (weeks < MIN_WEEKS) return MIN_WEEKS;
  if (weeks > MAX_WEEKS) return MAX_WEEKS;
  return weeks;
}

/**
 * Calculate end date from start date + total weeks.
 * End date is the last day of the final week (start + weeks*7 - 1 day).
 */
export function calculateEndDate(startDate: string, totalWeeks: number): string {
  const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
  const endMs = startMs + totalWeeks * MS_PER_WEEK - MS_PER_DAY;
  const [date] = new Date(endMs).toISOString().split('T');
  return date;
}

/**
 * Generate a friendly plan name from context.
 */
export function generatePlanName(
  totalWeeks: number,
  goal: GoalData | null,
  phases: readonly { readonly phase: string }[]
): string {
  if (goal?.race_event_name != null) {
    return `${totalWeeks}-Week Plan: ${goal.race_event_name}`;
  }
  if (goal?.title != null) {
    return `${totalWeeks}-Week Plan: ${goal.title}`;
  }
  const phaseNames = phases.map((p) => capitalize(p.phase)).join(' → ');
  return `${totalWeeks}-Week ${phaseNames}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Resolve total weeks from request + goal context.
 * Priority: explicit total_weeks > derived from goal target_date > default 12.
 */
export function resolveTotalWeeks(
  requestWeeks: number | undefined,
  startDate: string,
  goal: GoalData | null
): number {
  if (requestWeeks != null) {
    return Math.max(MIN_WEEKS, Math.min(MAX_WEEKS, requestWeeks));
  }
  if (goal?.target_date != null) {
    const derived = weeksUntilGoal(startDate, goal.target_date);
    if (derived != null) return derived;
  }
  return DEFAULT_WEEKS;
}

// =============================================================================
// Periodization calculation (mirrors @khepri/core/utils/periodization)
// =============================================================================

/** Phase base volume multipliers. */
const PHASE_BASE_MULTIPLIER: Record<string, number> = {
  base: 0.8,
  build: 1,
  peak: 1.1,
  taper: 0.5,
  recovery: 0.6,
};

/**
 * Calculate phase breakdown for a training plan.
 * Same logic as calculatePhaseBreakdown in @khepri/core.
 */
function calculatePhaseBreakdown(totalWeeks: number): PhaseEntry[] {
  if (totalWeeks < MIN_WEEKS || totalWeeks > MAX_WEEKS) {
    throw new Error(`Total weeks must be between ${MIN_WEEKS} and ${MAX_WEEKS}, got ${totalWeeks}`);
  }

  const phases: PhaseEntry[] = [];

  if (totalWeeks <= 8) {
    const baseWeeks = Math.max(2, Math.floor(totalWeeks * 0.4));
    const taperWeeks = Math.min(2, Math.floor(totalWeeks * 0.2));
    const buildWeeks = totalWeeks - baseWeeks - taperWeeks;

    phases.push(
      {
        phase: 'base',
        weeks: baseWeeks,
        focus: 'aerobic_endurance',
        intensity_distribution: [80, 15, 5],
      },
      {
        phase: 'build',
        weeks: buildWeeks,
        focus: 'threshold_work',
        intensity_distribution: [70, 20, 10],
      }
    );
    if (taperWeeks > 0) {
      phases.push({
        phase: 'taper',
        weeks: taperWeeks,
        focus: 'recovery',
        intensity_distribution: [90, 5, 5],
      });
    }
  } else {
    const baseWeeks = Math.max(3, Math.floor(totalWeeks * 0.35));
    const taperWeeks = Math.min(2, Math.floor(totalWeeks * 0.15));
    const peakWeeks = Math.max(2, Math.floor(totalWeeks * 0.15));
    const buildWeeks = totalWeeks - baseWeeks - peakWeeks - taperWeeks;

    phases.push(
      {
        phase: 'base',
        weeks: baseWeeks,
        focus: 'aerobic_endurance',
        intensity_distribution: [80, 15, 5],
      },
      {
        phase: 'build',
        weeks: buildWeeks,
        focus: 'threshold_work',
        intensity_distribution: [70, 20, 10],
      },
      {
        phase: 'peak',
        weeks: peakWeeks,
        focus: 'race_specific',
        intensity_distribution: [60, 25, 15],
      }
    );
    if (taperWeeks > 0) {
      phases.push({
        phase: 'taper',
        weeks: taperWeeks,
        focus: 'recovery',
        intensity_distribution: [90, 5, 5],
      });
    }
  }

  return phases.filter((p) => p.weeks > 0);
}

/**
 * Calculate weekly volume progression using 3:1 wave pattern.
 * Same logic as calculateWeeklyVolumes in @khepri/core.
 */
function calculateWeeklyVolumes(phases: readonly PhaseEntry[]): VolumeEntry[] {
  const volumes: VolumeEntry[] = [];
  let currentWeek = 1;

  for (const phase of phases) {
    const baseMult = PHASE_BASE_MULTIPLIER[phase.phase] ?? 0.8;

    for (let i = 0; i < phase.weeks; i++) {
      const weekInPhase = i + 1;
      let mult: number;

      if (phase.phase === 'taper') {
        // Taper: progressive reduction
        mult = baseMult * (1 - (i / phase.weeks) * 0.4);
      } else {
        // 3:1 progression: weeks 1-3 increase, week 4 recovery
        const cyclePosition = weekInPhase % 4;
        if (cyclePosition === 1) {
          mult = baseMult * 0.85;
        } else if (cyclePosition === 2) {
          mult = baseMult * 0.95;
        } else if (cyclePosition === 3) {
          mult = baseMult * 1.05;
        } else {
          // Recovery week (position 0 = 4th week)
          mult = baseMult * 0.7;
        }
      }

      volumes.push({
        week: currentWeek + i,
        volume_multiplier: Number(mult.toFixed(2)),
        phase: phase.phase,
      });
    }

    currentWeek += phase.weeks;
  }

  return volumes;
}

/**
 * Generate complete periodization data for a training plan.
 */
export function calculatePeriodization(totalWeeks: number): PeriodizationData {
  const phases = calculatePhaseBreakdown(totalWeeks);
  const weeklyVolumes = calculateWeeklyVolumes(phases);

  return { total_weeks: totalWeeks, phases, weekly_volumes: weeklyVolumes };
}

function buildDescription(goal: GoalData | null, totalWeeks: number): string {
  if (goal == null) {
    return `${totalWeeks}-week general training plan`;
  }
  if (goal.target_date == null) {
    return `Training plan targeting ${goal.title}`;
  }
  return `Training plan targeting ${goal.title} on ${goal.target_date}`;
}

/**
 * Build a complete training plan payload.
 * This is a pure function — all I/O should happen before calling it.
 */
export function buildTrainingPlan(
  athlete: AthleteData,
  goal: GoalData | null,
  startDate: string,
  totalWeeks: number,
  periodization: PeriodizationData
): TrainingPlanPayload {
  return {
    athlete_id: athlete.id,
    name: generatePlanName(totalWeeks, goal, periodization.phases),
    description: buildDescription(goal, totalWeeks),
    start_date: startDate,
    end_date: calculateEndDate(startDate, totalWeeks),
    total_weeks: totalWeeks,
    status: 'active',
    goal_id: goal?.id ?? null,
    periodization,
    weekly_template: null,
    adaptations: [],
  };
}
