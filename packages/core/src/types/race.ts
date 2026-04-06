/**
 * Race discipline and distance catalog — single source of truth for race metadata.
 *
 * A "discipline" is the top-level sport category (triathlon, running, cycling, etc.).
 * A "distance" is a specific race format within that discipline (Sprint, Olympic, Marathon, etc.).
 *
 * Each catalog entry carries all derived data:
 * - trainingSports: which workout sports are required and at what frequency
 * - minWeeklyHours: recommended minimum weekly training volume
 *
 * This eliminates the need for separate lookup maps (RACE_SPORT_MAP, MIN_HOURS_BY_RACE).
 */

import type { Sport } from './workout.js';

// =============================================================================
// DISCIPLINE
// =============================================================================

export const RACE_DISCIPLINES = [
  'triathlon',
  'duathlon',
  'aquathlon',
  'running',
  'cycling',
  'swimming',
] as const;

export type RaceDiscipline = (typeof RACE_DISCIPLINES)[number];

export function isRaceDiscipline(value: unknown): value is RaceDiscipline {
  return typeof value === 'string' && (RACE_DISCIPLINES as readonly string[]).includes(value);
}

// =============================================================================
// CATALOG ENTRY
// =============================================================================

export interface TrainingSportRequirement {
  readonly sport: Sport;
  readonly minWeeklySessions: number;
}

export interface RaceCatalogEntry {
  readonly discipline: RaceDiscipline;
  readonly distance: string;
  readonly label: string;
  readonly trainingSports: readonly TrainingSportRequirement[];
  readonly minWeeklyHours: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function tri(
  distance: string,
  label: string,
  swim: number,
  bike: number,
  run: number,
  minHours: number
): RaceCatalogEntry {
  return {
    discipline: 'triathlon',
    distance,
    label,
    trainingSports: [
      { sport: 'swim', minWeeklySessions: swim },
      { sport: 'bike', minWeeklySessions: bike },
      { sport: 'run', minWeeklySessions: run },
    ],
    minWeeklyHours: minHours,
  };
}

function runEntry(
  distance: string,
  label: string,
  sessions: number,
  minHours: number
): RaceCatalogEntry {
  return {
    discipline: 'running',
    distance,
    label,
    trainingSports: [{ sport: 'run', minWeeklySessions: sessions }],
    minWeeklyHours: minHours,
  };
}

function cycleEntry(
  distance: string,
  label: string,
  sessions: number,
  minHours: number
): RaceCatalogEntry {
  return {
    discipline: 'cycling',
    distance,
    label,
    trainingSports: [{ sport: 'bike', minWeeklySessions: sessions }],
    minWeeklyHours: minHours,
  };
}

function swimEntry(
  distance: string,
  label: string,
  sessions: number,
  minHours: number
): RaceCatalogEntry {
  return {
    discipline: 'swimming',
    distance,
    label,
    trainingSports: [{ sport: 'swim', minWeeklySessions: sessions }],
    minWeeklyHours: minHours,
  };
}

// =============================================================================
// CATALOG
// =============================================================================

export const RACE_CATALOG: readonly RaceCatalogEntry[] = [
  // Triathlon
  tri('Sprint', 'Sprint Triathlon', 2, 2, 2, 4),
  tri('Olympic', 'Olympic Triathlon', 2, 3, 3, 6),
  tri('70.3', 'Ironman 70.3', 2, 3, 3, 8),
  tri('Ironman', 'Ironman', 3, 4, 3, 12),
  tri('T100', 'T100', 2, 3, 3, 8),

  // Duathlon (bike + run)
  {
    discipline: 'duathlon',
    distance: 'Sprint',
    label: 'Sprint Duathlon',
    trainingSports: [
      { sport: 'bike', minWeeklySessions: 2 },
      { sport: 'run', minWeeklySessions: 2 },
    ],
    minWeeklyHours: 4,
  },
  {
    discipline: 'duathlon',
    distance: 'Standard',
    label: 'Standard Duathlon',
    trainingSports: [
      { sport: 'bike', minWeeklySessions: 3 },
      { sport: 'run', minWeeklySessions: 3 },
    ],
    minWeeklyHours: 6,
  },
  {
    discipline: 'duathlon',
    distance: 'Long',
    label: 'Long Duathlon',
    trainingSports: [
      { sport: 'bike', minWeeklySessions: 3 },
      { sport: 'run', minWeeklySessions: 3 },
    ],
    minWeeklyHours: 8,
  },
  {
    discipline: 'duathlon',
    distance: 'Powerman',
    label: 'Powerman',
    trainingSports: [
      { sport: 'bike', minWeeklySessions: 4 },
      { sport: 'run', minWeeklySessions: 3 },
    ],
    minWeeklyHours: 10,
  },

  // Aquathlon (swim + run)
  {
    discipline: 'aquathlon',
    distance: 'Sprint',
    label: 'Sprint Aquathlon',
    trainingSports: [
      { sport: 'swim', minWeeklySessions: 2 },
      { sport: 'run', minWeeklySessions: 2 },
    ],
    minWeeklyHours: 4,
  },
  {
    discipline: 'aquathlon',
    distance: 'Standard',
    label: 'Standard Aquathlon',
    trainingSports: [
      { sport: 'swim', minWeeklySessions: 2 },
      { sport: 'run', minWeeklySessions: 3 },
    ],
    minWeeklyHours: 5,
  },
  {
    discipline: 'aquathlon',
    distance: 'Long',
    label: 'Long Aquathlon',
    trainingSports: [
      { sport: 'swim', minWeeklySessions: 3 },
      { sport: 'run', minWeeklySessions: 3 },
    ],
    minWeeklyHours: 7,
  },

  // Running
  runEntry('5K', '5K', 3, 3),
  runEntry('10K', '10K', 3, 3),
  runEntry('Half Marathon', 'Half Marathon', 4, 4),
  runEntry('Marathon', 'Marathon', 5, 5),
  runEntry('Ultra Marathon', 'Ultra Marathon', 5, 8),

  // Cycling
  cycleEntry('Gran Fondo', 'Gran Fondo', 3, 5),
  cycleEntry('Century', 'Century', 4, 7),
  cycleEntry('Criterium', 'Criterium', 3, 4),
  cycleEntry('Time Trial', 'Time Trial', 3, 4),
  cycleEntry('Hill Climb', 'Hill Climb', 3, 4),

  // Swimming
  swimEntry('Open Water 1K', 'Open Water 1K', 3, 3),
  swimEntry('Open Water 5K', 'Open Water 5K', 4, 4),
  swimEntry('Open Water 10K', 'Open Water 10K', 5, 6),
] as const;

// =============================================================================
// LOOKUP HELPERS
// =============================================================================

/**
 * Get all distances available for a given discipline.
 */
export function getDistancesForDiscipline(discipline: RaceDiscipline): readonly RaceCatalogEntry[] {
  return RACE_CATALOG.filter((e) => e.discipline === discipline);
}

/**
 * Look up a specific catalog entry by discipline + distance.
 * Returns undefined if the combination is not found (e.g., Custom races).
 */
export function getRaceCatalogEntry(
  discipline: RaceDiscipline,
  distance: string
): RaceCatalogEntry | undefined {
  return RACE_CATALOG.find((e) => e.discipline === discipline && e.distance === distance);
}

/**
 * Human-readable label for a discipline.
 */
export const DISCIPLINE_LABELS: Readonly<Record<RaceDiscipline, string>> = {
  triathlon: 'Triathlon',
  duathlon: 'Duathlon',
  aquathlon: 'Aquathlon',
  running: 'Running',
  cycling: 'Cycling',
  swimming: 'Swimming',
};

/**
 * Icon name (Ionicons) for each discipline.
 */
export const DISCIPLINE_ICONS: Readonly<Record<RaceDiscipline, string>> = {
  triathlon: 'trophy',
  duathlon: 'bicycle',
  aquathlon: 'water',
  running: 'walk',
  cycling: 'bicycle',
  swimming: 'water',
};
