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
  } = input;
  const targetMinutes = targetHours * 60;

  const activeSports = sportPriority.filter((s) => s !== 'rest' && s !== 'strength');
  if (activeSports.length === 0) {
    return { sessions: [], totalMinutes: 0, restDays: [...availableDays] };
  }

  const avgMinutes =
    activeSports.reduce((sum, s) => sum + (AVG_SESSION_MINUTES[s] ?? 50), 0) / activeSports.length;
  const sessionCount = Math.min(
    Math.round(targetMinutes / avgMinutes),
    Math.max(availableDays.length - 1, 1)
  );
  const avgDuration = Math.round(targetMinutes / sessionCount);

  const sportQueue = buildSportQueue(activeSports, sessionCount);
  const constraintMap = new Map<DayOfWeek, DayConstraint>(dayConstraints.map((c) => [c.day, c]));

  const sessions: PlannedSession[] = [];
  const usedDays = new Set<DayOfWeek>();

  placeConstrainedDays(
    availableDays,
    constraintMap,
    sportQueue,
    sessions,
    usedDays,
    phase,
    avgDuration,
    athleteZones,
    generationTier
  );
  fillRemainingDays(
    availableDays,
    constraintMap,
    sportQueue,
    sessions,
    usedDays,
    phase,
    avgDuration,
    athleteZones,
    generationTier
  );

  sessions.sort((a, b) => a.day - b.day);
  const restDays = availableDays.filter((d) => !usedDays.has(d));
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return { sessions, totalMinutes, restDays };
}

/**
 * Build a sport queue from priority-weighted allocation.
 */
function buildSportQueue(activeSports: readonly Sport[], sessionCount: number): Sport[] {
  const allocation = allocateSports(activeSports, sessionCount);
  const queue: Sport[] = [];
  for (const [sport, count] of allocation) {
    for (let i = 0; i < count; i++) {
      queue.push(sport);
    }
  }
  return queue;
}

/**
 * Place sessions on days that have sport-specific constraints.
 */
function placeConstrainedDays(
  availableDays: readonly DayOfWeek[],
  constraintMap: Map<DayOfWeek, DayConstraint>,
  sportQueue: Sport[],
  sessions: PlannedSession[],
  usedDays: Set<DayOfWeek>,
  phase: PeriodizationPhase,
  avgDuration: number,
  zones: AthleteZones,
  tier: 'template' | 'claude'
): void {
  for (const day of availableDays) {
    const constraint = constraintMap.get(day);
    if (!constraint?.sport) continue;
    const idx = sportQueue.indexOf(constraint.sport);
    if (idx < 0) continue;

    sportQueue.splice(idx, 1);
    usedDays.add(day);
    sessions.push(
      buildSession({
        day,
        sport: constraint.sport,
        phase,
        constraint,
        avgDurationMinutes: avgDuration,
        zones,
        tier,
      })
    );
  }
}

/**
 * Fill remaining days from sport queue with hard/easy alternation.
 */
function fillRemainingDays(
  availableDays: readonly DayOfWeek[],
  constraintMap: Map<DayOfWeek, DayConstraint>,
  sportQueue: Sport[],
  sessions: PlannedSession[],
  usedDays: Set<DayOfWeek>,
  phase: PeriodizationPhase,
  avgDuration: number,
  zones: AthleteZones,
  tier: 'template' | 'claude'
): void {
  let lastWasHard = sessions.at(-1)?.isHard ?? false;
  for (const day of availableDays) {
    if (usedDays.has(day) || sportQueue.length === 0) continue;
    const sport = sportQueue.shift();
    if (sport == null) continue;

    const constraint = constraintMap.get(day) ?? null;
    const forceEasy = lastWasHard;
    const session = buildSession({
      day,
      sport,
      phase,
      constraint,
      avgDurationMinutes: avgDuration,
      zones,
      tier,
      forceEasy,
    });
    sessions.push(session);
    usedDays.add(day);
    lastWasHard = session.isHard;
  }
}

/**
 * Allocate session count across sports by priority.
 */
function allocateSports(sports: readonly Sport[], totalSessions: number): Map<Sport, number> {
  const weights = sports.map((_, i) => 1 / (i + 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const allocation = new Map<Sport, number>();

  let remaining = totalSessions;
  for (let i = 0; i < sports.length; i++) {
    const weight = weights[i] ?? 0;
    const sport = sports[i];
    if (sport == null) continue;
    const count =
      i === sports.length - 1
        ? remaining
        : Math.max(1, Math.round((weight / totalWeight) * totalSessions));
    const actual = Math.min(count, remaining);
    if (actual > 0) {
      allocation.set(sport, actual);
    }
    remaining -= actual;
    if (remaining <= 0) break;
  }

  return allocation;
}

/**
 * Build a single planned session.
 */
function buildSession(opts: BuildSessionOptions): PlannedSession {
  const { day, sport, phase, constraint, avgDurationMinutes, zones, tier, forceEasy } = opts;
  const isHard = forceEasy === true ? false : (constraint?.isHardDay ?? phase !== 'recovery');
  const focus = getSessionFocus(phase, isHard);
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
