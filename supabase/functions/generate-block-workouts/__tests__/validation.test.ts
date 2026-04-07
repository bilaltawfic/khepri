import { validateRequest } from '../validation.ts';

const BASE_REQUEST = {
  block_id: 'block-1',
  season_id: 'season-1',
  athlete_id: 'athlete-1',
  start_date: '2026-01-05',
  end_date: '2026-03-01',
  phases: [{ name: 'Base', weeks: 4, focus: 'base', weeklyHours: 8 }],
  preferences: {
    weeklyHoursMin: 6,
    weeklyHoursMax: 10,
    availableDays: [1, 2, 3, 4, 5],
    sportPriority: ['run', 'bike', 'swim'],
  },
  unavailable_dates: [],
  generation_tier: 'template',
};

describe('validateRequest (P9E-R-05 new optional fields)', () => {
  it('accepts a request with no sport_requirements or day_preferences', () => {
    expect(validateRequest(BASE_REQUEST)).toBeNull();
  });

  it('accepts valid sport_requirements and day_preferences', () => {
    const req = {
      ...BASE_REQUEST,
      sport_requirements: [
        { sport: 'swim', minWeeklySessions: 2, label: 'Swim (min 2/week)' },
        { sport: 'bike', minWeeklySessions: 2 },
        { sport: 'run', minWeeklySessions: 3 },
      ],
      day_preferences: [
        { dayOfWeek: 5, sport: 'bike', workoutLabel: 'Long Ride' },
        { dayOfWeek: 0, sport: 'run' },
      ],
    };
    expect(validateRequest(req)).toBeNull();
  });

  it('rejects sport_requirements that is not an array', () => {
    const req = { ...BASE_REQUEST, sport_requirements: 'not-an-array' };
    expect(validateRequest(req)).toMatch(/sport_requirements must be an array/);
  });

  it('rejects a sport_requirements entry missing sport', () => {
    const req = { ...BASE_REQUEST, sport_requirements: [{ minWeeklySessions: 2 }] };
    expect(validateRequest(req)).toMatch(/sport/);
  });

  it('rejects a sport_requirements entry with non-numeric minWeeklySessions', () => {
    const req = {
      ...BASE_REQUEST,
      sport_requirements: [{ sport: 'run', minWeeklySessions: 'many' }],
    };
    expect(validateRequest(req)).toMatch(/minWeeklySessions/);
  });

  it('rejects a sport_requirements entry with negative minWeeklySessions', () => {
    const req = {
      ...BASE_REQUEST,
      sport_requirements: [{ sport: 'run', minWeeklySessions: -1 }],
    };
    expect(validateRequest(req)).toMatch(/>= 0/);
  });

  it('rejects day_preferences that is not an array', () => {
    const req = { ...BASE_REQUEST, day_preferences: { dayOfWeek: 1, sport: 'run' } };
    expect(validateRequest(req)).toMatch(/day_preferences must be an array/);
  });

  it('rejects a day_preferences entry with out-of-range dayOfWeek', () => {
    const req = { ...BASE_REQUEST, day_preferences: [{ dayOfWeek: 7, sport: 'run' }] };
    expect(validateRequest(req)).toMatch(/dayOfWeek/);
  });

  it('rejects a day_preferences entry with non-integer dayOfWeek', () => {
    const req = { ...BASE_REQUEST, day_preferences: [{ dayOfWeek: 1.5, sport: 'run' }] };
    expect(validateRequest(req)).toMatch(/dayOfWeek/);
  });

  it('rejects a day_preferences entry missing sport', () => {
    const req = { ...BASE_REQUEST, day_preferences: [{ dayOfWeek: 1 }] };
    expect(validateRequest(req)).toMatch(/sport/);
  });

  it('rejects a day_preferences entry with non-string workoutLabel', () => {
    const req = {
      ...BASE_REQUEST,
      day_preferences: [{ dayOfWeek: 1, sport: 'run', workoutLabel: 42 }],
    };
    expect(validateRequest(req)).toMatch(/workoutLabel/);
  });

  it('still validates existing core fields', () => {
    const req = { ...BASE_REQUEST, start_date: 'not-a-date' };
    expect(validateRequest(req)).toMatch(/start_date/);
  });

  it('rejects non-object body', () => {
    expect(validateRequest(null)).toMatch(/JSON object/);
    expect(validateRequest('string')).toMatch(/JSON object/);
    expect(validateRequest([])).toMatch(/JSON object/);
  });

  it('validates each core field type', () => {
    expect(validateRequest({ ...BASE_REQUEST, block_id: 1 })).toMatch(/block_id/);
    expect(validateRequest({ ...BASE_REQUEST, season_id: 1 })).toMatch(/season_id/);
    expect(validateRequest({ ...BASE_REQUEST, athlete_id: 1 })).toMatch(/athlete_id/);
    expect(validateRequest({ ...BASE_REQUEST, end_date: 1 })).toMatch(/end_date/);
    expect(validateRequest({ ...BASE_REQUEST, end_date: '2026-02-30' })).toMatch(/end_date/);
    expect(validateRequest({ ...BASE_REQUEST, start_date: 1 })).toMatch(/start_date/);
  });

  it('rejects empty or missing phases', () => {
    expect(validateRequest({ ...BASE_REQUEST, phases: [] })).toMatch(/phases/);
    expect(validateRequest({ ...BASE_REQUEST, phases: 'not-array' })).toMatch(/phases/);
  });

  it('rejects bad preferences shape', () => {
    expect(validateRequest({ ...BASE_REQUEST, preferences: null })).toMatch(/preferences/);
    expect(
      validateRequest({ ...BASE_REQUEST, preferences: { availableDays: 'x', sportPriority: [] } })
    ).toMatch(/availableDays/);
    expect(
      validateRequest({ ...BASE_REQUEST, preferences: { availableDays: [], sportPriority: 'x' } })
    ).toMatch(/sportPriority/);
  });

  it('validates unavailable_dates entries', () => {
    expect(validateRequest({ ...BASE_REQUEST, unavailable_dates: 'not-array' })).toMatch(
      /unavailable_dates must be an array/
    );
    expect(validateRequest({ ...BASE_REQUEST, unavailable_dates: ['not-a-date'] })).toMatch(
      /YYYY-MM-DD/
    );
    expect(validateRequest({ ...BASE_REQUEST, unavailable_dates: [123] })).toMatch(
      /date string or object/
    );
    expect(validateRequest({ ...BASE_REQUEST, unavailable_dates: [{ reason: 'x' }] })).toMatch(
      /must have a date string/
    );
    expect(
      validateRequest({ ...BASE_REQUEST, unavailable_dates: [{ date: '2026-02-30' }] })
    ).toMatch(/YYYY-MM-DD/);
    expect(
      validateRequest({ ...BASE_REQUEST, unavailable_dates: [{ date: '2026-01-05', reason: 1 }] })
    ).toMatch(/reason must be a string/);
  });

  it('accepts valid unavailable_dates in both string and object form', () => {
    expect(
      validateRequest({
        ...BASE_REQUEST,
        unavailable_dates: ['2026-01-05', { date: '2026-01-06', reason: 'travel' }],
      })
    ).toBeNull();
  });

  it('accepts sport_requirements without an optional label', () => {
    const req = {
      ...BASE_REQUEST,
      sport_requirements: [{ sport: 'run', minWeeklySessions: 3 }],
    };
    expect(validateRequest(req)).toBeNull();
  });

  it('rejects sport_requirements with non-string label', () => {
    const req = {
      ...BASE_REQUEST,
      sport_requirements: [{ sport: 'run', minWeeklySessions: 3, label: 42 }],
    };
    expect(validateRequest(req)).toMatch(/label/);
  });

  it('rejects non-object sport_requirements entry', () => {
    expect(validateRequest({ ...BASE_REQUEST, sport_requirements: ['run'] })).toMatch(
      /must be an object/
    );
  });

  it('rejects non-object day_preferences entry', () => {
    expect(validateRequest({ ...BASE_REQUEST, day_preferences: ['run'] })).toMatch(
      /must be an object/
    );
  });
});
