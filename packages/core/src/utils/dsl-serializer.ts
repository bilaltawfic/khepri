/**
 * DSL Serializer — converts WorkoutStructure to Intervals.icu DSL format.
 *
 * The Intervals.icu DSL is the text format that enables structured workout
 * display on the calendar and push to Garmin/Zwift/smart trainers.
 */

import type {
  IntervalsTarget,
  WorkoutSection,
  WorkoutStep,
  WorkoutStructure,
} from '../types/workout.js';

/**
 * Serialize a WorkoutStep target string for the given target type.
 * If the step has an explicit `target`, uses it directly.
 * Otherwise falls back to zone or description.
 */
function formatStepTarget(step: Readonly<WorkoutStep>, target: IntervalsTarget): string {
  if (step.target) {
    return step.target;
  }
  if (step.zone) {
    let suffix = '';
    if (target === 'PACE') {
      suffix = ' Pace';
    } else if (target === 'HR') {
      suffix = ' HR';
    }
    return `${step.zone}${suffix}`;
  }
  return '';
}

/**
 * Format a step's duration or distance component.
 * Distances always use `mtr` (not `m`) to avoid ambiguity with minutes.
 */
function formatStepDuration(step: Readonly<WorkoutStep>): string {
  if (step.durationMeters != null) {
    if (step.durationMeters >= 1000 && step.durationMeters % 1000 === 0) {
      return `${step.durationMeters / 1000}km`;
    }
    return `${step.durationMeters}mtr`;
  }
  if (step.durationMinutes != null) {
    const totalSeconds = Math.round(step.durationMinutes * 60);
    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (seconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m${seconds}s`;
  }
  return '';
}

/**
 * Serialize a single workout step as a DSL line (without the `- ` prefix).
 */
function serializeStep(step: Readonly<WorkoutStep>, target: IntervalsTarget): string {
  const duration = formatStepDuration(step);
  const targetStr = formatStepTarget(step, target);

  if (!duration && !targetStr) {
    return '';
  }
  if (!targetStr) {
    return duration;
  }
  return `${duration} ${targetStr}`.trim();
}

/**
 * Get the repeat count for a section by checking its steps.
 * Convention: if any step has `repeat` set, that value is used as the
 * section-level repeat count in the DSL output.
 */
function getSectionRepeat(section: Readonly<WorkoutSection>): number | undefined {
  for (const step of section.steps) {
    if (step.repeat != null && step.repeat > 1) {
      return step.repeat;
    }
  }
  return undefined;
}

/**
 * Serialize a WorkoutSection to DSL lines.
 */
function serializeSection(section: Readonly<WorkoutSection>, target: IntervalsTarget): string {
  const repeat = getSectionRepeat(section);
  const header = repeat == null ? section.name : `${section.name} ${repeat}x`;

  const stepLines = section.steps
    .map((step) => serializeStep(step, target))
    .filter((line) => line.length > 0)
    .map((line) => `- ${line}`);

  if (stepLines.length === 0) {
    return '';
  }

  return `${header}\n${stepLines.join('\n')}`;
}

/**
 * Convert a WorkoutStructure to a valid Intervals.icu DSL string.
 *
 * @param structure - The workout structure to serialize
 * @param target - The target type: POWER (bike), PACE (run/swim), HR, or AUTO
 * @returns A DSL string ready for Intervals.icu
 */
export function workoutStructureToDSL(
  structure: Readonly<WorkoutStructure>,
  target: IntervalsTarget
): string {
  const sections = structure.sections
    .map((section) => serializeSection(section, target))
    .filter((s) => s.length > 0);

  return sections.join('\n\n');
}
