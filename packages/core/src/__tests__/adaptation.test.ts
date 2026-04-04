import {
  ADAPTATION_STATUSES,
  ADAPTATION_TRIGGERS,
  COMPLIANCE_COLORS,
  isAdaptationStatus,
  isAdaptationTrigger,
  isComplianceColor,
} from '../index.js';

describe('adaptation type guards', () => {
  describe('isAdaptationTrigger', () => {
    it.each([...ADAPTATION_TRIGGERS])('returns true for valid trigger "%s"', (trigger) => {
      expect(isAdaptationTrigger(trigger)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isAdaptationTrigger('manual')).toBe(false);
      expect(isAdaptationTrigger('')).toBe(false);
      expect(isAdaptationTrigger('COACH_SUGGESTION')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isAdaptationTrigger(123)).toBe(false);
      expect(isAdaptationTrigger(null)).toBe(false);
      expect(isAdaptationTrigger(undefined)).toBe(false);
      expect(isAdaptationTrigger(true)).toBe(false);
      expect(isAdaptationTrigger(0)).toBe(false);
      expect(isAdaptationTrigger({})).toBe(false);
    });
  });

  describe('isAdaptationStatus', () => {
    it.each([...ADAPTATION_STATUSES])('returns true for valid status "%s"', (status) => {
      expect(isAdaptationStatus(status)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isAdaptationStatus('pending')).toBe(false);
      expect(isAdaptationStatus('')).toBe(false);
      expect(isAdaptationStatus('SUGGESTED')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isAdaptationStatus(123)).toBe(false);
      expect(isAdaptationStatus(null)).toBe(false);
      expect(isAdaptationStatus(undefined)).toBe(false);
      expect(isAdaptationStatus(true)).toBe(false);
      expect(isAdaptationStatus(0)).toBe(false);
      expect(isAdaptationStatus({})).toBe(false);
    });
  });

  describe('isComplianceColor', () => {
    it.each([...COMPLIANCE_COLORS])('returns true for valid color "%s"', (color) => {
      expect(isComplianceColor(color)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isComplianceColor('yellow')).toBe(false);
      expect(isComplianceColor('')).toBe(false);
      expect(isComplianceColor('GREEN')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isComplianceColor(123)).toBe(false);
      expect(isComplianceColor(null)).toBe(false);
      expect(isComplianceColor(undefined)).toBe(false);
      expect(isComplianceColor(true)).toBe(false);
      expect(isComplianceColor(0)).toBe(false);
      expect(isComplianceColor({})).toBe(false);
    });
  });
});
