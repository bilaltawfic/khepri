import { validateSkeletonResponse } from '../validation.ts';

const BASE_INPUT = {
  currentDate: '2026-04-07',
  preferences: {
    weeklyHoursMin: 6,
    weeklyHoursMax: 12,
  },
};

function makePhase(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Base Phase',
    startDate: '2026-04-07',
    endDate: '2026-05-03',
    weeks: 4,
    type: 'base',
    targetHoursPerWeek: 8,
    focus: 'Aerobic base building',
    ...overrides,
  };
}

function makeValidSkeleton() {
  return {
    totalWeeks: 8,
    phases: [
      makePhase({
        name: 'Base Phase',
        startDate: '2026-04-07',
        endDate: '2026-05-04',
        weeks: 4,
      }),
      makePhase({
        name: 'Build Phase',
        startDate: '2026-05-05',
        endDate: '2026-06-01',
        weeks: 4,
        type: 'build',
      }),
    ],
    feasibilityNotes: ['Good plan overall.'],
  };
}

describe('validateSkeletonResponse', () => {
  it('returns empty array for a valid skeleton', () => {
    const errors = validateSkeletonResponse(BASE_INPUT, makeValidSkeleton());
    expect(errors).toEqual([]);
  });

  // --- Week sum ---

  it('detects week sum mismatch', () => {
    const skeleton = makeValidSkeleton();
    skeleton.totalWeeks = 10; // phases sum to 8
    const errors = validateSkeletonResponse(BASE_INPUT, skeleton);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Sum of phase weeks.*does not equal totalWeeks/),
      ])
    );
  });

  // --- Non-positive weeks ---

  it('detects non-positive phase weeks', () => {
    const skeleton = {
      totalWeeks: 4,
      phases: [
        makePhase({ weeks: 0 }),
        makePhase({ startDate: '2026-05-05', endDate: '2026-06-01', weeks: 4 }),
      ],
      feasibilityNotes: [],
    };
    const errors = validateSkeletonResponse(BASE_INPUT, skeleton);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/positive integer/)]));
  });

  it('detects fractional phase weeks', () => {
    const skeleton = {
      totalWeeks: 4.5,
      phases: [
        makePhase({ weeks: 2.5 }),
        makePhase({ startDate: '2026-05-05', endDate: '2026-06-01', weeks: 2 }),
      ],
      feasibilityNotes: [],
    };
    const errors = validateSkeletonResponse(BASE_INPUT, skeleton);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/positive integer/)]));
  });

  // --- Date contiguity ---

  it('detects gap between phases', () => {
    const skeleton = {
      totalWeeks: 8,
      phases: [
        makePhase({ startDate: '2026-04-07', endDate: '2026-05-04', weeks: 4 }),
        makePhase({
          name: 'Build',
          startDate: '2026-05-06', // gap: should be 2026-05-05
          endDate: '2026-06-02',
          weeks: 4,
          type: 'build',
        }),
      ],
      feasibilityNotes: [],
    };
    const errors = validateSkeletonResponse(BASE_INPUT, skeleton);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/Gap between phases/)]));
  });

  it('handles year boundary contiguity (Dec 31 → Jan 1)', () => {
    const input = { ...BASE_INPUT, currentDate: '2026-12-01' };
    const skeleton = {
      totalWeeks: 5,
      phases: [
        makePhase({
          startDate: '2026-12-01',
          endDate: '2026-12-28',
          weeks: 4,
          targetHoursPerWeek: 8,
        }),
        makePhase({
          name: 'Off Season',
          startDate: '2026-12-29',
          endDate: '2026-12-31',
          weeks: 1,
          type: 'off_season',
          targetHoursPerWeek: 6,
        }),
      ],
      feasibilityNotes: [],
    };
    const errors = validateSkeletonResponse(input, skeleton);
    expect(errors).toEqual([]);
  });

  it('handles Feb 28 → Mar 1 contiguity in non-leap year', () => {
    const input = { ...BASE_INPUT, currentDate: '2026-02-01' };
    const skeleton = {
      totalWeeks: 8,
      phases: [
        makePhase({
          startDate: '2026-02-01',
          endDate: '2026-02-28',
          weeks: 4,
          targetHoursPerWeek: 8,
        }),
        makePhase({
          name: 'Build',
          startDate: '2026-03-01',
          endDate: '2026-03-28',
          weeks: 4,
          type: 'build',
          targetHoursPerWeek: 10,
        }),
      ],
      feasibilityNotes: [],
    };
    const errors = validateSkeletonResponse(input, skeleton);
    expect(errors).toEqual([]);
  });

  // --- Invalid dates ---

  it('detects invalid calendar dates', () => {
    const skeleton = {
      totalWeeks: 4,
      phases: [makePhase({ startDate: '2026-02-30', endDate: '2026-03-29', weeks: 4 })],
      feasibilityNotes: [],
    };
    const errors = validateSkeletonResponse(BASE_INPUT, skeleton);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/not a valid date/)]));
  });

  // --- First phase before currentDate ---

  it('detects first phase starting before currentDate', () => {
    const skeleton = {
      totalWeeks: 4,
      phases: [makePhase({ startDate: '2026-04-01', endDate: '2026-04-28', weeks: 4 })],
      feasibilityNotes: [],
    };
    const errors = validateSkeletonResponse(BASE_INPUT, skeleton);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/before currentDate/)]));
  });

  // --- Last phase after season end ---

  it('detects last phase ending after season end', () => {
    const skeleton = {
      totalWeeks: 4,
      phases: [
        makePhase({
          startDate: '2026-12-15',
          endDate: '2027-01-11',
          weeks: 4,
          targetHoursPerWeek: 8,
        }),
      ],
      feasibilityNotes: [],
    };
    const errors = validateSkeletonResponse(BASE_INPUT, skeleton);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/after season end/)]));
  });

  // --- Hours out of range ---

  it('detects targetHoursPerWeek below minimum', () => {
    const skeleton = {
      totalWeeks: 4,
      phases: [makePhase({ targetHoursPerWeek: 3 })],
      feasibilityNotes: [],
    };
    const errors = validateSkeletonResponse(BASE_INPUT, skeleton);
    expect(errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/outside allowed range/)])
    );
  });

  it('detects targetHoursPerWeek above maximum', () => {
    const skeleton = {
      totalWeeks: 4,
      phases: [makePhase({ targetHoursPerWeek: 15 })],
      feasibilityNotes: [],
    };
    const errors = validateSkeletonResponse(BASE_INPUT, skeleton);
    expect(errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/outside allowed range/)])
    );
  });

  // --- Invalid phase type ---

  it('detects invalid phase type', () => {
    const skeleton = {
      totalWeeks: 4,
      phases: [makePhase({ type: 'sprint' })],
      feasibilityNotes: [],
    };
    const errors = validateSkeletonResponse(BASE_INPUT, skeleton);
    expect(errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/not a valid phase type/)])
    );
  });

  // --- Multiple errors ---

  it('reports multiple errors at once', () => {
    const skeleton = {
      totalWeeks: 99,
      phases: [makePhase({ weeks: 0, type: 'invalid', targetHoursPerWeek: 100 })],
      feasibilityNotes: [],
    };
    const errors = validateSkeletonResponse(BASE_INPUT, skeleton);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
