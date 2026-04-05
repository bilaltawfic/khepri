/**
 * Adaptation Engine — builds context, decision logic, and prompt helpers
 * for AI-driven daily workout modification suggestions.
 */

import type { WorkoutSnapshot } from '../types/adaptation.js';
import type { BlockPhase } from '../types/season.js';
import type { Workout, WorkoutStructure } from '../types/workout.js';
import { isValidISODate } from './validators.js';

// =============================================================================
// TYPES
// =============================================================================

export const ADAPTATION_TYPES = [
  'no_change',
  'reduce_intensity',
  'reduce_duration',
  'increase_intensity',
  'swap_days',
  'swap_not_viable',
  'add_rest',
  'substitute',
] as const;
export type AdaptationType = (typeof ADAPTATION_TYPES)[number];

export function isAdaptationType(value: unknown): value is AdaptationType {
  return typeof value === 'string' && (ADAPTATION_TYPES as readonly string[]).includes(value);
}

export const ADAPTATION_CONFIDENCES = ['high', 'medium', 'low'] as const;
export type AdaptationConfidence = (typeof ADAPTATION_CONFIDENCES)[number];

export function isAdaptationConfidence(value: unknown): value is AdaptationConfidence {
  return typeof value === 'string' && (ADAPTATION_CONFIDENCES as readonly string[]).includes(value);
}

export interface CheckInData {
  readonly sleepQuality: number; // 1-10
  readonly sleepHours: number;
  readonly energy: number; // 1-10
  readonly stress: number; // 1-10
  readonly soreness: number; // 1-10
  readonly availableTimeMinutes?: number | null;
}

export interface WellnessData {
  readonly ctl: number;
  readonly atl: number;
  readonly tsb: number;
  readonly hrv?: number | null;
  readonly restingHr?: number | null;
}

export interface AdaptationWeekSummary {
  readonly plannedMinutes: number;
  readonly completedMinutes: number;
  readonly completionRate: number; // 0-1
}

export interface AdaptationContext {
  readonly plannedWorkout: Workout;
  readonly checkIn: CheckInData;
  readonly wellness?: WellnessData | null;
  readonly weekWorkouts: readonly Workout[];
  readonly weekCompliance: AdaptationWeekSummary;
  readonly blockPhase: BlockPhase;
}

export interface AdaptationSuggestion {
  readonly type: AdaptationType;
  readonly reason: string;
  readonly originalWorkout: WorkoutSnapshot;
  readonly modifiedWorkout: WorkoutSnapshot | null;
  readonly swapTargetDate?: string | null;
  readonly confidence: AdaptationConfidence;
}

// =============================================================================
// DECISION LOGIC
// =============================================================================

/**
 * Rule-based pre-screening: returns recommended adaptation types based on
 * check-in metrics and wellness data before AI is invoked.
 * This helps bias the AI prompt toward the right decision.
 *
 * @param plannedDurationMinutes - Optional: the planned workout duration. When
 *   provided, reduce_duration is only suggested if available time is shorter.
 */
export function screenAdaptation(
  checkIn: CheckInData,
  wellness: WellnessData | null | undefined,
  blockPhase: BlockPhase,
  plannedDurationMinutes?: number
): AdaptationType[] {
  const suggestions: AdaptationType[] = [];

  // Sleep deprivation: reduce or swap
  if (checkIn.sleepHours < 6 || checkIn.sleepQuality < 4) {
    suggestions.push('reduce_intensity', 'swap_days');
  }

  // High fatigue load
  if (wellness != null && wellness.tsb < -20) {
    suggestions.push('reduce_intensity');
  }

  // Very fresh — consider increasing intensity (never in taper)
  if (
    wellness != null &&
    wellness.tsb > 10 &&
    blockPhase.focus !== 'taper' &&
    blockPhase.focus !== 'recovery'
  ) {
    suggestions.push('increase_intensity');
  }

  // Low energy
  if (checkIn.energy < 4) {
    suggestions.push('add_rest', 'reduce_intensity');
  }

  // High soreness
  if (checkIn.soreness > 7) {
    suggestions.push('substitute', 'add_rest');
  }

  // Time constraint: only flag reduce_duration when available time is shorter than planned
  if (checkIn.availableTimeMinutes != null && checkIn.availableTimeMinutes > 0) {
    const isTimeConstrained =
      plannedDurationMinutes == null || checkIn.availableTimeMinutes < plannedDurationMinutes;
    if (isTimeConstrained) {
      suggestions.push('reduce_duration');
    }
  }

  // No flags → keep workout
  if (suggestions.length === 0) {
    suggestions.push('no_change');
  }

  return [...new Set(suggestions)];
}

// =============================================================================
// SNAPSHOT HELPERS
// =============================================================================

/** Build a before-snapshot from a workout row. */
export function snapshotWorkout(workout: Workout): WorkoutSnapshot {
  return {
    workoutId: workout.id,
    before: {
      name: workout.name,
      sport: workout.sport,
      workoutType: workout.workoutType,
      plannedDurationMinutes: workout.plannedDurationMinutes,
      plannedTss: workout.plannedTss,
      structure: workout.structure,
      descriptionDsl: workout.descriptionDsl,
      intervalsTarget: workout.intervalsTarget,
    },
    after: {},
    changeType: 'modified',
  };
}

/** Build after-snapshot fields from modified workout content. */
export function buildAfterSnapshot(
  workoutId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  changeType: WorkoutSnapshot['changeType']
): WorkoutSnapshot {
  return { workoutId, before, after, changeType };
}

// =============================================================================
// SWAP LOGIC HELPERS
// =============================================================================

/** Content fields swapped between two workouts during a day-swap. */
export interface SwappableContent {
  readonly name: string;
  readonly sport: Workout['sport'];
  readonly workoutType: Workout['workoutType'];
  readonly plannedDurationMinutes: number;
  readonly plannedTss: number | null;
  readonly structure: WorkoutStructure;
  readonly descriptionDsl: string;
  readonly intervalsTarget: Workout['intervalsTarget'];
}

/** Extract swappable content fields from a workout. */
export function extractSwappableContent(workout: Workout): SwappableContent {
  return {
    name: workout.name,
    sport: workout.sport,
    workoutType: workout.workoutType,
    plannedDurationMinutes: workout.plannedDurationMinutes,
    plannedTss: workout.plannedTss,
    structure: workout.structure,
    descriptionDsl: workout.descriptionDsl,
    intervalsTarget: workout.intervalsTarget,
  };
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Build the AI system prompt for adaptation suggestion.
 * The AI must return a JSON object matching AdaptationSuggestion.
 */
export function buildAdaptationPrompt(ctx: AdaptationContext): string {
  const screened = screenAdaptation(
    ctx.checkIn,
    ctx.wellness,
    ctx.blockPhase,
    ctx.plannedWorkout.plannedDurationMinutes
  );
  const plannedDuration = ctx.plannedWorkout.plannedDurationMinutes;
  const availTime = ctx.checkIn.availableTimeMinutes ?? null;
  const timeConstraint =
    availTime != null && availTime > 0 && availTime < plannedDuration
      ? `Available time (${availTime} min) is less than planned duration (${plannedDuration} min).`
      : null;

  let wellnessSummary = 'No wellness data available.';
  if (ctx.wellness != null) {
    const hrvPart = ctx.wellness.hrv == null ? '' : `, HRV: ${ctx.wellness.hrv}`;
    wellnessSummary = `CTL: ${ctx.wellness.ctl}, ATL: ${ctx.wellness.atl}, TSB: ${ctx.wellness.tsb}${hrvPart}`;
  }

  const weekSummary = `Week compliance: ${Math.round(ctx.weekCompliance.completionRate * 100)}% (${ctx.weekCompliance.completedMinutes}/${ctx.weekCompliance.plannedMinutes} min completed).`;
  const tssLine =
    ctx.plannedWorkout.plannedTss == null ? '' : `Planned TSS: ${ctx.plannedWorkout.plannedTss}`;
  const timeConstraintLine = timeConstraint ?? '';

  let scheduleSummary = 'No nearby workout data available.';
  if (ctx.weekWorkouts.length > 0) {
    const lines = ctx.weekWorkouts.map(
      (w) =>
        `- ${w.date}: ${w.name} (${w.sport}, ${w.workoutType ?? 'general'}, ${w.plannedDurationMinutes} min)`
    );
    scheduleSummary = lines.join('\n');
  }

  return `You are an AI triathlon coach. Evaluate the athlete's check-in data and suggest a daily workout modification.

## Today's Planned Workout
Date: ${ctx.plannedWorkout.date}
Name: ${ctx.plannedWorkout.name}
Sport: ${ctx.plannedWorkout.sport}
Type: ${ctx.plannedWorkout.workoutType ?? 'general'}
Planned Duration: ${plannedDuration} min
${tssLine}

## Nearby Schedule (±7 days)
${scheduleSummary}

## Check-in Data
Sleep Quality: ${ctx.checkIn.sleepQuality}/10
Sleep Hours: ${ctx.checkIn.sleepHours}h
Energy: ${ctx.checkIn.energy}/10
Stress: ${ctx.checkIn.stress}/10
Overall Soreness: ${ctx.checkIn.soreness}/10
${timeConstraintLine}

## Wellness / Fitness Metrics
${wellnessSummary}

## Week Context
Phase: ${ctx.blockPhase.focus} (${ctx.blockPhase.name})
${weekSummary}

## Decision Guidelines
- Sleep < 6h or quality < 4 → suggest reduce_intensity or swap_days
- TSB < -20 → suggest reduce_intensity
- TSB > 10 (non-taper) → consider increase_intensity
- Energy < 4 → suggest add_rest or reduce_intensity
- Soreness > 7 → suggest substitute or add_rest
- Available time < planned duration → suggest reduce_duration
- Taper/recovery phase → NEVER suggest increase_intensity

### Swap Rules (CRITICAL)
- Before suggesting swap_days, check the nearby schedule for conflicts
- NEVER swap to a day adjacent to (or on the same day as) a workout of similar or higher intensity
- Example: do NOT swap a hard run to Friday if there is a long run on Saturday or Sunday
- If a swap is the right call but no suitable day exists without creating back-to-back hard sessions, use "swap_not_viable" instead
- swap_not_viable tells the athlete that a swap would help but the schedule doesn't allow it — they must decide how to proceed
- Pre-screened signals: ${screened.join(', ')}

## Response Format
Return ONLY a JSON object with this exact shape (no markdown, no extra text):
{
  "type": "<one of: ${ADAPTATION_TYPES.join(' | ')}>",
  "reason": "<1-2 sentence human-readable explanation for the athlete>",
  "originalWorkout": {
    "workoutId": "${ctx.plannedWorkout.id}",
    "before": { "name": "...", "sport": "...", "plannedDurationMinutes": ..., "workoutType": "..." },
    "after": {},
    "changeType": "modified"
  },
  "modifiedWorkout": null,
  "swapTargetDate": null,
  "confidence": "<high | medium | low>"
}

If type is NOT "no_change", populate modifiedWorkout.after with the changed fields.
If type is "swap_days", also set swapTargetDate to the ISO date of the suggested swap day.
Keep modifiedWorkout null when type is "no_change".`;
}

// =============================================================================
// RESPONSE PARSER
// =============================================================================

function stripCodeFences(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    const nl = cleaned.indexOf('\n');
    cleaned = nl === -1 ? cleaned.slice(3) : cleaned.slice(nl + 1);
  }
  if (cleaned.endsWith('```')) {
    const nl = cleaned.lastIndexOf('\n');
    cleaned = nl === -1 ? cleaned : cleaned.slice(0, nl);
  }
  return cleaned.trim();
}

function isWorkoutSnapshotShape(value: unknown): value is WorkoutSnapshot {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.workoutId === 'string' &&
    typeof obj.before === 'object' &&
    obj.before !== null &&
    typeof obj.after === 'object' &&
    obj.after !== null &&
    typeof obj.changeType === 'string'
  );
}

function validateTypeInvariants(
  type: AdaptationType,
  modifiedWorkout: WorkoutSnapshot | null,
  swapTargetDate: string | null
): boolean {
  if (type === 'swap_days' && swapTargetDate == null) return false;
  if ((type === 'no_change' || type === 'swap_not_viable') && modifiedWorkout != null) return false;
  const needsModified = type !== 'no_change' && type !== 'swap_days' && type !== 'swap_not_viable';
  if (needsModified && modifiedWorkout == null) return false;
  return true;
}

/**
 * Parse and validate an AI response string into an AdaptationSuggestion.
 * Returns null if the response is not valid JSON or fails validation.
 */
export function parseAdaptationResponse(raw: string): AdaptationSuggestion | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  if (!isAdaptationType(obj.type)) return null;
  if (typeof obj.reason !== 'string' || obj.reason.trim() === '') return null;
  if (!isAdaptationConfidence(obj.confidence)) return null;
  if (!isWorkoutSnapshotShape(obj.originalWorkout)) return null;

  let modifiedWorkout: WorkoutSnapshot | null = null;
  if (obj.modifiedWorkout != null) {
    if (!isWorkoutSnapshotShape(obj.modifiedWorkout)) return null;
    modifiedWorkout = obj.modifiedWorkout;
  }

  const swapTargetDate = isValidISODate(obj.swapTargetDate) ? obj.swapTargetDate : null;
  if (!validateTypeInvariants(obj.type, modifiedWorkout, swapTargetDate)) return null;

  return {
    type: obj.type,
    reason: obj.reason,
    originalWorkout: obj.originalWorkout,
    modifiedWorkout,
    swapTargetDate,
    confidence: obj.confidence,
  };
}
