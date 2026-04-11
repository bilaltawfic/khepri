// Response validation for generate-season-skeleton.
// Validates that Claude's output satisfies structural invariants
// (contiguous dates, week sums, hours within budget, etc.)
// before the skeleton is returned to the caller.

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate YYYY-MM-DD with round-trip check to reject invalid calendar dates like 2026-02-30. */
function isValidCalendarDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

/** Add `days` to a YYYY-MM-DD string, returning a new YYYY-MM-DD string. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface SkeletonPhase {
  name: string;
  startDate: string;
  endDate: string;
  weeks: number;
  type: string;
  targetHoursPerWeek: number;
  focus: string;
}

interface SkeletonOutput {
  totalWeeks: number;
  phases: SkeletonPhase[];
  feasibilityNotes: string[];
}

interface SkeletonInput {
  currentDate: string;
  preferences: {
    weeklyHoursMin: number;
    weeklyHoursMax: number;
  };
}

const VALID_PHASE_TYPES = new Set([
  'base',
  'build',
  'peak',
  'taper',
  'recovery',
  'race_week',
  'off_season',
]);

function validatePhaseWeeks(phases: SkeletonPhase[], totalWeeks: number): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(totalWeeks) || totalWeeks < 1) {
    errors.push(`totalWeeks must be a positive integer, got ${totalWeeks}`);
  }
  let weekSum = 0;
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    if (!Number.isInteger(p.weeks) || p.weeks < 1) {
      errors.push(`phases[${i}].weeks must be a positive integer, got ${p.weeks}`);
    }
    weekSum += p.weeks;
  }
  if (weekSum !== totalWeeks) {
    errors.push(`Sum of phase weeks (${weekSum}) does not equal totalWeeks (${totalWeeks})`);
  }
  return errors;
}

function validatePhaseDates(phases: SkeletonPhase[]): string[] {
  const errors: string[] = [];
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    if (!isValidCalendarDate(p.startDate)) {
      errors.push(`phases[${i}].startDate is not a valid date: ${p.startDate}`);
    }
    if (!isValidCalendarDate(p.endDate)) {
      errors.push(`phases[${i}].endDate is not a valid date: ${p.endDate}`);
    }
    if (
      isValidCalendarDate(p.startDate) &&
      isValidCalendarDate(p.endDate) &&
      p.startDate > p.endDate
    ) {
      errors.push(`phases[${i}].startDate (${p.startDate}) is after endDate (${p.endDate})`);
    }
  }
  return errors;
}

function validateDateContiguity(phases: SkeletonPhase[]): string[] {
  const errors: string[] = [];
  for (let i = 0; i < phases.length - 1; i++) {
    const currentEnd = phases[i].endDate;
    const nextStart = phases[i + 1].startDate;
    if (isValidCalendarDate(currentEnd) && isValidCalendarDate(nextStart)) {
      const expectedNext = addDays(currentEnd, 1);
      if (nextStart !== expectedNext) {
        errors.push(
          `Gap between phases[${i}] (ends ${currentEnd}) and phases[${i + 1}] (starts ${nextStart}): expected ${expectedNext}`
        );
      }
    }
  }
  return errors;
}

function validateSeasonBounds(phases: SkeletonPhase[], currentDate: string): string[] {
  const errors: string[] = [];
  const firstPhase = phases.at(0);
  if (firstPhase && isValidCalendarDate(firstPhase.startDate)) {
    if (firstPhase.startDate < currentDate) {
      errors.push(
        `First phase starts ${firstPhase.startDate} which is before currentDate ${currentDate}`
      );
    }
  }
  const lastPhase = phases.at(-1);
  if (lastPhase && isValidCalendarDate(lastPhase.endDate)) {
    const seasonEnd = `${currentDate.slice(0, 4)}-12-31`;
    if (lastPhase.endDate > seasonEnd) {
      errors.push(`Last phase ends ${lastPhase.endDate} which is after season end ${seasonEnd}`);
    }
  }
  return errors;
}

function validatePhaseConstraints(
  phases: SkeletonPhase[],
  weeklyHoursMin: number,
  weeklyHoursMax: number
): string[] {
  const errors: string[] = [];
  for (let i = 0; i < phases.length; i++) {
    const hours = phases[i].targetHoursPerWeek;
    if (!Number.isFinite(hours)) {
      errors.push(`phases[${i}].targetHoursPerWeek (${hours}) must be a finite number`);
    } else if (hours < weeklyHoursMin || hours > weeklyHoursMax) {
      errors.push(
        `phases[${i}].targetHoursPerWeek (${hours}) is outside allowed range [${weeklyHoursMin}, ${weeklyHoursMax}]`
      );
    }
    if (!VALID_PHASE_TYPES.has(phases[i].type)) {
      errors.push(`phases[${i}].type "${phases[i].type}" is not a valid phase type`);
    }
  }
  return errors;
}

/**
 * Validate that a Claude-generated season skeleton satisfies all structural
 * invariants. Returns an array of human-readable error strings; an empty
 * array means the output is valid.
 */
export function validateSkeletonResponse(input: SkeletonInput, output: SkeletonOutput): string[] {
  return [
    ...validatePhaseWeeks(output.phases, output.totalWeeks),
    ...validatePhaseDates(output.phases),
    ...validateDateContiguity(output.phases),
    ...validateSeasonBounds(output.phases, input.currentDate),
    ...validatePhaseConstraints(
      output.phases,
      input.preferences.weeklyHoursMin,
      input.preferences.weeklyHoursMax
    ),
  ];
}
