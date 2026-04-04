import { BLOCK_STATUSES, SEASON_STATUSES, isBlockStatus, isSeasonStatus } from '../index.js';

describe('season type guards', () => {
  describe('isSeasonStatus', () => {
    it.each([...SEASON_STATUSES])('returns true for valid season status "%s"', (status) => {
      expect(isSeasonStatus(status)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isSeasonStatus('paused')).toBe(false);
      expect(isSeasonStatus('')).toBe(false);
      expect(isSeasonStatus('ACTIVE')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isSeasonStatus(123)).toBe(false);
      expect(isSeasonStatus(null)).toBe(false);
      expect(isSeasonStatus(undefined)).toBe(false);
      expect(isSeasonStatus(true)).toBe(false);
      expect(isSeasonStatus(0)).toBe(false);
      expect(isSeasonStatus({})).toBe(false);
    });
  });

  describe('isBlockStatus', () => {
    it.each([...BLOCK_STATUSES])('returns true for valid block status "%s"', (status) => {
      expect(isBlockStatus(status)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isBlockStatus('active')).toBe(false);
      expect(isBlockStatus('')).toBe(false);
      expect(isBlockStatus('DRAFT')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isBlockStatus(123)).toBe(false);
      expect(isBlockStatus(null)).toBe(false);
      expect(isBlockStatus(undefined)).toBe(false);
      expect(isBlockStatus(true)).toBe(false);
      expect(isBlockStatus(0)).toBe(false);
      expect(isBlockStatus({})).toBe(false);
    });
  });
});
