import { describe, expect, it } from '@jest/globals';
import {
  calculateCurrentWeek,
  formatFocusName,
  formatPhaseName,
  getCurrentPhase,
  getCurrentWeekInfo,
  getTodayDayIndex,
} from './week-overview.js';
import type { PeriodizationJson } from './week-overview.js';

describe('week-overview', () => {
  describe('calculateCurrentWeek', () => {
    it('returns 1 for start date matching today', () => {
      expect(calculateCurrentWeek('2026-03-01', '2026-03-01')).toBe(1);
    });

    it('returns 1 within the first 7 days', () => {
      expect(calculateCurrentWeek('2026-03-01', '2026-03-06')).toBe(1);
    });

    it('returns 2 after 7 days', () => {
      expect(calculateCurrentWeek('2026-03-01', '2026-03-08')).toBe(2);
    });

    it('returns 0 when today is before start date', () => {
      expect(calculateCurrentWeek('2026-03-10', '2026-03-01')).toBe(0);
    });

    it('handles week 12 correctly', () => {
      // 12 weeks = 84 days, day 77 (11 full weeks) = start of week 12
      expect(calculateCurrentWeek('2026-01-01', '2026-03-19')).toBe(12);
    });
  });

  describe('getCurrentPhase', () => {
    const periodization: PeriodizationJson = {
      total_weeks: 12,
      phases: [
        { phase: 'base', weeks: 4, focus: 'aerobic_endurance' },
        { phase: 'build', weeks: 4, focus: 'threshold_work' },
        { phase: 'peak', weeks: 3, focus: 'race_specific' },
        { phase: 'taper', weeks: 1, focus: 'recovery' },
      ],
    };

    it('returns base phase for week 1', () => {
      const result = getCurrentPhase(periodization, 1);
      expect(result).toEqual({ name: 'base', focus: 'aerobic_endurance' });
    });

    it('returns base phase for week 4', () => {
      const result = getCurrentPhase(periodization, 4);
      expect(result).toEqual({ name: 'base', focus: 'aerobic_endurance' });
    });

    it('returns build phase for week 5', () => {
      const result = getCurrentPhase(periodization, 5);
      expect(result).toEqual({ name: 'build', focus: 'threshold_work' });
    });

    it('returns taper phase for week 12', () => {
      const result = getCurrentPhase(periodization, 12);
      expect(result).toEqual({ name: 'taper', focus: 'recovery' });
    });

    it('returns null for week beyond total', () => {
      const result = getCurrentPhase(periodization, 13);
      expect(result).toBeNull();
    });
  });

  describe('getTodayDayIndex', () => {
    it('returns 0 for Monday', () => {
      // 2026-03-23 is a Monday
      expect(getTodayDayIndex('2026-03-23')).toBe(0);
    });

    it('returns 6 for Sunday', () => {
      // 2026-03-22 is a Sunday
      expect(getTodayDayIndex('2026-03-22')).toBe(6);
    });

    it('returns 4 for Friday', () => {
      // 2026-03-20 is a Friday
      expect(getTodayDayIndex('2026-03-20')).toBe(4);
    });

    it('returns -1 for invalid date', () => {
      expect(getTodayDayIndex('not-a-date')).toBe(-1);
    });
  });

  describe('formatPhaseName', () => {
    it('capitalizes first letter', () => {
      expect(formatPhaseName('base')).toBe('Base');
    });

    it('handles empty string', () => {
      expect(formatPhaseName('')).toBe('');
    });
  });

  describe('formatFocusName', () => {
    it('replaces underscores with spaces and title-cases', () => {
      expect(formatFocusName('aerobic_endurance')).toBe('Aerobic Endurance');
    });

    it('handles single word', () => {
      expect(formatFocusName('recovery')).toBe('Recovery');
    });

    it('handles three words', () => {
      expect(formatFocusName('high_intensity_training')).toBe('High Intensity Training');
    });
  });

  describe('getCurrentWeekInfo', () => {
    const periodization = {
      total_weeks: 12,
      phases: [
        {
          phase: 'base',
          weeks: 6,
          focus: 'aerobic_endurance',
          intensity_distribution: [80, 15, 5],
        },
        { phase: 'build', weeks: 4, focus: 'threshold_work', intensity_distribution: [70, 20, 10] },
        { phase: 'taper', weeks: 2, focus: 'recovery', intensity_distribution: [90, 5, 5] },
      ],
    };

    const weeklyTemplate = {
      monday: { type: 'rest' },
      tuesday: { type: 'workout', category: 'Run', focus: 'intervals', target_tss: 70 },
      wednesday: { type: 'workout', category: 'Swim', focus: 'endurance', target_tss: 50 },
      thursday: { type: 'workout', category: 'Bike', focus: 'tempo', target_tss: 75 },
      friday: { type: 'rest' },
      saturday: { type: 'workout', category: 'Run', focus: 'long_run', target_tss: 80 },
      sunday: { type: 'workout', category: 'Bike', focus: 'long_ride', target_tss: 120 },
    };

    it('returns info for an active week', () => {
      // Plan starts 2026-03-01, today is 2026-03-15 → week 3
      const result = getCurrentWeekInfo(
        '2026-03-01',
        12,
        periodization,
        weeklyTemplate,
        '2026-03-15'
      );
      expect(result).not.toBeNull();
      expect(result?.currentWeek).toBe(3);
      expect(result?.totalWeeks).toBe(12);
      expect(result?.phaseName).toBe('Base');
      expect(result?.phaseFocus).toBe('Aerobic Endurance');
      expect(result?.dailySlots).toHaveLength(7);
      expect(result?.dailySlots[0].type).toBe('rest'); // Monday rest
      expect(result?.dailySlots[1].category).toBe('Run'); // Tuesday run
    });

    it('returns null when plan has not started', () => {
      const result = getCurrentWeekInfo(
        '2026-04-01',
        12,
        periodization,
        weeklyTemplate,
        '2026-03-15'
      );
      expect(result).toBeNull();
    });

    it('returns null when plan has ended', () => {
      // 12 weeks from 2026-01-01 ends around 2026-03-26
      const result = getCurrentWeekInfo(
        '2026-01-01',
        12,
        periodization,
        weeklyTemplate,
        '2026-06-01'
      );
      expect(result).toBeNull();
    });

    it('handles null weekly template', () => {
      const result = getCurrentWeekInfo('2026-03-01', 12, periodization, null, '2026-03-15');
      expect(result).not.toBeNull();
      expect(result?.dailySlots).toHaveLength(7);
      // All slots default to rest when no template
      for (const slot of result?.dailySlots ?? []) {
        expect(slot.type).toBe('rest');
      }
    });

    it('handles null periodization', () => {
      const result = getCurrentWeekInfo('2026-03-01', 12, null, weeklyTemplate, '2026-03-15');
      expect(result).not.toBeNull();
      expect(result?.phaseName).toBe('Training');
      expect(result?.phaseFocus).toBe('');
    });

    it('handles invalid periodization data', () => {
      const result = getCurrentWeekInfo('2026-03-01', 12, 'invalid', weeklyTemplate, '2026-03-15');
      expect(result).not.toBeNull();
      expect(result?.phaseName).toBe('Training');
    });

    it('highlights today correctly', () => {
      // 2026-03-20 is a Friday (index 4)
      const result = getCurrentWeekInfo(
        '2026-03-01',
        12,
        periodization,
        weeklyTemplate,
        '2026-03-20'
      );
      expect(result).not.toBeNull();
      expect(result?.todayIndex).toBe(4);
    });
  });
});
