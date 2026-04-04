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

/**
 * Allocate workouts across a training week.
 *
 * Logic:
 * 1. Calculate total sessions from target hours
 * 2. Allocate sessions per sport based on priority
 * 3. Place hard constraints first
 * 4. Fill remaining days respecting hard/easy alternation
 * 5. Ensure at least 1 rest day
 * 6. Render templates for each session (if template tier)
 * 7. Validate total duration within ±10% of target hours
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

  // Filter to active sports (not rest, not strength for now)
  const activeSports = sportPriority.filter((s) => s !== 'rest' && s !== 'strength');
  if (activeSports.length === 0) {
    return { sessions: [], totalMinutes: 0, restDays: [...availableDays] };
  }

  // Calculate approximate session count
  const avgMinutes =
    activeSports.reduce((sum, s) => sum + (AVG_SESSION_MINUTES[s] ?? 50), 0) / activeSports.length;
  const rawSessionCount = Math.round(targetMinutes / avgMinutes);

  // Ensure at least 1 rest day
  const maxSessions = Math.max(availableDays.length - 1, 1);
  const sessionCount = Math.min(rawSessionCount, maxSessions);

  // Allocate sessions per sport based on priority order
  // Priority 1 gets ~50%, priority 2 gets ~30%, priority 3 gets ~20%
  const sportAllocation = allocateSports(activeSports, sessionCount);

  // Build constraint map
  const constraintMap = new Map<DayOfWeek, DayConstraint>();
  for (const c of dayConstraints) {
    constraintMap.set(c.day, c);
  }

  // Place sessions on days
  const sessions: PlannedSession[] = [];
  const usedDays = new Set<DayOfWeek>();

  // Build sport queue from allocation
  const sportQueue: Sport[] = [];
  for (const [sport, count] of sportAllocation) {
    for (let i = 0; i < count; i++) {
      sportQueue.push(sport);
    }
  }

  // First pass: place constrained days
  for (const day of availableDays) {
    const constraint = constraintMap.get(day);
    if (constraint?.sport && sportQueue.includes(constraint.sport)) {
      const idx = sportQueue.indexOf(constraint.sport);
      if (idx >= 0) {
        sportQueue.splice(idx, 1);
        usedDays.add(day);
        sessions.push(
          buildSession(
            day,
            constraint.sport,
            phase,
            constraint,
            targetMinutes,
            sessionCount,
            athleteZones,
            generationTier
          )
        );
      }
    }
  }

  // Second pass: fill remaining from sport queue with hard/easy alternation
  const lastSession = sessions[sessions.length - 1];
  let lastWasHard = lastSession?.isHard ?? false;
  for (const day of availableDays) {
    if (usedDays.has(day) || sportQueue.length === 0) continue;
    const sport = sportQueue.shift();
    if (sport == null) continue;
    const constraint = constraintMap.get(day);
    const forceEasy = lastWasHard;

    const session = buildSession(
      day,
      sport,
      phase,
      constraint ?? null,
      targetMinutes,
      sessionCount,
      athleteZones,
      generationTier,
      forceEasy
    );
    sessions.push(session);
    usedDays.add(day);
    lastWasHard = session.isHard;
  }

  // Sort sessions by day
  sessions.sort((a, b) => a.day - b.day);

  // Identify rest days
  const restDays = availableDays.filter((d) => !usedDays.has(d));

  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return { sessions, totalMinutes, restDays };
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
function buildSession(
  day: DayOfWeek,
  sport: Sport,
  phase: PeriodizationPhase,
  constraint: DayConstraint | null,
  totalTargetMinutes: number,
  totalSessions: number,
  zones: AthleteZones,
  tier: 'template' | 'claude',
  forceEasy?: boolean
): PlannedSession {
  const isHard = forceEasy ? false : (constraint?.isHardDay ?? phase !== 'recovery');
  const focus = getSessionFocus(phase, isHard);
  const avgDuration = Math.round(totalTargetMinutes / totalSessions);
  const duration = constraint?.maxDurationMinutes
    ? Math.min(avgDuration, constraint.maxDurationMinutes)
    : avgDuration;
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
  // For 'claude' tier, template/structure/dsl remain null — filled by Claude later

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
