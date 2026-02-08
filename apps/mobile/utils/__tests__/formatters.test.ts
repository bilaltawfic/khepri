import { formatDate, formatDateRange, formatDuration } from '../formatters';

describe('formatDate', () => {
  it('returns empty string for undefined date', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('formats date correctly', () => {
    const date = new Date('2024-06-15');
    const result = formatDate(date);
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formats different months correctly', () => {
    expect(formatDate(new Date('2024-01-01'))).toContain('Jan');
    expect(formatDate(new Date('2024-12-25'))).toContain('Dec');
  });
});

describe('formatDateRange', () => {
  it('formats range with end date', () => {
    const start = new Date('2024-06-15');
    const end = new Date('2024-07-15');
    const result = formatDateRange(start, end);
    expect(result).toContain('Jun');
    expect(result).toContain('Jul');
    expect(result).toContain(' - ');
  });

  it('shows Ongoing when no end date', () => {
    const start = new Date('2024-06-15');
    const result = formatDateRange(start);
    expect(result).toContain('Ongoing');
  });

  it('shows Ongoing when end date is undefined', () => {
    const start = new Date('2024-06-15');
    const result = formatDateRange(start, undefined);
    expect(result).toContain('Ongoing');
  });
});

describe('formatDuration', () => {
  it('returns empty string for undefined seconds', () => {
    expect(formatDuration(undefined)).toBe('');
  });

  it('returns 0:00 for zero seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatDuration(125)).toBe('2:05'); // 2 min 5 sec
    expect(formatDuration(3599)).toBe('59:59'); // 59 min 59 sec
  });

  it('formats hours correctly', () => {
    expect(formatDuration(3600)).toBe('1:00:00'); // 1 hour
    expect(formatDuration(3661)).toBe('1:01:01'); // 1 hour 1 min 1 sec
    expect(formatDuration(7323)).toBe('2:02:03'); // 2 hours 2 min 3 sec
  });

  it('pads minutes and seconds with zeros', () => {
    expect(formatDuration(61)).toBe('1:01');
    expect(formatDuration(3605)).toBe('1:00:05');
  });

  it('handles edge cases', () => {
    expect(formatDuration(1)).toBe('0:01');
    expect(formatDuration(59)).toBe('0:59');
    expect(formatDuration(60)).toBe('1:00');
  });
});
