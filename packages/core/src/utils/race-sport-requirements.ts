/**
 * Sport requirements derived from the race catalog.
 *
 * Provides two lookup modes:
 * 1. getRequirementsForRace(discipline, distance) — preferred, uses explicit discipline
 * 2. getSportRequirements(legacyDistance) — backward-compatible, maps old flat distance strings
 *
 * Both return the same SportRequirement[] shape.
 */

import type { RaceDiscipline } from '../types/race.js';
import { getRaceCatalogEntry } from '../types/race.js';
import type { Sport } from '../types/workout.js';

export interface SportRequirement {
  readonly sport: Sport;
  readonly minWeeklySessions: number;
  readonly label: string;
}

function toSportRequirement(sport: Sport, minWeeklySessions: number): SportRequirement {
  return {
    sport,
    minWeeklySessions,
    label: `${sport.charAt(0).toUpperCase() + sport.slice(1)} (min ${minWeeklySessions}/week)`,
  };
}

/**
 * Get sport requirements for a race by discipline + distance (preferred API).
 * Returns empty array for unknown combinations or Custom races.
 */
export function getRequirementsForRace(
  discipline: RaceDiscipline,
  distance: string
): readonly SportRequirement[] {
  const entry = getRaceCatalogEntry(discipline, distance);
  if (entry == null) return [];
  return entry.trainingSports.map((ts) => toSportRequirement(ts.sport, ts.minWeeklySessions));
}

/**
 * Legacy mapping from old flat distance strings to (discipline, distance) pairs.
 * Used by getSportRequirements() for backward compatibility.
 */
const LEGACY_DISTANCE_TO_CATALOG: Readonly<
  Record<string, { discipline: RaceDiscipline; distance: string }>
> = {
  'Sprint Tri': { discipline: 'triathlon', distance: 'Sprint' },
  'Sprint Triathlon': { discipline: 'triathlon', distance: 'Sprint' },
  'Olympic Tri': { discipline: 'triathlon', distance: 'Olympic' },
  'Olympic Triathlon': { discipline: 'triathlon', distance: 'Olympic' },
  'Ironman 70.3': { discipline: 'triathlon', distance: '70.3' },
  'Half Ironman': { discipline: 'triathlon', distance: '70.3' },
  Ironman: { discipline: 'triathlon', distance: 'Ironman' },
  T100: { discipline: 'triathlon', distance: 'T100' },
  Aquathlon: { discipline: 'aquathlon', distance: 'Standard' },
  Duathlon: { discipline: 'duathlon', distance: 'Standard' },
  '5K': { discipline: 'running', distance: '5K' },
  '10K': { discipline: 'running', distance: '10K' },
  'Half Marathon': { discipline: 'running', distance: 'Half Marathon' },
  Marathon: { discipline: 'running', distance: 'Marathon' },
  'Ultra Marathon': { discipline: 'running', distance: 'Ultra Marathon' },
  Custom: { discipline: 'running', distance: '__custom__' },
};

/**
 * Get sport requirements from a legacy flat distance string.
 * Maintained for backward compatibility — prefer getRequirementsForRace().
 */
export function getSportRequirements(raceDistance: string): readonly SportRequirement[] {
  const mapped = LEGACY_DISTANCE_TO_CATALOG[raceDistance];
  if (mapped == null) return [];
  return getRequirementsForRace(mapped.discipline, mapped.distance);
}

/**
 * Get minimum weekly training hours for a race by discipline + distance.
 * Returns undefined for unknown combinations.
 */
export function getMinWeeklyHours(
  discipline: RaceDiscipline,
  distance: string
): number | undefined {
  return getRaceCatalogEntry(discipline, distance)?.minWeeklyHours;
}

/**
 * Get the highest minimum weekly hours across a list of races.
 * Returns null if no race has a known minimum.
 */
export function getMinHoursForRaceList(
  races: readonly { discipline: RaceDiscipline; distance: string }[]
): { minHours: number; label: string } | null {
  let result: { minHours: number; label: string } | null = null;
  for (const race of races) {
    const entry = getRaceCatalogEntry(race.discipline, race.distance);
    if (entry != null && (result == null || entry.minWeeklyHours > result.minHours)) {
      result = { minHours: entry.minWeeklyHours, label: entry.label };
    }
  }
  return result;
}

export function mergeSportRequirements(
  requirements: readonly (readonly SportRequirement[])[]
): readonly SportRequirement[] {
  const merged = new Map<Sport, SportRequirement>();
  for (const reqs of requirements) {
    for (const req of reqs) {
      const existing = merged.get(req.sport);
      if (existing == null || req.minWeeklySessions > existing.minWeeklySessions) {
        merged.set(req.sport, req);
      }
    }
  }
  return [...merged.values()];
}
