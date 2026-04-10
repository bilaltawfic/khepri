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

const VALID_PHASE_TYPES = ['base', 'build', 'peak', 'taper', 'recovery', 'race_week', 'off_season'];

/**
 * Validate that a Claude-generated season skeleton satisfies all structural
 * invariants. Returns an array of human-readable error strings; an empty
 * array means the output is valid.
 */
export function validateSkeletonResponse(input: SkeletonInput, output: SkeletonOutput): string[] {
  const errors: string[] = [];

  // 1. Every phase weeks is a positive integer
  for (let i = 0; i < output.phases.length; i++) {
    const p = output.phases[i];
    if (!Number.isInteger(p.weeks) || p.weeks < 1) {
      errors.push(`phases[${i}].weeks must be a positive integer, got ${p.weeks}`);
    }
  }

  // 2. Sum of all phase weeks equals totalWeeks
  const weekSum = output.phases.reduce((sum, p) => sum + p.weeks, 0);
  if (weekSum !== output.totalWeeks) {
    errors.push(`Sum of phase weeks (${weekSum}) does not equal totalWeeks (${output.totalWeeks})`);
  }

  // 3. All dates are valid calendar dates
  for (let i = 0; i < output.phases.length; i++) {
    const p = output.phases[i];
    if (!isValidCalendarDate(p.startDate)) {
      errors.push(`phases[${i}].startDate is not a valid date: ${p.startDate}`);
    }
    if (!isValidCalendarDate(p.endDate)) {
      errors.push(`phases[${i}].endDate is not a valid date: ${p.endDate}`);
    }
  }

  // 4. Phases are date-contiguous: phases[i].endDate + 1 day === phases[i+1].startDate
  for (let i = 0; i < output.phases.length - 1; i++) {
    const currentEnd = output.phases[i].endDate;
    const nextStart = output.phases[i + 1].startDate;
    if (isValidCalendarDate(currentEnd) && isValidCalendarDate(nextStart)) {
      const expectedNext = addDays(currentEnd, 1);
      if (nextStart !== expectedNext) {
        errors.push(
          `Gap between phases[${i}] (ends ${currentEnd}) and phases[${i + 1}] (starts ${nextStart}): expected ${expectedNext}`
        );
      }
    }
  }

  // 5. First phase startDate >= currentDate
  if (output.phases.length > 0 && isValidCalendarDate(output.phases[0].startDate)) {
    if (output.phases[0].startDate < input.currentDate) {
      errors.push(
        `First phase starts ${output.phases[0].startDate} which is before currentDate ${input.currentDate}`
      );
    }
  }

  // 6. Last phase endDate <= season end (end of year)
  if (output.phases.length > 0) {
    const lastPhase = output.phases[output.phases.length - 1];
    if (isValidCalendarDate(lastPhase.endDate)) {
      const seasonEnd = `${input.currentDate.slice(0, 4)}-12-31`;
      if (lastPhase.endDate > seasonEnd) {
        errors.push(`Last phase ends ${lastPhase.endDate} which is after season end ${seasonEnd}`);
      }
    }
  }

  // 7. Every phase targetHoursPerWeek is within preferences range
  for (let i = 0; i < output.phases.length; i++) {
    const hours = output.phases[i].targetHoursPerWeek;
    if (hours < input.preferences.weeklyHoursMin || hours > input.preferences.weeklyHoursMax) {
      errors.push(
        `phases[${i}].targetHoursPerWeek (${hours}) is outside allowed range [${input.preferences.weeklyHoursMin}, ${input.preferences.weeklyHoursMax}]`
      );
    }
  }

  // 8. Every phase type is in the enum (defense in depth)
  for (let i = 0; i < output.phases.length; i++) {
    if (!VALID_PHASE_TYPES.includes(output.phases[i].type)) {
      errors.push(`phases[${i}].type "${output.phases[i].type}" is not a valid phase type`);
    }
  }

  return errors;
}
