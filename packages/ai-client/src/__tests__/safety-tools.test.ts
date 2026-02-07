/**
 * Safety Tools Tests
 */

import { describe, expect, it } from '@jest/globals';
import {
  checkConstraintCompatibility,
  checkFatigueLevel,
  checkTrainingReadiness,
} from '../tools/safety-tools.js';
import type {
  AthleteProfile,
  CoachingContext,
  DailyCheckIn,
  FitnessMetrics,
  InjuryConstraint,
} from '../types.js';

// =============================================================================
// TEST DATA FIXTURES
// =============================================================================

const mockAthlete: AthleteProfile = {
  id: 'athlete-123',
  displayName: 'Test Athlete',
  preferredUnits: 'metric',
  timezone: 'America/New_York',
  intervalsIcuConnected: false,
};

const createCheckIn = (overrides: Partial<DailyCheckIn> = {}): DailyCheckIn => ({
  id: 'checkin-1',
  athleteId: 'athlete-123',
  checkinDate: '2025-01-21',
  ...overrides,
});

const createContext = (overrides: Partial<CoachingContext> = {}): CoachingContext => ({
  athlete: mockAthlete,
  goals: [],
  constraints: [],
  recentActivities: [],
  wellnessHistory: [],
  ...overrides,
});

// =============================================================================
// checkTrainingReadiness TESTS
// =============================================================================

describe('checkTrainingReadiness', () => {
  describe('green light conditions', () => {
    it('should return green readiness for optimal wellness', () => {
      const checkIn = createCheckIn({
        sleepQuality: 8,
        sleepHours: 8,
        energyLevel: 8,
        stressLevel: 3,
        overallSoreness: 2,
        restingHr: 52,
        hrvMs: 65,
      });

      const result = checkTrainingReadiness(checkIn, 52, 60);

      expect(result.readiness).toBe('green');
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.concerns).toHaveLength(0);
    });

    it('should return green readiness for good but not perfect wellness', () => {
      const checkIn = createCheckIn({
        sleepQuality: 7,
        sleepHours: 7,
        energyLevel: 6,
        stressLevel: 5,
        overallSoreness: 4,
      });

      const result = checkTrainingReadiness(checkIn);

      expect(result.readiness).toBe('green');
      expect(result.score).toBeGreaterThanOrEqual(70);
    });
  });

  describe('yellow light conditions', () => {
    it('should return yellow readiness for poor sleep', () => {
      const checkIn = createCheckIn({
        sleepQuality: 5,
        sleepHours: 5.5,
        energyLevel: 5,
      });

      const result = checkTrainingReadiness(checkIn);

      expect(result.readiness).toBe('yellow');
      expect(result.concerns.some((c) => c.toLowerCase().includes('sleep'))).toBe(true);
    });

    it('should flag elevated stress as a concern', () => {
      const checkIn = createCheckIn({
        sleepQuality: 7,
        sleepHours: 7,
        energyLevel: 6,
        stressLevel: 7,
      });

      const result = checkTrainingReadiness(checkIn);

      // Single moderate issue doesn't make it yellow, but it should be flagged
      expect(result.concerns.some((c) => c.toLowerCase().includes('stress'))).toBe(true);
    });

    it('should return yellow for multiple moderate issues', () => {
      const checkIn = createCheckIn({
        sleepQuality: 6,
        sleepHours: 6,
        energyLevel: 5,
        stressLevel: 7,
        overallSoreness: 6,
      });

      const result = checkTrainingReadiness(checkIn);

      expect(result.readiness).toBe('yellow');
    });

    it('should return yellow readiness for slightly elevated HR combined with other issues', () => {
      const checkIn = createCheckIn({
        sleepQuality: 6,
        sleepHours: 6.5,
        energyLevel: 5,
        restingHr: 60,
      });

      const result = checkTrainingReadiness(checkIn, 52, 60);

      expect(result.readiness).toBe('yellow');
      expect(result.concerns.some((c) => c.toLowerCase().includes('hr'))).toBe(true);
    });
  });

  describe('red light conditions', () => {
    it('should return red readiness for severe combined issues', () => {
      // Need significant deductions to get below 40
      // Very low sleep hours: -30, Poor sleep quality: -20, Low energy: -25 = -75
      const checkIn = createCheckIn({
        sleepHours: 4,
        sleepQuality: 3,
        energyLevel: 3,
      });

      const result = checkTrainingReadiness(checkIn);

      expect(result.readiness).toBe('red');
      expect(result.score).toBeLessThan(40);
      expect(result.concerns.some((c) => c.toLowerCase().includes('sleep'))).toBe(true);
    });

    it('should flag very low energy as a concern even in isolation', () => {
      const checkIn = createCheckIn({
        energyLevel: 2,
      });

      const result = checkTrainingReadiness(checkIn);

      // Low energy alone: -25 points = 75, which is still green
      expect(result.concerns.some((c) => c.toLowerCase().includes('energy'))).toBe(true);
    });

    it('should return red for combined severe fatigue indicators', () => {
      const checkIn = createCheckIn({
        energyLevel: 2,
        sleepQuality: 3,
        sleepHours: 4,
        stressLevel: 9,
      });

      const result = checkTrainingReadiness(checkIn);

      expect(result.readiness).toBe('red');
      expect(result.score).toBeLessThan(40);
    });

    it('should flag high soreness as a significant concern', () => {
      const checkIn = createCheckIn({
        overallSoreness: 9,
        sleepQuality: 6,
        energyLevel: 5,
      });

      const result = checkTrainingReadiness(checkIn);

      expect(result.concerns.some((c) => c.toLowerCase().includes('soreness'))).toBe(true);
      // High soreness: -20, combined with other factors
      expect(result.score).toBeLessThan(85);
    });

    it('should flag significantly elevated HR when combined with other issues', () => {
      const checkIn = createCheckIn({
        restingHr: 68,
        sleepQuality: 5,
        energyLevel: 4,
      });

      const result = checkTrainingReadiness(checkIn, 52, 60);

      // Elevated HR: -25, Poor sleep quality: -20, Below normal energy: -10 = -55
      expect(result.concerns.some((c) => c.includes('+16'))).toBe(true);
    });

    it('should flag significantly low HRV when combined with other issues', () => {
      const checkIn = createCheckIn({
        hrvMs: 40,
        sleepQuality: 5,
        energyLevel: 4,
      });

      const result = checkTrainingReadiness(checkIn, 52, 60);

      // Low HRV: -20, Poor sleep quality: -20, Below normal energy: -10 = -50
      expect(result.concerns.some((c) => c.toLowerCase().includes('hrv'))).toBe(true);
    });

    it('should return red for multiple severe issues', () => {
      const checkIn = createCheckIn({
        sleepQuality: 3,
        sleepHours: 4,
        energyLevel: 2,
        stressLevel: 10,
        overallSoreness: 8,
      });

      const result = checkTrainingReadiness(checkIn);

      expect(result.readiness).toBe('red');
      expect(result.concerns.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('recommendations', () => {
    it('should provide recommendations for red status', () => {
      const checkIn = createCheckIn({
        sleepHours: 4,
        energyLevel: 3,
      });

      const result = checkTrainingReadiness(checkIn);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(
        result.recommendations.some(
          (r) => r.toLowerCase().includes('rest') || r.toLowerCase().includes('light')
        )
      ).toBe(true);
    });

    it('should provide recommendations for yellow status', () => {
      const checkIn = createCheckIn({
        sleepHours: 5.5,
        energyLevel: 5,
      });

      const result = checkTrainingReadiness(checkIn);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// checkFatigueLevel TESTS
// =============================================================================

describe('checkFatigueLevel', () => {
  it('should return low fatigue for positive TSB', () => {
    const metrics: FitnessMetrics = {
      date: '2025-01-21',
      ctl: 60,
      atl: 50,
      tsb: 10,
    };

    const result = checkFatigueLevel(metrics);

    expect(result.level).toBe('low');
    expect(result.tsb).toBe(10);
  });

  it('should return moderate fatigue for normal training TSB', () => {
    const metrics: FitnessMetrics = {
      date: '2025-01-21',
      ctl: 65,
      atl: 80,
      tsb: -15,
    };

    const result = checkFatigueLevel(metrics);

    expect(result.level).toBe('moderate');
    expect(result.recommendations.some((r) => r.toLowerCase().includes('maintain'))).toBe(true);
  });

  it('should return high fatigue for TSB below -25', () => {
    const metrics: FitnessMetrics = {
      date: '2025-01-21',
      ctl: 70,
      atl: 100,
      tsb: -30,
    };

    const result = checkFatigueLevel(metrics);

    expect(result.level).toBe('high');
    expect(result.concerns.length).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.toLowerCase().includes('reduce'))).toBe(true);
  });

  it('should return critical fatigue for TSB below -40', () => {
    const metrics: FitnessMetrics = {
      date: '2025-01-21',
      ctl: 75,
      atl: 120,
      tsb: -45,
    };

    const result = checkFatigueLevel(metrics);

    expect(result.level).toBe('critical');
    expect(result.concerns.some((c) => c.toLowerCase().includes('extremely'))).toBe(true);
    expect(
      result.recommendations.some(
        (r) => r.toLowerCase().includes('rest') || r.toLowerCase().includes('mandatory')
      )
    ).toBe(true);
  });

  it('should warn about high ramp rate', () => {
    const metrics: FitnessMetrics = {
      date: '2025-01-21',
      ctl: 65,
      atl: 75,
      tsb: -10,
      rampRate: 10,
    };

    const result = checkFatigueLevel(metrics);

    expect(result.concerns.some((c) => c.toLowerCase().includes('ramp rate'))).toBe(true);
    expect(result.recommendations.some((r) => r.toLowerCase().includes('slow down'))).toBe(true);
  });

  it('should note fitness loss risk for very high TSB', () => {
    const metrics: FitnessMetrics = {
      date: '2025-01-21',
      ctl: 50,
      atl: 35,
      tsb: 15,
    };

    const result = checkFatigueLevel(metrics);

    expect(result.level).toBe('low');
    expect(result.concerns.some((c) => c.toLowerCase().includes('losing fitness'))).toBe(true);
  });
});

// =============================================================================
// checkConstraintCompatibility TESTS
// =============================================================================

describe('checkConstraintCompatibility', () => {
  describe('time constraints', () => {
    it('should flag workout exceeding available time', () => {
      const context = createContext({
        checkIn: createCheckIn({ availableTimeMinutes: 60 }),
      });

      const result = checkConstraintCompatibility(
        {
          sport: 'bike',
          durationMinutes: 90,
          intensity: 'moderate',
        },
        context
      );

      expect(result.compatible).toBe(false);
      expect(result.issues.some((i) => i.toLowerCase().includes('time'))).toBe(true);
      expect(result.modifications.some((m) => m.includes('60'))).toBe(true);
    });

    it('should be compatible when time is sufficient', () => {
      const context = createContext({
        checkIn: createCheckIn({ availableTimeMinutes: 90 }),
      });

      const result = checkConstraintCompatibility(
        {
          sport: 'run',
          durationMinutes: 60,
          intensity: 'easy',
        },
        context
      );

      expect(result.compatible).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('injury constraints', () => {
    it('should flag workout for restricted sport', () => {
      const injury: InjuryConstraint = {
        id: 'injury-1',
        athleteId: 'athlete-123',
        constraintType: 'injury',
        title: 'Knee injury',
        startDate: '2025-01-01',
        status: 'active',
        injuryRestrictions: ['run', 'high_impact'],
      };

      const context = createContext({
        constraints: [injury],
      });

      const result = checkConstraintCompatibility(
        {
          sport: 'run',
          durationMinutes: 45,
          intensity: 'easy',
        },
        context
      );

      expect(result.compatible).toBe(false);
      expect(result.issues.some((i) => i.toLowerCase().includes('restricted'))).toBe(true);
    });

    it('should flag high intensity with intensity restriction', () => {
      const injury: InjuryConstraint = {
        id: 'injury-1',
        athleteId: 'athlete-123',
        constraintType: 'injury',
        title: 'Back strain',
        startDate: '2025-01-01',
        status: 'active',
        injuryRestrictions: ['high_intensity'],
      };

      const context = createContext({
        constraints: [injury],
      });

      const result = checkConstraintCompatibility(
        {
          sport: 'bike',
          durationMinutes: 60,
          intensity: 'threshold',
        },
        context
      );

      expect(result.compatible).toBe(false);
      expect(result.modifications.some((m) => m.toLowerCase().includes('reduce intensity'))).toBe(
        true
      );
    });

    it('should flag running with impact restriction', () => {
      const injury: InjuryConstraint = {
        id: 'injury-1',
        athleteId: 'athlete-123',
        constraintType: 'injury',
        title: 'Stress fracture',
        startDate: '2025-01-01',
        status: 'active',
        injuryRestrictions: ['impact'],
      };

      const context = createContext({
        constraints: [injury],
      });

      const result = checkConstraintCompatibility(
        {
          sport: 'run',
          durationMinutes: 30,
          intensity: 'easy',
        },
        context
      );

      expect(result.compatible).toBe(false);
      expect(
        result.modifications.some(
          (m) => m.toLowerCase().includes('swim') || m.toLowerCase().includes('cycling')
        )
      ).toBe(true);
    });

    it("should be compatible when injury doesn't restrict sport", () => {
      const injury: InjuryConstraint = {
        id: 'injury-1',
        athleteId: 'athlete-123',
        constraintType: 'injury',
        title: 'Shoulder injury',
        startDate: '2025-01-01',
        status: 'active',
        injuryRestrictions: ['swim'],
      };

      const context = createContext({
        constraints: [injury],
      });

      const result = checkConstraintCompatibility(
        {
          sport: 'run',
          durationMinutes: 45,
          intensity: 'moderate',
        },
        context
      );

      expect(result.compatible).toBe(true);
    });
  });

  describe('travel constraints', () => {
    it('should flag swim when traveling without pool', () => {
      const context = createContext({
        checkIn: createCheckIn({
          travelStatus: 'traveling',
          equipmentAccess: ['running_shoes'],
        }),
      });

      const result = checkConstraintCompatibility(
        {
          sport: 'swim',
          durationMinutes: 45,
          intensity: 'moderate',
        },
        context
      );

      expect(result.compatible).toBe(false);
      expect(result.issues.some((i) => i.toLowerCase().includes('pool'))).toBe(true);
    });

    it('should flag bike when traveling without bike', () => {
      const context = createContext({
        checkIn: createCheckIn({
          travelStatus: 'traveling',
          equipmentAccess: ['running_shoes', 'gym'],
        }),
      });

      const result = checkConstraintCompatibility(
        {
          sport: 'bike',
          durationMinutes: 60,
          intensity: 'easy',
        },
        context
      );

      expect(result.compatible).toBe(false);
      expect(result.issues.some((i) => i.toLowerCase().includes('bike'))).toBe(true);
    });
  });

  describe('equipment access', () => {
    it('should be compatible when equipment is available', () => {
      const context = createContext({
        checkIn: createCheckIn({
          travelStatus: 'home',
          equipmentAccess: ['bike_trainer', 'pool'],
        }),
      });

      const result = checkConstraintCompatibility(
        {
          sport: 'bike',
          durationMinutes: 90,
          intensity: 'threshold',
        },
        context
      );

      expect(result.compatible).toBe(true);
    });
  });
});
