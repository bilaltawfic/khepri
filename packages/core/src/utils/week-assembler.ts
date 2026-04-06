/**
 * Week Assembler — allocates workout sessions across a training week.
 *
 * Respects constraints: available days, sport priority, hard/easy alternation,
 * and ensures at least one rest day per week.
 */

import type { AthleteZones, TrainingTemplate } from '../templates/workout-templates.js';
import { renderTemplate, selectTemplate } from '../templates/workout-templates.js';
import type { PeriodizationPhase, TrainingFocus } from '../types/training.js';
import type { IntervalsTarget, Sport, WorkoutStructure } from '../types/workout.js';
import { workoutStructureToDSL } from './dsl-serializer.js';

/**
 * Days of the week (0 = Monday, 6 = Sunday).
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * A constraint on what can happen on a specific day.
 */
export interface DayConstraint {
  readonly day: DayOfWeek;
  readonly sport?: Sport;
  readonly maxDurationMinutes?: number;
  readonly isHardDay?: boolean;
  readonly workoutLabel?: string; // e.g. "Long Ride", "Tempo Run", "Technique Swim"
}

/**
 * Input for week assembly.
 */
export interface WeekAssemblyInput {
  readonly phase: PeriodizationPhase;
  readonly weekNumber: number;
  readonly targetHours: number;
  readonly availableDays: readonly DayOfWeek[];
  readonly sportPriority: readonly Sport[];
  readonly dayConstraints: readonly DayConstraint[];
  readonly athleteZones: AthleteZones;
  readonly generationTier: 'template' | 'claude';
  readonly minSessionsPerSport?: ReadonlyMap<Sport, number>;
}

/**
 * A planned workout session for a day.
 */
export interface PlannedSession {
  readonly day: DayOfWeek;
  readonly sport: Sport;
  readonly durationMinutes: number;
  readonly focus: TrainingFocus;
  readonly isHard: boolean;
  readonly template: TrainingTemplate | null;
  readonly structure: WorkoutStructure | null;
  readonly dsl: string | null;
  readonly intervalsTarget: IntervalsTarget;
}

/**
 * Output of week assembly.
 */
export interface WeekAssemblyResult {
  readonly sessions: readonly PlannedSession[];
  readonly totalMinutes: number;
  readonly restDays: readonly DayOfWeek[];
  readonly warnings?: readonly string[];
}

/**
 * Maps common workout labels (case-insensitive) to TrainingFocus values.
 */
const LABEL_TO_FOCUS: Record<string, TrainingFocus> = {
  'long ride': 'aerobic_endurance',
  'long run': 'aerobic_endurance',
  'long swim': 'aerobic_endurance',
  'tempo run': 'threshold_work',
  'tempo ride': 'threshold_work',
  threshold: 'threshold_work',
  ftp: 'threshold_work',
  'technique swim': 'aerobic_endurance',
  drill: 'aerobic_endurance',
  recovery: 'recovery',
  easy: 'recovery',
  interval: 'vo2max',
  vo2max: 'vo2max',
  sprint: 'race_specific',
  speed: 'race_specific',
};

/** Map a workout label string to a TrainingFocus, or undefined if unknown. */
function labelToFocus(label: string): TrainingFocus | undefined {
  return LABEL_TO_FOCUS[label.toLowerCase()];
}

/** Average session length by sport (minutes) */
const AVG_SESSION_MINUTES: Record<string, number> = {
  swim: 45,
  bike: 75,
  run: 50,
  strength: 40,
};

/** Map phase to primary focus */
function getPhaseFocus(phase: PeriodizationPhase): TrainingFocus {
  switch (phase) {
    case 'base':
      return 'aerobic_endurance';
    case 'build':
      return 'threshold_work';
    case 'peak':
      return 'race_specific';
    case 'taper':
      return 'race_specific';
    case 'recovery':
      return 'recovery';
  }
}

/** Decide focus based on whether this is a hard or easy day */
function getSessionFocus(phase: PeriodizationPhase, isHard: boolean): TrainingFocus {
  if (!isHard) return phase === 'recovery' ? 'recovery' : 'aerobic_endurance';
  return getPhaseFocus(phase);
}

/** Get default intervals target for a sport */
function getDefaultTarget(sport: Sport): IntervalsTarget {
  return sport === 'bike' ? 'POWER' : 'PACE';
}

/** Options for building a single session. */
interface BuildSessionOptions {
  readonly day: DayOfWeek;
  readonly sport: Sport;
  readonly phase: PeriodizationPhase;
  readonly constraint: DayConstraint | null;
  readonly avgDurationMinutes: number;
  readonly zones: AthleteZones;
  readonly tier: 'template' | 'claude';
  readonly forceEasy?: boolean;
}

/**
 * Allocate workouts across a training week.
 */
export function assembleWeek(input: WeekAssemblyInput): WeekAssemblyResult {
  const {
    phase,
    targetHours,
    availableDays,
    sportPriority,
    dayConstraints,
    athleteZones,
    generationTier,
    minSessionsPerSport,
  } = input;
  const targetMinutes = targetHours * 60;

  const activeSports = sportPriority.filter((s) => s !== 'rest' && s !== 'strength');
  if (activeSports.length === 0) {
    return { sessions: [], totalMinutes: 0, restDays: [...availableDays] };
  }

  const avgMinutes =
    activeSports.reduce((sum, s) => sum + (AVG_SESSION_MINUTES[s] ?? 50), 0) / activeSports.length;
  // Reserve at least 1 rest day when possible; with only 1 available day, allow 1 session
  const maxSessions = Math.max(availableDays.length - 1, availableDays.length === 1 ? 1 : 0);
  const sessionCount = Math.min(Math.round(targetMinutes / avgMinutes), maxSessions);
  if (sessionCount === 0) {
    return { sessions: [], totalMinutes: 0, restDays: [...availableDays] };
  }
  const avgDuration = Math.round(targetMinutes / sessionCount);

  const { queue: sportQueue, warnings } = buildSportQueue(
    activeSports,
    sessionCount,
    minSessionsPerSport
  );
  const constraintMap = new Map<DayOfWeek, DayConstraint>(dayConstraints.map((c) => [c.day, c]));

  const sessions: PlannedSession[] = [];
  const usedDays = new Set<DayOfWeek>();

  const placementCtx: PlacementContext = {
    availableDays,
    constraintMap,
    sportQueue,
    sessions,
    usedDays,
    phase,
    avgDuration,
    zones: athleteZones,
    tier: generationTier,
  };
  placeConstrainedDays(placementCtx);
  fillRemainingDays(placementCtx);

  sessions.sort((a, b) => a.day - b.day);
  const restDays = availableDays.filter((d) => !usedDays.has(d));
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return {
    sessions,
    totalMinutes,
    restDays,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

/**
 * Build a sport queue from priority-weighted allocation, respecting minimum session counts.
 */
function buildSportQueue(
  activeSports: readonly Sport[],
  sessionCount: number,
  minSessionsPerSport?: ReadonlyMap<Sport, number>
): { queue: Sport[]; warnings: string[] } {
  const { allocation, warnings } = allocateSports(activeSports, sessionCount, minSessionsPerSport);
  const queue: Sport[] = [];
  for (const [sport, count] of allocation) {
    for (let i = 0; i < count; i++) {
      queue.push(sport);
    }
  }
  return { queue, warnings };
}

/** Shared context for day placement functions. */
interface PlacementContext {
  readonly availableDays: readonly DayOfWeek[];
  readonly constraintMap: Map<DayOfWeek, DayConstraint>;
  readonly sportQueue: Sport[];
  readonly sessions: PlannedSession[];
  readonly usedDays: Set<DayOfWeek>;
  readonly phase: PeriodizationPhase;
  readonly avgDuration: number;
  readonly zones: AthleteZones;
  readonly tier: 'template' | 'claude';
}

/**
 * Place sessions on days that have sport-specific constraints.
 */
function placeConstrainedDays(ctx: PlacementContext): void {
  for (const day of ctx.availableDays) {
    const constraint = ctx.constraintMap.get(day);
    if (!constraint?.sport) continue;
    const idx = ctx.sportQueue.indexOf(constraint.sport);
    if (idx < 0) continue;

    ctx.sportQueue.splice(idx, 1);
    ctx.usedDays.add(day);
    ctx.sessions.push(
      buildSession({
        day,
        sport: constraint.sport,
        phase: ctx.phase,
        constraint,
        avgDurationMinutes: ctx.avgDuration,
        zones: ctx.zones,
        tier: ctx.tier,
      })
    );
  }
}

/**
 * Fill remaining days from sport queue with hard/easy alternation.
 */
function fillRemainingDays(ctx: PlacementContext): void {
  let lastWasHard = ctx.sessions.at(-1)?.isHard ?? false;
  for (const day of ctx.availableDays) {
    if (ctx.usedDays.has(day) || ctx.sportQueue.length === 0) continue;
    const sport = ctx.sportQueue.shift();
    if (sport == null) continue;

    const constraint = ctx.constraintMap.get(day) ?? null;
    const forceEasy = lastWasHard;
    const session = buildSession({
      day,
      sport,
      phase: ctx.phase,
      constraint,
      avgDurationMinutes: ctx.avgDuration,
      zones: ctx.zones,
      tier: ctx.tier,
      forceEasy,
    });
    ctx.sessions.push(session);
    ctx.usedDays.add(day);
    lastWasHard = session.isHard;
  }
}

/**
 * Allocate session count across sports by priority, guaranteeing minimums first.
 */
function allocateSports(
  sports: readonly Sport[],
  totalSessions: number,
  minSessionsPerSport?: ReadonlyMap<Sport, number>
): { allocation: Map<Sport, number>; warnings: string[] } {
  const allocation = new Map<Sport, number>();
  const warnings: string[] = [];
  let remaining = totalSessions;

  // Phase 1: Guarantee minimums
  if (minSessionsPerSport != null) {
    for (const [sport, minCount] of minSessionsPerSport) {
      const alreadyAllocated = allocation.get(sport) ?? 0;
      const needed = Math.max(0, minCount - alreadyAllocated);
      const actual = Math.min(needed, remaining);
      if (actual > 0) {
        allocation.set(sport, alreadyAllocated + actual);
        remaining -= actual;
      }
      if (actual < needed) {
        const total = alreadyAllocated + actual;
        warnings.push(`Could only allocate ${total}/${minCount} sessions for ${sport}`);
      }
    }
  }

  // Phase 2: Distribute remainder by priority weight
  if (remaining > 0) {
    const weights = sports.map((_, i) => 1 / (i + 1));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    for (let i = 0; i < sports.length; i++) {
      if (remaining <= 0) break;
      const weight = weights[i] ?? 0;
      const sport = sports[i];
      if (sport == null) continue;
      const proportional =
        i === sports.length - 1
          ? remaining
          : Math.max(1, Math.round((weight / totalWeight) * totalSessions));
      const extra = Math.min(proportional, remaining);
      if (extra > 0) {
        allocation.set(sport, (allocation.get(sport) ?? 0) + extra);
        remaining -= extra;
      }
    }
  }

  return { allocation, warnings };
}

/**
 * Build a single planned session.
 */
function buildSession(opts: BuildSessionOptions): PlannedSession {
  const { day, sport, phase, constraint, avgDurationMinutes, zones, tier, forceEasy } = opts;
  const isHard = forceEasy === true ? false : (constraint?.isHardDay ?? phase !== 'recovery');
  const labelFocus =
    constraint?.workoutLabel != null ? labelToFocus(constraint.workoutLabel) : undefined;
  const focus = labelFocus ?? getSessionFocus(phase, isHard);
  const duration = constraint?.maxDurationMinutes
    ? Math.min(avgDurationMinutes, constraint.maxDurationMinutes)
    : avgDurationMinutes;
  const intervalsTarget = getDefaultTarget(sport);

  let template: TrainingTemplate | null = null;
  let structure: WorkoutStructure | null = null;
  let dsl: string | null = null;

  if (tier === 'template') {
    template = selectTemplate({ sport, phase, focus, durationMinutes: duration });
    if (template) {
      structure = renderTemplate(template, zones, duration);
      dsl = workoutStructureToDSL(structure, intervalsTarget);
    }
  }

  return {
    day,
    sport,
    durationMinutes: duration,
    focus,
    isHard,
    template,
    structure,
    dsl,
    intervalsTarget,
  };
}
