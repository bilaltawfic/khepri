import { describe, expect, it } from '@jest/globals';
import {
  calculatePhaseBreakdown,
  calculateWeeklyVolumes,
  generatePeriodizationPlan,
  getIntensityDistribution,
  getTrainingFocus,
} from './periodization.js';

describe('periodization', () => {
  describe('getIntensityDistribution', () => {
    it('returns correct distribution for base phase', () => {
      expect(getIntensityDistribution('base')).toEqual([80, 15, 5]);
    });

    it('returns correct distribution for build phase', () => {
      expect(getIntensityDistribution('build')).toEqual([70, 20, 10]);
    });

    it('distributions sum to 100', () => {
      const phases = ['base', 'build', 'peak', 'taper', 'recovery'] as const;
      for (const phase of phases) {
        const dist = getIntensityDistribution(phase);
        const sum = dist[0] + dist[1] + dist[2];
        expect(sum).toBe(100);
      }
    });
  });

  describe('getTrainingFocus', () => {
    it('returns correct focus for base phase', () => {
      expect(getTrainingFocus('base')).toBe('aerobic_endurance');
    });

    it('returns correct focus for build phase', () => {
      expect(getTrainingFocus('build')).toBe('threshold_work');
    });

    it('returns correct focus for peak phase', () => {
      expect(getTrainingFocus('peak')).toBe('race_specific');
    });

    it('returns recovery focus for taper and recovery phases', () => {
      expect(getTrainingFocus('taper')).toBe('recovery');
      expect(getTrainingFocus('recovery')).toBe('recovery');
    });
  });

  describe('calculatePhaseBreakdown', () => {
    it('creates 3 phases for 8-week plan', () => {
      const phases = calculatePhaseBreakdown(8);
      expect(phases).toHaveLength(3);
      expect(phases[0]?.phase).toBe('base');
      expect(phases[1]?.phase).toBe('build');
      expect(phases[2]?.phase).toBe('taper');
    });

    it('creates 4 phases for 12-week plan', () => {
      const phases = calculatePhaseBreakdown(12);
      expect(phases).toHaveLength(4);
      expect(phases[0]?.phase).toBe('base');
      expect(phases[1]?.phase).toBe('build');
      expect(phases[2]?.phase).toBe('peak');
      expect(phases[3]?.phase).toBe('taper');
    });

    it('total weeks match input', () => {
      for (const weeks of [4, 8, 12, 16, 20]) {
        const phases = calculatePhaseBreakdown(weeks);
        const totalWeeks = phases.reduce((sum, p) => sum + p.weeks, 0);
        expect(totalWeeks).toBe(weeks);
      }
    });

    it('throws error for invalid week counts', () => {
      expect(() => calculatePhaseBreakdown(3)).toThrow();
      expect(() => calculatePhaseBreakdown(53)).toThrow();
    });
  });

  describe('calculateWeeklyVolumes', () => {
    it('generates volumes for all weeks', () => {
      const phases = calculatePhaseBreakdown(12);
      const volumes = calculateWeeklyVolumes(phases);
      expect(volumes).toHaveLength(12);
    });

    it('week numbers are sequential', () => {
      const phases = calculatePhaseBreakdown(12);
      const volumes = calculateWeeklyVolumes(phases);
      for (let i = 0; i < volumes.length; i++) {
        expect(volumes[i]?.week).toBe(i + 1);
      }
    });

    it('taper weeks have reduced volume', () => {
      const phases = calculatePhaseBreakdown(12);
      const volumes = calculateWeeklyVolumes(phases);
      const taperVolumes = volumes.filter((v) => v.phase === 'taper');
      for (const tv of taperVolumes) {
        expect(tv.volume_multiplier).toBeLessThan(0.7);
      }
    });

    it('follows 3:1 progression in build phase', () => {
      const phases = calculatePhaseBreakdown(12);
      const volumes = calculateWeeklyVolumes(phases);
      const buildVolumes = volumes.filter((v) => v.phase === 'build');

      // Check that every 4th week is a recovery week (lower volume)
      for (let i = 3; i < buildVolumes.length; i += 4) {
        const recoveryWeek = buildVolumes[i];
        const previousWeek = buildVolumes[i - 1];
        if (recoveryWeek != null && previousWeek != null) {
          expect(recoveryWeek.volume_multiplier).toBeLessThan(previousWeek.volume_multiplier);
        }
      }
    });
  });

  describe('generatePeriodizationPlan', () => {
    it('creates complete plan with phases and volumes', () => {
      const plan = generatePeriodizationPlan(12);
      expect(plan.total_weeks).toBe(12);
      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.weekly_volumes).toHaveLength(12);
    });

    it('plan volumes match phase count', () => {
      const plan = generatePeriodizationPlan(16);
      const phaseWeeks = plan.phases.reduce((sum, p) => sum + p.weeks, 0);
      expect(phaseWeeks).toBe(16);
      expect(plan.weekly_volumes).toHaveLength(16);
    });
  });
});
