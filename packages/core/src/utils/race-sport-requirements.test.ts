import { describe, expect, it } from '@jest/globals';
import { getSportRequirements, mergeSportRequirements } from './race-sport-requirements.js';

describe('getSportRequirements', () => {
  it('returns 3 sports for Sprint Triathlon with correct min sessions', () => {
    const reqs = getSportRequirements('Sprint Triathlon');
    expect(reqs).toHaveLength(3);
    const swim = reqs.find((r) => r.sport === 'swim');
    const bike = reqs.find((r) => r.sport === 'bike');
    const run = reqs.find((r) => r.sport === 'run');
    expect(swim?.minWeeklySessions).toBe(2);
    expect(bike?.minWeeklySessions).toBe(2);
    expect(run?.minWeeklySessions).toBe(2);
  });

  it('returns correct sessions for Ironman', () => {
    const reqs = getSportRequirements('Ironman');
    expect(reqs).toHaveLength(3);
    const swim = reqs.find((r) => r.sport === 'swim');
    const bike = reqs.find((r) => r.sport === 'bike');
    const run = reqs.find((r) => r.sport === 'run');
    expect(swim?.minWeeklySessions).toBe(3);
    expect(bike?.minWeeklySessions).toBe(4);
    expect(run?.minWeeklySessions).toBe(3);
  });

  it('returns run only for 5K with 3 sessions', () => {
    const reqs = getSportRequirements('5K');
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.sport).toBe('run');
    expect(reqs[0]?.minWeeklySessions).toBe(3);
  });

  it('returns run only for 10K with 3 sessions', () => {
    const reqs = getSportRequirements('10K');
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.sport).toBe('run');
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

  it('returns empty array for Custom', () => {
    expect(getSportRequirements('Custom')).toHaveLength(0);
  });

  it('returns empty array for unknown distance', () => {
    expect(getSportRequirements('unknown')).toHaveLength(0);
  });

  it('formats labels correctly', () => {
    const reqs = getSportRequirements('Sprint Triathlon');
    const swim = reqs.find((r) => r.sport === 'swim');
    expect(swim?.label).toBe('Swim (min 2/week)');
  });
});

describe('mergeSportRequirements', () => {
  it('takes max min-sessions per sport across multiple race distances', () => {
    const sprint = getSportRequirements('Sprint Triathlon'); // swim 2, bike 2, run 2
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
    const sprint = getSportRequirements('Sprint Triathlon');
    const merged = mergeSportRequirements([sprint]);
    expect(merged).toHaveLength(3);
  });
});
