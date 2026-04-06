import { describe, expect, it } from '@jest/globals';
import {
  getMinHoursForRaceList,
  getMinWeeklyHours,
  getRequirementsForRace,
  getSportRequirements,
  mergeSportRequirements,
} from './race-sport-requirements.js';

describe('getSportRequirements', () => {
  it('returns 3 sports for Sprint Tri (canonical key) with correct min sessions', () => {
    const reqs = getSportRequirements('Sprint Tri');
    expect(reqs).toHaveLength(3);
    expect(reqs.find((r) => r.sport === 'swim')?.minWeeklySessions).toBe(2);
    expect(reqs.find((r) => r.sport === 'bike')?.minWeeklySessions).toBe(2);
    expect(reqs.find((r) => r.sport === 'run')?.minWeeklySessions).toBe(2);
  });

  it('returns same result for Sprint Triathlon alias', () => {
    const canonical = getSportRequirements('Sprint Tri');
    const alias = getSportRequirements('Sprint Triathlon');
    expect(alias).toHaveLength(canonical.length);
    expect(alias.find((r) => r.sport === 'swim')?.minWeeklySessions).toBe(
      canonical.find((r) => r.sport === 'swim')?.minWeeklySessions
    );
  });

  it('returns correct sessions for Olympic Tri (canonical key)', () => {
    const reqs = getSportRequirements('Olympic Tri');
    expect(reqs).toHaveLength(3);
    expect(reqs.find((r) => r.sport === 'swim')?.minWeeklySessions).toBe(2);
    expect(reqs.find((r) => r.sport === 'bike')?.minWeeklySessions).toBe(3);
    expect(reqs.find((r) => r.sport === 'run')?.minWeeklySessions).toBe(3);
  });

  it('returns same result for Olympic Triathlon alias', () => {
    const canonical = getSportRequirements('Olympic Tri');
    const alias = getSportRequirements('Olympic Triathlon');
    expect(alias).toHaveLength(canonical.length);
  });

  it('returns correct sessions for Ironman 70.3', () => {
    const reqs = getSportRequirements('Ironman 70.3');
    expect(reqs).toHaveLength(3);
    expect(reqs.find((r) => r.sport === 'swim')?.minWeeklySessions).toBe(2);
    expect(reqs.find((r) => r.sport === 'bike')?.minWeeklySessions).toBe(3);
    expect(reqs.find((r) => r.sport === 'run')?.minWeeklySessions).toBe(3);
  });

  it('returns correct sessions for Ironman', () => {
    const reqs = getSportRequirements('Ironman');
    expect(reqs).toHaveLength(3);
    expect(reqs.find((r) => r.sport === 'swim')?.minWeeklySessions).toBe(3);
    expect(reqs.find((r) => r.sport === 'bike')?.minWeeklySessions).toBe(4);
    expect(reqs.find((r) => r.sport === 'run')?.minWeeklySessions).toBe(3);
  });

  it('returns correct sessions for T100', () => {
    const reqs = getSportRequirements('T100');
    expect(reqs).toHaveLength(3);
    expect(reqs.find((r) => r.sport === 'swim')?.minWeeklySessions).toBe(2);
    expect(reqs.find((r) => r.sport === 'bike')?.minWeeklySessions).toBe(3);
    expect(reqs.find((r) => r.sport === 'run')?.minWeeklySessions).toBe(3);
  });

  it('returns swim and run for Aquathlon', () => {
    const reqs = getSportRequirements('Aquathlon');
    expect(reqs).toHaveLength(2);
    expect(reqs.find((r) => r.sport === 'swim')?.minWeeklySessions).toBe(2);
    expect(reqs.find((r) => r.sport === 'run')?.minWeeklySessions).toBe(3);
  });

  it('returns bike and run for Duathlon', () => {
    const reqs = getSportRequirements('Duathlon');
    expect(reqs).toHaveLength(2);
    expect(reqs.find((r) => r.sport === 'bike')?.minWeeklySessions).toBe(3);
    expect(reqs.find((r) => r.sport === 'run')?.minWeeklySessions).toBe(3);
  });

  it('returns run 3 for 5K', () => {
    const reqs = getSportRequirements('5K');
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.sport).toBe('run');
    expect(reqs[0]?.minWeeklySessions).toBe(3);
  });

  it('returns run 3 for 10K', () => {
    const reqs = getSportRequirements('10K');
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.minWeeklySessions).toBe(3);
  });

  it('returns run 4 for Half Marathon', () => {
    const reqs = getSportRequirements('Half Marathon');
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.minWeeklySessions).toBe(4);
  });

  it('returns run 5 for Marathon', () => {
    const reqs = getSportRequirements('Marathon');
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.minWeeklySessions).toBe(5);
  });

  it('returns run 5 for Ultra Marathon', () => {
    const reqs = getSportRequirements('Ultra Marathon');
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.minWeeklySessions).toBe(5);
  });

  it('returns empty array for Custom', () => {
    expect(getSportRequirements('Custom')).toHaveLength(0);
  });

  it('returns empty array for unknown distance', () => {
    expect(getSportRequirements('unknown')).toHaveLength(0);
  });

  it('formats labels correctly', () => {
    const reqs = getSportRequirements('Sprint Tri');
    expect(reqs.find((r) => r.sport === 'swim')?.label).toBe('Swim (min 2/week)');
    expect(reqs.find((r) => r.sport === 'bike')?.label).toBe('Bike (min 2/week)');
    expect(reqs.find((r) => r.sport === 'run')?.label).toBe('Run (min 2/week)');
  });

  it('returns a new array instance each call to prevent mutation of shared map', () => {
    const a = getSportRequirements('Sprint Tri');
    const b = getSportRequirements('Sprint Tri');
    expect(a).not.toBe(b);
  });
});

describe('getRequirementsForRace', () => {
  it('returns 3 sports for triathlon Sprint', () => {
    const reqs = getRequirementsForRace('triathlon', 'Sprint');
    expect(reqs).toHaveLength(3);
    expect(reqs.find((r) => r.sport === 'swim')?.minWeeklySessions).toBe(2);
    expect(reqs.find((r) => r.sport === 'bike')?.minWeeklySessions).toBe(2);
    expect(reqs.find((r) => r.sport === 'run')?.minWeeklySessions).toBe(2);
  });

  it('returns run only for running Marathon', () => {
    const reqs = getRequirementsForRace('running', 'Marathon');
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.sport).toBe('run');
    expect(reqs[0]?.minWeeklySessions).toBe(5);
  });

  it('returns bike and run for duathlon Standard', () => {
    const reqs = getRequirementsForRace('duathlon', 'Standard');
    expect(reqs).toHaveLength(2);
    expect(reqs.find((r) => r.sport === 'bike')).toBeDefined();
    expect(reqs.find((r) => r.sport === 'run')).toBeDefined();
  });

  it('returns swim and run for aquathlon Standard', () => {
    const reqs = getRequirementsForRace('aquathlon', 'Standard');
    expect(reqs).toHaveLength(2);
    expect(reqs.find((r) => r.sport === 'swim')).toBeDefined();
    expect(reqs.find((r) => r.sport === 'run')).toBeDefined();
  });

  it('returns bike only for cycling Gran Fondo', () => {
    const reqs = getRequirementsForRace('cycling', 'Gran Fondo');
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.sport).toBe('bike');
  });

  it('returns swim only for swimming Open Water 5K', () => {
    const reqs = getRequirementsForRace('swimming', 'Open Water 5K');
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.sport).toBe('swim');
  });

  it('returns empty array for unknown discipline/distance combo', () => {
    expect(getRequirementsForRace('triathlon', 'UnknownDistance')).toHaveLength(0);
  });
});

describe('getMinWeeklyHours', () => {
  it('returns minimum hours for triathlon Ironman', () => {
    const hours = getMinWeeklyHours('triathlon', 'Ironman');
    expect(hours).toBeDefined();
    expect(hours).toBeGreaterThan(0);
  });

  it('returns undefined for unknown combination', () => {
    expect(getMinWeeklyHours('running', 'UnknownDistance')).toBeUndefined();
  });
});

describe('getMinHoursForRaceList', () => {
  it('returns highest min hours across multiple races', () => {
    const result = getMinHoursForRaceList([
      { discipline: 'running', distance: '5K' },
      { discipline: 'triathlon', distance: 'Ironman' },
    ]);
    expect(result).not.toBeNull();
    // Ironman should have higher min hours than 5K
    const ironmanHours = getMinWeeklyHours('triathlon', 'Ironman');
    expect(result?.minHours).toBe(ironmanHours);
  });

  it('returns null for empty list', () => {
    expect(getMinHoursForRaceList([])).toBeNull();
  });

  it('returns null for unknown races only', () => {
    expect(getMinHoursForRaceList([{ discipline: 'running', distance: 'Unknown' }])).toBeNull();
  });
});

describe('mergeSportRequirements', () => {
  it('takes max min-sessions per sport across multiple race distances', () => {
    const sprint = getSportRequirements('Sprint Tri'); // swim 2, bike 2, run 2
    const iron703 = getSportRequirements('Ironman 70.3'); // swim 2, bike 3, run 3
    const merged = mergeSportRequirements([sprint, iron703]);

    expect(merged).toHaveLength(3);
    expect(merged.find((r) => r.sport === 'swim')?.minWeeklySessions).toBe(2);
    expect(merged.find((r) => r.sport === 'bike')?.minWeeklySessions).toBe(3);
    expect(merged.find((r) => r.sport === 'run')?.minWeeklySessions).toBe(3);
  });

  it('handles disjoint sport sets by including all sports', () => {
    const aquathlon = getSportRequirements('Aquathlon'); // swim 2, run 3
    const duathlon = getSportRequirements('Duathlon'); // bike 3, run 3
    const merged = mergeSportRequirements([aquathlon, duathlon]);

    expect(merged).toHaveLength(3);
    expect(merged.find((r) => r.sport === 'swim')?.minWeeklySessions).toBe(2);
    expect(merged.find((r) => r.sport === 'bike')?.minWeeklySessions).toBe(3);
    expect(merged.find((r) => r.sport === 'run')?.minWeeklySessions).toBe(3);
  });

  it('returns empty array when all inputs are empty', () => {
    expect(mergeSportRequirements([[], []])).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(mergeSportRequirements([])).toHaveLength(0);
  });

  it('handles single input passthrough', () => {
    const sprint = getSportRequirements('Sprint Tri');
    const merged = mergeSportRequirements([sprint]);
    expect(merged).toHaveLength(3);
  });
});
