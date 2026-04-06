import type { UnavailableDate } from '../types/block.js';
import { expandDateRange, groupUnavailableDates } from './date-ranges.js';

describe('expandDateRange', () => {
  it('expands a single day', () => {
    const result = expandDateRange('2026-03-15', '2026-03-15');
    expect(result).toEqual([{ date: '2026-03-15' }]);
  });

  it('expands a multi-day range', () => {
    const result = expandDateRange('2026-03-15', '2026-03-17', 'Vacation');
    expect(result).toEqual([
      { date: '2026-03-15', reason: 'Vacation' },
      { date: '2026-03-16', reason: 'Vacation' },
      { date: '2026-03-17', reason: 'Vacation' },
    ]);
  });

  it('handles month boundary', () => {
    const result = expandDateRange('2026-01-30', '2026-02-02');
    expect(result).toHaveLength(4);
    expect(result[0].date).toBe('2026-01-30');
    expect(result[3].date).toBe('2026-02-02');
  });

  it('returns empty array for invalid dates', () => {
    expect(expandDateRange('bad', '2026-01-01')).toEqual([]);
  });

  it('returns empty array for rolled-over calendar dates', () => {
    expect(expandDateRange('2026-02-30', '2026-02-30')).toEqual([]);
  });

  it('returns empty array when from > to', () => {
    expect(expandDateRange('2026-03-17', '2026-03-15')).toEqual([]);
  });

  it('omits reason when empty string', () => {
    const result = expandDateRange('2026-03-15', '2026-03-15', '');
    expect(result).toEqual([{ date: '2026-03-15' }]);
  });
});

describe('groupUnavailableDates', () => {
  it('returns empty array for empty input', () => {
    expect(groupUnavailableDates([])).toEqual([]);
  });

  it('groups a single date', () => {
    const dates: UnavailableDate[] = [{ date: '2026-03-15' }];
    expect(groupUnavailableDates(dates)).toEqual([
      { startDate: '2026-03-15', endDate: '2026-03-15' },
    ]);
  });

  it('groups consecutive dates with same reason', () => {
    const dates: UnavailableDate[] = [
      { date: '2026-03-15', reason: 'Vacation' },
      { date: '2026-03-16', reason: 'Vacation' },
      { date: '2026-03-17', reason: 'Vacation' },
    ];
    expect(groupUnavailableDates(dates)).toEqual([
      { startDate: '2026-03-15', endDate: '2026-03-17', reason: 'Vacation' },
    ]);
  });

  it('splits groups at reason boundary', () => {
    const dates: UnavailableDate[] = [
      { date: '2026-03-15', reason: 'Vacation' },
      { date: '2026-03-16', reason: 'Work trip' },
    ];
    const groups = groupUnavailableDates(dates);
    expect(groups).toHaveLength(2);
    expect(groups[0].reason).toBe('Vacation');
    expect(groups[1].reason).toBe('Work trip');
  });

  it('splits groups at date gap', () => {
    const dates: UnavailableDate[] = [{ date: '2026-03-15' }, { date: '2026-03-17' }];
    const groups = groupUnavailableDates(dates);
    expect(groups).toHaveLength(2);
  });

  it('sorts unsorted input', () => {
    const dates: UnavailableDate[] = [
      { date: '2026-03-17' },
      { date: '2026-03-15' },
      { date: '2026-03-16' },
    ];
    const groups = groupUnavailableDates(dates);
    expect(groups).toEqual([{ startDate: '2026-03-15', endDate: '2026-03-17' }]);
  });
});
