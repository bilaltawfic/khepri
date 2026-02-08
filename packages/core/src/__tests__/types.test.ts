import {
  AVAILABLE_TIME_VALUES,
  BODY_AREAS,
  DAILY_CONSTRAINT_TYPES,
  TRAVEL_STATUSES,
  isAvailableTimeMinutes,
  isBodyArea,
  isDailyConstraintType,
  isTravelStatus,
} from '../types/index.js';

describe('wellness type guards', () => {
  describe('isBodyArea', () => {
    it.each(BODY_AREAS)('returns true for valid body area "%s"', (area) => {
      expect(isBodyArea(area)).toBe(true);
    });

    it('returns false for invalid body area', () => {
      expect(isBodyArea('head')).toBe(false);
      expect(isBodyArea('')).toBe(false);
      expect(isBodyArea('LEGS')).toBe(false);
    });
  });

  describe('isTravelStatus', () => {
    it.each(TRAVEL_STATUSES)('returns true for valid travel status "%s"', (status) => {
      expect(isTravelStatus(status)).toBe(true);
    });

    it('returns false for invalid travel status', () => {
      expect(isTravelStatus('flying')).toBe(false);
      expect(isTravelStatus('')).toBe(false);
      expect(isTravelStatus('HOME')).toBe(false);
    });
  });
});

describe('time type guards', () => {
  describe('isAvailableTimeMinutes', () => {
    it.each(AVAILABLE_TIME_VALUES)('returns true for valid time value %d', (value) => {
      expect(isAvailableTimeMinutes(value)).toBe(true);
    });

    it('returns false for invalid time values', () => {
      expect(isAvailableTimeMinutes(0)).toBe(false);
      expect(isAvailableTimeMinutes(10)).toBe(false);
      expect(isAvailableTimeMinutes(25)).toBe(false);
      expect(isAvailableTimeMinutes(-1)).toBe(false);
    });
  });
});

describe('constraint type guards', () => {
  describe('isDailyConstraintType', () => {
    it.each(DAILY_CONSTRAINT_TYPES)('returns true for valid constraint type "%s"', (type) => {
      expect(isDailyConstraintType(type)).toBe(true);
    });

    it('returns false for invalid constraint types', () => {
      expect(isDailyConstraintType('invalid')).toBe(false);
      expect(isDailyConstraintType('')).toBe(false);
      expect(isDailyConstraintType('TRAVELING')).toBe(false);
    });
  });
});
