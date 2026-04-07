/**
 * Sport requirements derived from the race catalog.
 *
 * Use getRequirementsForRace(discipline, distance) to look up required
 * sports and minimum weekly sessions for a given race.
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
