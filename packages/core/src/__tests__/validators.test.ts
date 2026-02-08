import { isInRange, isValidISODate, isValidWellnessMetric } from '../index.js';

describe('isInRange', () => {
  it('returns true for values within range', () => {
    expect(isInRange(5, 1, 10)).toBe(true);
    expect(isInRange(1, 1, 10)).toBe(true);
    expect(isInRange(10, 1, 10)).toBe(true);
  });

  it('returns false for values outside range', () => {
    expect(isInRange(0, 1, 10)).toBe(false);
    expect(isInRange(11, 1, 10)).toBe(false);
  });

  it('returns false for NaN and Infinity', () => {
    expect(isInRange(Number.NaN, 1, 10)).toBe(false);
    expect(isInRange(Number.POSITIVE_INFINITY, 1, 10)).toBe(false);
    expect(isInRange(Number.NEGATIVE_INFINITY, 1, 10)).toBe(false);
  });
});

describe('isValidWellnessMetric', () => {
  it('returns true for valid wellness values (1-10)', () => {
    expect(isValidWellnessMetric(1)).toBe(true);
    expect(isValidWellnessMetric(5)).toBe(true);
    expect(isValidWellnessMetric(10)).toBe(true);
  });

  it('returns false for out-of-range numbers', () => {
    expect(isValidWellnessMetric(0)).toBe(false);
    expect(isValidWellnessMetric(11)).toBe(false);
    expect(isValidWellnessMetric(-1)).toBe(false);
  });

  it('returns false for non-number values', () => {
    expect(isValidWellnessMetric('5')).toBe(false);
    expect(isValidWellnessMetric(null)).toBe(false);
    expect(isValidWellnessMetric(undefined)).toBe(false);
  });

  it('returns false for NaN', () => {
    expect(isValidWellnessMetric(Number.NaN)).toBe(false);
  });
});

describe('isValidISODate', () => {
  it('returns true for valid ISO dates', () => {
    expect(isValidISODate('2024-06-15')).toBe(true);
    expect(isValidISODate('2024-01-01')).toBe(true);
    expect(isValidISODate('2024-12-31')).toBe(true);
  });

  it('returns false for invalid date strings', () => {
    expect(isValidISODate('2024-13-01')).toBe(false);
    expect(isValidISODate('2024-02-30')).toBe(false);
    expect(isValidISODate('not-a-date')).toBe(false);
    expect(isValidISODate('')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isValidISODate(123)).toBe(false);
    expect(isValidISODate(null)).toBe(false);
    expect(isValidISODate(undefined)).toBe(false);
  });

  it('returns false for wrong format', () => {
    expect(isValidISODate('06/15/2024')).toBe(false);
    expect(isValidISODate('2024-6-15')).toBe(false);
    expect(isValidISODate('2024-06-15T12:00:00Z')).toBe(false);
  });
});
