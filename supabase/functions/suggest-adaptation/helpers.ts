// Exported helper functions for suggest-adaptation edge function.
// Kept separate so they can be unit-tested without Deno runtime globals.

// =============================================================================
// TYPES
// =============================================================================

export interface CheckInData {
  sleepQuality: number;
  sleepHours: number;
  energy: number;
  stress: number;
  soreness: number;
  availableTimeMinutes?: number | null;
}

export interface WellnessData {
  ctl: number;
  atl: number;
  tsb: number;
  hrv?: number | null;
  restingHr?: number | null;
}

export interface WeeklyCompliance {
  plannedMinutes: number;
  completedMinutes: number;
  completionRate: number;
}

export interface BlockPhase {
  name: string;
  focus: string;
  weeks: number;
  weeklyHours: number;
}

export interface WorkoutRow {
  id: string;
  block_id: string;
  date: string;
  name: string;
  sport: string;
  workout_type: string | null;
  planned_duration_minutes: number;
  planned_tss: number | null;
  external_id: string;
}

export interface SuggestAdaptationRequest {
  athlete_id: string;
  workout_id: string;
  check_in: CheckInData;
  wellness?: WellnessData | null;
  week_workouts?: WorkoutRow[];
  week_compliance?: WeeklyCompliance;
  block_phase: BlockPhase;
}

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

export const CONFIDENCES = ['high', 'medium', 'low'] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export function isConfidence(value: unknown): value is Confidence {
  return typeof value === 'string' && (CONFIDENCES as readonly string[]).includes(value);
}

export interface AdaptationSuggestion {
  type: AdaptationType;
  reason: string;
  workoutId: string;
  originalDurationMinutes: number;
  swapTargetDate: string | null;
  modifiedFields: Record<string, unknown> | null;
  confidence: Confidence;
}

// =============================================================================
// VALIDATION
// =============================================================================

function isFiniteInRange(v: unknown, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function validateCheckIn(ci: Record<string, unknown>): string | null {
  if (
    !Number.isFinite(ci.sleepQuality) ||
    !Number.isFinite(ci.sleepHours) ||
    !Number.isFinite(ci.energy) ||
    !Number.isFinite(ci.stress) ||
    !Number.isFinite(ci.soreness)
  ) {
    return 'check_in must include sleepQuality, sleepHours, energy, stress, soreness';
  }
  if (
    !isFiniteInRange(ci.sleepQuality, 1, 10) ||
    !isFiniteInRange(ci.energy, 1, 10) ||
    !isFiniteInRange(ci.stress, 1, 10) ||
    !isFiniteInRange(ci.soreness, 1, 10) ||
    !isFiniteInRange(ci.sleepHours, 0, 24)
  ) {
    return 'check_in values are out of expected range';
  }
  if (ci.availableTimeMinutes != null && !Number.isFinite(ci.availableTimeMinutes)) {
    return 'check_in.availableTimeMinutes must be a finite number when provided';
  }
  return null;
}

function validateWellness(wellness: unknown): string | null {
  if (wellness == null) return null;
  if (typeof wellness !== 'object' || Array.isArray(wellness)) {
    return 'wellness must be an object when provided';
  }
  const w = wellness as Record<string, unknown>;
  if (!Number.isFinite(w.ctl) || !Number.isFinite(w.atl) || !Number.isFinite(w.tsb)) {
    return 'wellness must include finite ctl, atl, tsb';
  }
  if (w.hrv != null && !Number.isFinite(w.hrv)) {
    return 'wellness.hrv must be a finite number when provided';
  }
  if (w.restingHr != null && !Number.isFinite(w.restingHr)) {
    return 'wellness.restingHr must be a finite number when provided';
  }
  return null;
}

export function validateRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }
  const obj = body as Record<string, unknown>;

  if (typeof obj.athlete_id !== 'string' || obj.athlete_id.trim() === '') {
    return 'athlete_id is required';
  }
  if (typeof obj.workout_id !== 'string' || obj.workout_id.trim() === '') {
    return 'workout_id is required';
  }
  if (typeof obj.check_in !== 'object' || obj.check_in === null) {
    return 'check_in data is required';
  }
  if (
    typeof obj.block_phase !== 'object' ||
    obj.block_phase === null ||
    Array.isArray(obj.block_phase)
  ) {
    return 'block_phase is required';
  }
  const bp = obj.block_phase as Record<string, unknown>;
  if (typeof bp.focus !== 'string' || bp.focus.trim() === '') {
    return 'block_phase.focus is required';
  }
  if (typeof bp.name !== 'string' || bp.name.trim() === '') {
    return 'block_phase.name is required';
  }

  const checkInError = validateCheckIn(obj.check_in as Record<string, unknown>);
  if (checkInError != null) return checkInError;

  const wellnessError = validateWellness(obj.wellness);
  if (wellnessError != null) return wellnessError;

  return null;
}

// =============================================================================
// SCREENING LOGIC
// =============================================================================

export function screenAdaptation(
  checkIn: CheckInData,
  wellness: WellnessData | null | undefined,
  blockPhase: BlockPhase,
  plannedDurationMinutes?: number
): AdaptationType[] {
  const suggestions: AdaptationType[] = [];

  if (checkIn.sleepHours < 6 || checkIn.sleepQuality < 4) {
    suggestions.push('reduce_intensity', 'swap_days');
  }
  if (wellness != null && wellness.tsb < -20) {
    suggestions.push('reduce_intensity');
  }
  if (
    wellness != null &&
    wellness.tsb > 10 &&
    blockPhase.focus !== 'taper' &&
    blockPhase.focus !== 'recovery'
  ) {
    suggestions.push('increase_intensity');
  }
  if (checkIn.energy < 4) {
    suggestions.push('add_rest', 'reduce_intensity');
  }
  if (checkIn.soreness > 7) {
    suggestions.push('substitute', 'add_rest');
  }
  if (checkIn.availableTimeMinutes != null && checkIn.availableTimeMinutes > 0) {
    const isTimeConstrained =
      plannedDurationMinutes == null || checkIn.availableTimeMinutes < plannedDurationMinutes;
    if (isTimeConstrained) {
      suggestions.push('reduce_duration');
    }
  }
  if (suggestions.length === 0) {
    suggestions.push('no_change');
  }
  return [...new Set(suggestions)];
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

export function buildPrompt(workout: WorkoutRow, req: SuggestAdaptationRequest): string {
  const plannedDuration = workout.planned_duration_minutes;
  const screened = screenAdaptation(req.check_in, req.wellness, req.block_phase, plannedDuration);
  const availTime = req.check_in.availableTimeMinutes ?? null;
  const timeConstraint =
    availTime != null && availTime > 0 && availTime < plannedDuration
      ? `Available time (${availTime} min) is less than planned duration (${plannedDuration} min).`
      : null;

  let wellnessSummary = 'No wellness data available.';
  if (req.wellness != null) {
    const hrvPart = req.wellness.hrv == null ? '' : `, HRV: ${req.wellness.hrv}`;
    wellnessSummary = `CTL: ${req.wellness.ctl}, ATL: ${req.wellness.atl}, TSB: ${req.wellness.tsb}${hrvPart}`;
  }

  const compliance = req.week_compliance;
  const weekSummary =
    compliance == null
      ? 'No weekly compliance data available.'
      : `Week compliance: ${Math.round(compliance.completionRate * 100)}% (${compliance.completedMinutes}/${compliance.plannedMinutes} min completed).`;

  const tssLine = workout.planned_tss == null ? '' : `Planned TSS: ${workout.planned_tss}`;
  const timeConstraintLine = timeConstraint ?? '';

  const nearbyWorkouts = req.week_workouts ?? [];
  let scheduleSummary = 'No nearby workout data available.';
  if (nearbyWorkouts.length > 0) {
    const lines = nearbyWorkouts.map(
      (w) =>
        `- ${w.date}: ${w.name} (${w.sport}, ${w.workout_type ?? 'general'}, ${w.planned_duration_minutes} min)`
    );
    scheduleSummary = lines.join('\n');
  }

  return `You are an AI triathlon coach evaluating whether to modify today's planned workout.

## Today's Planned Workout
Date: ${workout.date}
Name: ${workout.name}
Sport: ${workout.sport}
Type: ${workout.workout_type ?? 'general'}
Planned Duration: ${plannedDuration} min
${tssLine}

## Nearby Schedule (±7 days)
${scheduleSummary}

## Check-in Data
Sleep Quality: ${req.check_in.sleepQuality}/10
Sleep Hours: ${req.check_in.sleepHours}h
Energy: ${req.check_in.energy}/10
Stress: ${req.check_in.stress}/10
Overall Soreness: ${req.check_in.soreness}/10
${timeConstraintLine}

## Wellness / Fitness Metrics
${wellnessSummary}

## Week Context
Phase: ${req.block_phase.focus} (${req.block_phase.name})
${weekSummary}

## Decision Guidelines
- Sleep < 6h or quality < 4 → suggest reduce_intensity or swap_days
- TSB < -20 → suggest reduce_intensity
- TSB > 10 (non-taper/recovery phase) → consider increase_intensity
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
Return ONLY valid JSON (no markdown, no extra text):
{
  "type": "<no_change | reduce_intensity | reduce_duration | increase_intensity | swap_days | swap_not_viable | add_rest | substitute>",
  "reason": "<1-2 sentence human-readable explanation>",
  "workoutId": "${workout.id}",
  "originalDurationMinutes": ${plannedDuration},
  "swapTargetDate": null,
  "modifiedFields": null,
  "confidence": "<high | medium | low>"
}

If type is NOT "no_change", populate modifiedFields with changed values (e.g. {"plannedDurationMinutes": 30, "workoutType": "recovery"}).
If type is "swap_days", also set swapTargetDate to an ISO date string (e.g. "2025-04-07").`;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isISODateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

export function parseResponse(raw: string): AdaptationSuggestion | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) return null;

  const obj = parsed;
  if (!isAdaptationType(obj.type)) return null;
  if (typeof obj.reason !== 'string' || obj.reason.trim() === '') return null;
  if (typeof obj.workoutId !== 'string') return null;
  if (typeof obj.originalDurationMinutes !== 'number') return null;
  if (!isConfidence(obj.confidence)) return null;

  const swapTargetDate = isISODateOnly(obj.swapTargetDate) ? obj.swapTargetDate : null;
  const modifiedFields = isPlainObject(obj.modifiedFields) ? obj.modifiedFields : null;

  // swap_days must have a valid swapTargetDate
  if (obj.type === 'swap_days' && swapTargetDate == null) return null;
  // Types that modify the workout must have non-empty modifiedFields
  const noFieldsRequired =
    obj.type === 'no_change' || obj.type === 'swap_days' || obj.type === 'swap_not_viable';
  if (!noFieldsRequired && (modifiedFields == null || Object.keys(modifiedFields).length === 0)) {
    return null;
  }

  return {
    type: obj.type,
    reason: obj.reason,
    workoutId: obj.workoutId,
    originalDurationMinutes: obj.originalDurationMinutes,
    swapTargetDate,
    modifiedFields,
    confidence: obj.confidence,
  };
}
