import {
  AVAILABLE_TIME_VALUES,
  BODY_AREAS,
  DAILY_CONSTRAINT_TYPES,
  TRAVEL_STATUSES,
  isAvailableTimeMinutes,
  isBodyArea,
  isDailyConstraintType,
  isTravelStatus,
} from '../index.js';

describe('wellness type guards', () => {
  describe('isBodyArea', () => {
    it.each([...BODY_AREAS])('returns true for valid body area "%s"', (area) => {
      expect(isBodyArea(area)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isBodyArea('head')).toBe(false);
      expect(isBodyArea('')).toBe(false);
      expect(isBodyArea('LEGS')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isBodyArea(123)).toBe(false);
      expect(isBodyArea(null)).toBe(false);
      expect(isBodyArea(undefined)).toBe(false);
      expect(isBodyArea(true)).toBe(false);
    });
  });

  describe('isTravelStatus', () => {
    it.each([...TRAVEL_STATUSES])('returns true for valid travel status "%s"', (status) => {
      expect(isTravelStatus(status)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isTravelStatus('flying')).toBe(false);
      expect(isTravelStatus('')).toBe(false);
      expect(isTravelStatus('HOME')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isTravelStatus(42)).toBe(false);
      expect(isTravelStatus(null)).toBe(false);
      expect(isTravelStatus(undefined)).toBe(false);
    });
  });
});

describe('time type guards', () => {
  describe('isAvailableTimeMinutes', () => {
    it.each([...AVAILABLE_TIME_VALUES])('returns true for valid time value %d', (value) => {
      expect(isAvailableTimeMinutes(value)).toBe(true);
    });

    it('returns false for invalid numbers', () => {
      expect(isAvailableTimeMinutes(0)).toBe(false);
      expect(isAvailableTimeMinutes(10)).toBe(false);
      expect(isAvailableTimeMinutes(25)).toBe(false);
      expect(isAvailableTimeMinutes(-1)).toBe(false);
      expect(isAvailableTimeMinutes(Number.NaN)).toBe(false);
      expect(isAvailableTimeMinutes(Number.POSITIVE_INFINITY)).toBe(false);
    });

    it('returns false for non-number values', () => {
      expect(isAvailableTimeMinutes('15')).toBe(false);
      expect(isAvailableTimeMinutes(null)).toBe(false);
      expect(isAvailableTimeMinutes(undefined)).toBe(false);
    });
  });
});

describe('constraint type guards', () => {
  describe('isDailyConstraintType', () => {
    it.each([...DAILY_CONSTRAINT_TYPES])('returns true for valid constraint type "%s"', (type) => {
      expect(isDailyConstraintType(type)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isDailyConstraintType('invalid')).toBe(false);
      expect(isDailyConstraintType('')).toBe(false);
      expect(isDailyConstraintType('TRAVELING')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isDailyConstraintType(123)).toBe(false);
      expect(isDailyConstraintType(null)).toBe(false);
      expect(isDailyConstraintType(undefined)).toBe(false);
    });
  });
});
