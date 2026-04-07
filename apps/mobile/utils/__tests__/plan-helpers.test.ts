import {
  flattenDayPreferences,
  formatWorkoutDuration,
  getComplianceIcon,
  getSportIcon,
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
