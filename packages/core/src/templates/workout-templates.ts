/**
 * Workout Template Engine
 *
 * Selects and renders workout templates for the free tier.
 * Templates produce WorkoutStructure deterministically from athlete zones.
 */

import type { PeriodizationPhase, TrainingFocus } from '../types/training.js';
import type { IntervalsTarget, Sport, WorkoutStructure } from '../types/workout.js';

/**
 * Athlete zone data used to parameterize templates.
 */
export interface AthleteZones {
  readonly ftp?: number;
  readonly thresholdPaceSecKm?: number;
  readonly cssSec100m?: number;
  readonly lthr?: number;
  readonly maxHr?: number;
}

/**
 * Criteria for selecting a template.
 */
export interface TemplateSelection {
  readonly sport: Sport;
  readonly phase: PeriodizationPhase;
  readonly focus: TrainingFocus;
  readonly durationMinutes: number;
}

/**
 * A workout template definition.
 */
export interface TrainingTemplate {
  readonly id: string;
  readonly name: string;
  readonly sport: Sport;
  readonly phases: readonly PeriodizationPhase[];
  readonly focus: TrainingFocus;
  readonly durationRange: readonly [number, number];
  readonly intervalsTarget: IntervalsTarget;
  readonly render: (zones: AthleteZones, durationMinutes: number) => WorkoutStructure;
}

/**
 * Global template registry.
 */
const templateRegistry: TrainingTemplate[] = [];

/**
 * Register a template in the global registry.
 */
export function registerTemplate(template: TrainingTemplate): void {
  templateRegistry.push(template);
}

/**
 * Register multiple templates at once.
 */
export function registerTemplates(templates: readonly TrainingTemplate[]): void {
  for (const t of templates) {
    registerTemplate(t);
  }
}

/**
 * Get all registered templates.
 */
export function getAllTemplates(): readonly TrainingTemplate[] {
  return templateRegistry;
}

/**
 * Clear all templates (for testing).
 */
export function clearTemplates(): void {
  templateRegistry.length = 0;
}

/**
 * Select the best matching template for the given criteria.
 *
 * Matching priority:
 * 1. Sport must match exactly
 * 2. Phase must be in the template's phases list
 * 3. Focus must match
 * 4. Duration must be within the template's range
 *
 * If no exact match, falls back to:
 * - Same sport + phase (any focus)
 * - Same sport (any phase/focus)
 *
 * Returns null if no template matches at all.
 */
export function selectTemplate(selection: TemplateSelection): TrainingTemplate | null {
  const { sport, phase, focus, durationMinutes } = selection;

  // Exact match: sport + phase + focus + duration in range
  const exact = templateRegistry.find(
    (t) =>
      t.sport === sport &&
      t.phases.includes(phase) &&
      t.focus === focus &&
      durationMinutes >= t.durationRange[0] &&
      durationMinutes <= t.durationRange[1]
  );
  if (exact) return exact;

  // Relaxed duration: sport + phase + focus, closest duration range
  const focusMatch = templateRegistry.filter(
    (t) => t.sport === sport && t.phases.includes(phase) && t.focus === focus
  );
  if (focusMatch.length > 0) {
    return closestByDuration(focusMatch, durationMinutes);
  }

  // Same sport + phase (any focus)
  const phaseMatch = templateRegistry.filter((t) => t.sport === sport && t.phases.includes(phase));
  if (phaseMatch.length > 0) {
    return closestByDuration(phaseMatch, durationMinutes);
  }

  // Same sport (any phase)
  const sportMatch = templateRegistry.filter((t) => t.sport === sport);
  if (sportMatch.length > 0) {
    return closestByDuration(sportMatch, durationMinutes);
  }

  return null;
}

/**
 * Render a template with athlete zones and target duration.
 */
export function renderTemplate(
  template: TrainingTemplate,
  zones: AthleteZones,
  durationMinutes: number
): WorkoutStructure {
  return template.render(zones, durationMinutes);
}

/**
 * Find the template whose duration range center is closest to target.
 */
function closestByDuration(
  templates: readonly TrainingTemplate[],
  targetDuration: number
): TrainingTemplate {
  let best: TrainingTemplate | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const t of templates) {
    const center = (t.durationRange[0] + t.durationRange[1]) / 2;
    const dist = Math.abs(center - targetDuration);
    if (dist < bestDist) {
      bestDist = dist;
      best = t;
    }
  }
  // Safety: this function is only called with non-empty arrays
  return best as TrainingTemplate;
}
