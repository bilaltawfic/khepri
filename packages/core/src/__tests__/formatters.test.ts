import {
  formatDate,
  formatDateLocal,
  formatDateRange,
  formatDuration,
  formatMinutes,
  getToday,
  parseDateOnly,
} from '../index.js';

describe('formatDate', () => {
  it('formats a date correctly', () => {
    // Use local time to avoid timezone-dependent date shifts
    const date = new Date(2024, 5, 15, 12);
    expect(formatDate(date)).toBe('Jun 15, 2024');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for no argument', () => {
    expect(formatDate()).toBe('');
  });
});

describe('formatDateRange', () => {
  it('formats a date range with end date', () => {
    const start = new Date(2024, 5, 15, 12);
    const end = new Date(2024, 6, 15, 12);
    const result = formatDateRange(start, end);
    expect(result).toBe('Jun 15, 2024 - Jul 15, 2024');
  });

  it('formats a date range without end date as Ongoing', () => {
    const start = new Date(2024, 5, 15, 12);
    const result = formatDateRange(start);
    expect(result).toBe('Jun 15, 2024 - Ongoing');
  });
});

describe('formatDuration', () => {
  it('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('floors fractional seconds', () => {
    expect(formatDuration(45.7)).toBe('0:45');
  });

  it('returns empty string for undefined', () => {
    expect(formatDuration(undefined)).toBe('');
  });

  it('returns empty string for null', () => {
    expect(formatDuration(null as unknown as undefined)).toBe('');
  });

  it('returns empty string for negative', () => {
    expect(formatDuration(-1)).toBe('');
  });

  it('returns empty string for NaN', () => {
    expect(formatDuration(Number.NaN)).toBe('');
  });

  it('returns empty string for Infinity', () => {
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('');
  });
});

describe('formatMinutes', () => {
  it('formats minutes under 60', () => {
    expect(formatMinutes(15)).toBe('15min');
    expect(formatMinutes(45)).toBe('45min');
  });

  it('formats exact hours', () => {
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(120)).toBe('2h');
  });

  it('formats hours and minutes', () => {
    expect(formatMinutes(90)).toBe('1h 30min');
    expect(formatMinutes(75)).toBe('1h 15min');
  });

  it('formats zero minutes', () => {
    expect(formatMinutes(0)).toBe('0min');
  });
});

describe('getToday', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = getToday();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('parseDateOnly', () => {
  it('parses a valid YYYY-MM-DD date string as local date', () => {
    const date = parseDateOnly('2024-06-15');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(5); // June is month 5 (0-indexed)
    expect(date.getDate()).toBe(15);
  });

  it('handles single-digit months and days', () => {
    const date = parseDateOnly('2024-01-05');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(5);
  });

  it('falls back to Date constructor for invalid format', () => {
    const date = parseDateOnly('invalid-date');
    expect(Number.isNaN(date.getTime())).toBe(true);
  });

  it('falls back to Date constructor for non-numeric parts', () => {
    const date = parseDateOnly('abc-def-ghi');
    expect(Number.isNaN(date.getTime())).toBe(true);
  });

  it('falls back to Date constructor for too few parts', () => {
    const date = parseDateOnly('2024-06');
    // Falls back to Date constructor which parses as UTC midnight; only assert
    // validity - month/day assertions would be timezone-dependent and flaky
    expect(date).toBeInstanceOf(Date);
    expect(Number.isNaN(date.getTime())).toBe(false);
  });
});

describe('formatDateLocal', () => {
  it('formats a date as YYYY-MM-DD in local timezone', () => {
    const date = new Date(2024, 5, 15); // June 15, 2024
    expect(formatDateLocal(date)).toBe('2024-06-15');
  });

  it('pads single-digit months and days', () => {
    const date = new Date(2024, 0, 5); // January 5, 2024
    expect(formatDateLocal(date)).toBe('2024-01-05');
  });

  it('handles end of year correctly', () => {
    const date = new Date(2024, 11, 31); // December 31, 2024
    expect(formatDateLocal(date)).toBe('2024-12-31');
  });
});
