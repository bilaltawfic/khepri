import { formatWorkoutDuration, getComplianceIcon, getSportIcon } from '../plan-helpers';

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
