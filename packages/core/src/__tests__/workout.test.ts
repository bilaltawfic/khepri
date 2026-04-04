import {
  INTERVALS_TARGETS,
  SPORTS,
  SYNC_STATUSES,
  WORKOUT_TYPES,
  isIntervalsTarget,
  isSport,
  isSyncStatus,
  isWorkoutType,
} from '../index.js';

describe('workout type guards', () => {
  describe('isSport', () => {
    it.each([...SPORTS])('returns true for valid sport "%s"', (sport) => {
      expect(isSport(sport)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isSport('rowing')).toBe(false);
      expect(isSport('')).toBe(false);
      expect(isSport('SWIM')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isSport(123)).toBe(false);
      expect(isSport(null)).toBe(false);
      expect(isSport(undefined)).toBe(false);
      expect(isSport(true)).toBe(false);
      expect(isSport(0)).toBe(false);
      expect(isSport({})).toBe(false);
    });
  });

  describe('isWorkoutType', () => {
    it.each([...WORKOUT_TYPES])('returns true for valid workout type "%s"', (type) => {
      expect(isWorkoutType(type)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isWorkoutType('sprint')).toBe(false);
      expect(isWorkoutType('')).toBe(false);
      expect(isWorkoutType('INTERVALS')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isWorkoutType(123)).toBe(false);
      expect(isWorkoutType(null)).toBe(false);
      expect(isWorkoutType(undefined)).toBe(false);
      expect(isWorkoutType(true)).toBe(false);
      expect(isWorkoutType(0)).toBe(false);
      expect(isWorkoutType({})).toBe(false);
    });
  });

  describe('isSyncStatus', () => {
    it.each([...SYNC_STATUSES])('returns true for valid sync status "%s"', (status) => {
      expect(isSyncStatus(status)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isSyncStatus('uploading')).toBe(false);
      expect(isSyncStatus('')).toBe(false);
      expect(isSyncStatus('PENDING')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isSyncStatus(123)).toBe(false);
      expect(isSyncStatus(null)).toBe(false);
      expect(isSyncStatus(undefined)).toBe(false);
      expect(isSyncStatus(true)).toBe(false);
      expect(isSyncStatus(0)).toBe(false);
      expect(isSyncStatus({})).toBe(false);
    });
  });

  describe('isIntervalsTarget', () => {
    it.each([...INTERVALS_TARGETS])('returns true for valid intervals target "%s"', (target) => {
      expect(isIntervalsTarget(target)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isIntervalsTarget('RPE')).toBe(false);
      expect(isIntervalsTarget('')).toBe(false);
      expect(isIntervalsTarget('power')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isIntervalsTarget(123)).toBe(false);
      expect(isIntervalsTarget(null)).toBe(false);
      expect(isIntervalsTarget(undefined)).toBe(false);
      expect(isIntervalsTarget(true)).toBe(false);
      expect(isIntervalsTarget(0)).toBe(false);
      expect(isIntervalsTarget({})).toBe(false);
    });
  });
});
