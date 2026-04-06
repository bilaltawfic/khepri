import type { Sport } from '../types/workout.js';

export interface SportRequirement {
  readonly sport: Sport;
  readonly minWeeklySessions: number;
  readonly label: string;
}

function req(sport: Sport, minWeeklySessions: number): SportRequirement {
  return {
    sport,
    minWeeklySessions,
    label: `${sport.charAt(0).toUpperCase() + sport.slice(1)} (min ${minWeeklySessions}/week)`,
  };
}

const SPRINT_TRI_REQUIREMENTS = [req('swim', 2), req('bike', 2), req('run', 2)] as const;
const OLYMPIC_TRI_REQUIREMENTS = [req('swim', 2), req('bike', 3), req('run', 3)] as const;

const RACE_SPORT_MAP: Readonly<Record<string, readonly SportRequirement[]>> = {
  'Sprint Tri': SPRINT_TRI_REQUIREMENTS,
  'Sprint Triathlon': SPRINT_TRI_REQUIREMENTS,
  'Olympic Tri': OLYMPIC_TRI_REQUIREMENTS,
  'Olympic Triathlon': OLYMPIC_TRI_REQUIREMENTS,
  'Ironman 70.3': [req('swim', 2), req('bike', 3), req('run', 3)],
  Ironman: [req('swim', 3), req('bike', 4), req('run', 3)],
  T100: [req('swim', 2), req('bike', 3), req('run', 3)],
  Aquathlon: [req('swim', 2), req('run', 3)],
  Duathlon: [req('bike', 3), req('run', 3)],
  '5K': [req('run', 3)],
  '10K': [req('run', 3)],
  'Half Marathon': [req('run', 4)],
  Marathon: [req('run', 5)],
  'Ultra Marathon': [req('run', 5)],
  Custom: [],
};

export function getSportRequirements(raceDistance: string): readonly SportRequirement[] {
  const requirements = RACE_SPORT_MAP[raceDistance];
  return requirements == null ? [] : [...requirements];
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
