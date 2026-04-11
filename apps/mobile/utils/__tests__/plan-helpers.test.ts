import {
  flattenDayPreferences,
  formatWorkoutDuration,
  getComplianceIcon,
  getSportIcon,
  unflattenDayPreferences,
} from '../plan-helpers';

describe('flattenDayPreferences', () => {
  it('returns an empty list for an empty per-day grid', () => {
    expect(flattenDayPreferences([[], [], [], [], [], [], []])).toEqual([]);
  });

  it('passes UI dayIndex through unchanged (Mon=0 convention)', () => {
    const grid = [
      [{ sport: 'run' }], // Mon → 0
      [], // Tue
      [], // Wed
      [], // Thu
      [{ sport: 'bike', workoutLabel: 'Long Ride' }], // Fri → 4
      [], // Sat
      [{ sport: 'swim' }], // Sun → 6
    ];
    expect(flattenDayPreferences(grid)).toEqual([
      { dayOfWeek: 0, sport: 'run', workoutLabel: undefined },
      { dayOfWeek: 4, sport: 'bike', workoutLabel: 'Long Ride' },
      { dayOfWeek: 6, sport: 'swim', workoutLabel: undefined },
    ]);
  });

  it('accepts multiple chips on the same day', () => {
    const grid: { sport: string; workoutLabel?: string }[][] = [
      [{ sport: 'bike' }, { sport: 'run', workoutLabel: 'Brick' }],
      [],
      [],
      [],
      [],
      [],
      [],
    ];
    const result = flattenDayPreferences(grid);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ dayOfWeek: 0, sport: 'bike' });
    expect(result[1]).toMatchObject({ dayOfWeek: 0, sport: 'run', workoutLabel: 'Brick' });
  });

  it('normalizes sport casing', () => {
    expect(flattenDayPreferences([[{ sport: 'BIKE' }], [], [], [], [], [], []])).toEqual([
      { dayOfWeek: 0, sport: 'bike', workoutLabel: undefined },
    ]);
  });

  it('silently drops chips whose sport is not a valid Sport', () => {
    const grid = [[{ sport: 'yoga' }, { sport: 'run' }], [], [], [], [], [], []];
    expect(flattenDayPreferences(grid)).toEqual([
      { dayOfWeek: 0, sport: 'run', workoutLabel: undefined },
    ]);
  });
});

describe('unflattenDayPreferences', () => {
  it('returns a 7-element array of empty arrays for empty input', () => {
    const result = unflattenDayPreferences([]);
    expect(result).toHaveLength(7);
    for (const day of result) {
      expect(day).toEqual([]);
    }
  });

  it('places preferences into the correct day slot', () => {
    const result = unflattenDayPreferences([
      { dayOfWeek: 0, sport: 'run' },
      { dayOfWeek: 4, sport: 'bike', workoutLabel: 'Long Ride' },
      { dayOfWeek: 6, sport: 'swim' },
    ]);
    expect(result[0]).toEqual([{ sport: 'Run', workoutLabel: undefined }]);
    expect(result[4]).toEqual([{ sport: 'Bike', workoutLabel: 'Long Ride' }]);
    expect(result[6]).toEqual([{ sport: 'Swim', workoutLabel: undefined }]);
    // Other days remain empty
    expect(result[1]).toEqual([]);
    expect(result[2]).toEqual([]);
    expect(result[3]).toEqual([]);
    expect(result[5]).toEqual([]);
  });

  it('capitalizes the sport name', () => {
    const result = unflattenDayPreferences([{ dayOfWeek: 2, sport: 'bike' }]);
    expect(result[2][0].sport).toBe('Bike');
  });

  it('handles multiple preferences on the same day', () => {
    const result = unflattenDayPreferences([
      { dayOfWeek: 0, sport: 'bike' },
      { dayOfWeek: 0, sport: 'run', workoutLabel: 'Brick' },
    ]);
    expect(result[0]).toHaveLength(2);
    expect(result[0][0]).toEqual({ sport: 'Bike', workoutLabel: undefined });
    expect(result[0][1]).toEqual({ sport: 'Run', workoutLabel: 'Brick' });
  });

  it('ignores entries with dayOfWeek outside 0–6', () => {
    const result = unflattenDayPreferences([
      { dayOfWeek: -1 as never, sport: 'run' },
      { dayOfWeek: 7 as never, sport: 'bike' },
      { dayOfWeek: 3, sport: 'swim' },
    ]);
    expect(result[3]).toEqual([{ sport: 'Swim', workoutLabel: undefined }]);
    // All other days empty
    const totalEntries = result.reduce((sum, day) => sum + day.length, 0);
    expect(totalEntries).toBe(1);
  });

  it('round-trips with flattenDayPreferences', () => {
    const original = [
      { dayOfWeek: 0 as const, sport: 'run' as const },
      { dayOfWeek: 4 as const, sport: 'bike' as const, workoutLabel: 'Long Ride' },
      { dayOfWeek: 6 as const, sport: 'swim' as const },
    ];
    const unflattened = unflattenDayPreferences(original);
    const reflattened = flattenDayPreferences(unflattened);
    expect(reflattened).toEqual(original);
  });
});

describe('formatWorkoutDuration', () => {
  it('formats minutes under 60 as Nm', () => {
    expect(formatWorkoutDuration(45)).toBe('45m');
    expect(formatWorkoutDuration(0)).toBe('0m');
  });

  it('formats exact hours without minutes', () => {
    expect(formatWorkoutDuration(60)).toBe('1h');
    expect(formatWorkoutDuration(120)).toBe('2h');
  });

  it('formats hours and minutes', () => {
    expect(formatWorkoutDuration(90)).toBe('1h 30m');
    expect(formatWorkoutDuration(68)).toBe('1h 8m');
  });
});

describe('getSportIcon', () => {
  it('returns correct icons for known sports', () => {
    expect(getSportIcon('swim')).toBe('water');
    expect(getSportIcon('bike')).toBe('bicycle');
    expect(getSportIcon('run')).toBe('footsteps');
    expect(getSportIcon('strength')).toBe('barbell');
    expect(getSportIcon('rest')).toBe('bed');
  });

  it('returns fitness for unknown sports', () => {
    expect(getSportIcon('yoga')).toBe('fitness');
    expect(getSportIcon('')).toBe('fitness');
  });
});

describe('getComplianceIcon', () => {
  const mockColors = {
    success: '#2e7d32',
    error: '#c62828',
  } as Parameters<typeof getComplianceIcon>[1];

  it('returns success icon for completed workouts', () => {
    const result = getComplianceIcon(
      { completed_at: '2026-01-05T12:00:00Z', date: '2026-01-05' },
      mockColors
    );
    expect(result).toEqual({ name: 'checkmark-circle', color: '#2e7d32' });
  });

  it('returns error icon for past uncompleted workouts', () => {
    const result = getComplianceIcon({ completed_at: null, date: '2020-01-01' }, mockColors);
    expect(result).toEqual({ name: 'close-circle', color: '#c62828' });
  });

  it('returns null for future workouts', () => {
    const result = getComplianceIcon({ completed_at: null, date: '2099-12-31' }, mockColors);
    expect(result).toBeNull();
  });
});
