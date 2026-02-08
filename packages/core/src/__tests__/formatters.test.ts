import { formatDate, formatDateRange, formatDuration, formatMinutes, getToday } from '../index.js';

describe('formatDate', () => {
  it('formats a date correctly', () => {
    const date = new Date('2024-06-15T12:00:00Z');
    expect(formatDate(date)).toMatch(/Jun 15, 2024/);
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
    const start = new Date('2024-06-15T12:00:00Z');
    const end = new Date('2024-07-15T12:00:00Z');
    const result = formatDateRange(start, end);
    expect(result).toMatch(/Jun 15, 2024/);
    expect(result).toMatch(/Jul 15, 2024/);
    expect(result).toContain(' - ');
  });

  it('formats a date range without end date as Ongoing', () => {
    const start = new Date('2024-06-15T12:00:00Z');
    const result = formatDateRange(start);
    expect(result).toMatch(/Jun 15, 2024/);
    expect(result).toContain(' - Ongoing');
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

  it('returns empty string for undefined', () => {
    expect(formatDuration(undefined)).toBe('');
  });

  it('returns empty string for null', () => {
    expect(formatDuration(null as unknown as undefined)).toBe('');
  });

  it('returns empty string for negative', () => {
    expect(formatDuration(-1)).toBe('');
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
