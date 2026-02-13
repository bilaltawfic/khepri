/**
 * Safety Tools Tests
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  checkConstraintCompatibility,
  checkFatigueLevel,
  checkTrainingReadiness,
  validateTrainingLoad,
  validateWorkoutModification,
} from '../tools/safety-tools.js';
import type { ModificationContext } from '../tools/safety-tools.js';
import type {
  AthleteProfile,
  CoachingContext,
  DailyCheckIn,
  FitnessMetrics,
  InjuryConstraint,
  ProposedWorkout,
  TrainingHistory,
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

// =============================================================================
// validateTrainingLoad TESTS
// =============================================================================

describe('validateTrainingLoad', () => {
  // Use a fixed reference date to avoid timezone/midnight flakiness.
  // All tests run as if "now" is 2026-02-13T12:00:00Z.
  const FIXED_NOW = new Date('2026-02-13T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function daysAgo(n: number): string {
    const d = new Date(FIXED_NOW);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }

  // Base history with well-varied training (includes rest days for low monotony).
  // Uses daysAgo(0)–daysAgo(6) = exactly 7 calendar days [today-6, today].
  const baseHistory: TrainingHistory = {
    activities: [
      { date: daysAgo(0), tss: 40, intensity: 'easy' },
      { date: daysAgo(1), tss: 100, intensity: 'threshold' },
      { date: daysAgo(2), tss: 0, intensity: 'rest' },
      { date: daysAgo(3), tss: 80, intensity: 'moderate' },
      { date: daysAgo(4), tss: 0, intensity: 'rest' },
      { date: daysAgo(5), tss: 90, intensity: 'tempo' },
      { date: daysAgo(6), tss: 0, intensity: 'rest' },
    ],
    fitnessMetrics: {
      date: daysAgo(0),
      ctl: 70,
      atl: 85,
      tsb: -15,
      rampRate: 4,
    },
  };

  describe('risk assessment', () => {
    it('returns low risk for moderate workout with good recovery', () => {
      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'moderate',
        estimatedTSS: 60,
      };

      const result = validateTrainingLoad(workout, baseHistory);

      expect(result.isValid).toBe(true);
      expect(result.risk).toBe('low');
      expect(result.warnings).toHaveLength(0);
      expect(result.recommendations).toContain('Training load is within safe parameters');
    });

    it('returns critical risk when TSB is already very negative', () => {
      const fatigued: TrainingHistory = {
        ...baseHistory,
        fitnessMetrics: {
          ...baseHistory.fitnessMetrics,
          tsb: -35,
          atl: 110,
        },
      };

      const workout: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 90,
        intensity: 'threshold',
        estimatedTSS: 120,
      };

      const result = validateTrainingLoad(workout, fatigued);

      expect(result.isValid).toBe(false);
      expect(result.risk).toBe('critical');
      expect(result.warnings.some((w) => w.type === 'overreaching')).toBe(true);
    });

    it('returns high risk for three or more warnings without danger', () => {
      // Ramp rate warning (9 is in 8-10 band) + monotony warning + consecutive hard days
      const monotonousRampingHistory: TrainingHistory = {
        activities: Array.from({ length: 7 }, (_, i) => ({
          date: daysAgo(i),
          tss: 70,
          intensity: 'moderate',
        })),
        fitnessMetrics: {
          date: daysAgo(0),
          ctl: 70,
          atl: 85,
          tsb: -15,
          rampRate: 9, // warning band
        },
      };

      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'threshold',
        estimatedTSS: 70,
      };

      // consecutiveHardDays=2 triggers a third warning
      const result = validateTrainingLoad(workout, monotonousRampingHistory, 2);

      expect(result.isValid).toBe(true);
      expect(result.risk).toBe('high');
      expect(result.warnings.length).toBeGreaterThanOrEqual(3);
      expect(result.warnings.every((w) => w.severity !== 'danger')).toBe(true);
    });

    it('returns moderate risk for a single warning', () => {
      const rampingHistory: TrainingHistory = {
        ...baseHistory,
        fitnessMetrics: {
          ...baseHistory.fitnessMetrics,
          rampRate: 9,
        },
      };

      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'moderate',
        estimatedTSS: 60,
      };

      const result = validateTrainingLoad(workout, rampingHistory);

      expect(result.isValid).toBe(true);
      expect(result.risk).toBe('moderate');
    });
  });

  describe('ramp rate warnings', () => {
    it('warns about aggressive ramp rate (8-10)', () => {
      const rampingHistory: TrainingHistory = {
        ...baseHistory,
        fitnessMetrics: {
          ...baseHistory.fitnessMetrics,
          rampRate: 9,
        },
      };

      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'moderate',
        estimatedTSS: 60,
      };

      const result = validateTrainingLoad(workout, rampingHistory);

      const rampWarning = result.warnings.find((w) => w.type === 'ramp_rate');
      expect(rampWarning).toBeDefined();
      expect(rampWarning?.severity).toBe('warning');
      expect(rampWarning?.threshold).toBe(8);
      expect(rampWarning?.actual).toBe(9);
    });

    it('returns danger for dangerous ramp rate (>10)', () => {
      const dangerousRamp: TrainingHistory = {
        ...baseHistory,
        fitnessMetrics: {
          ...baseHistory.fitnessMetrics,
          rampRate: 12,
        },
      };

      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'easy',
        estimatedTSS: 40,
      };

      const result = validateTrainingLoad(workout, dangerousRamp);

      const rampWarning = result.warnings.find((w) => w.type === 'ramp_rate');
      expect(rampWarning).toBeDefined();
      expect(rampWarning?.severity).toBe('danger');
    });
  });

  describe('consecutive hard days', () => {
    it('warns about consecutive hard days', () => {
      const workout: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 60,
        intensity: 'threshold',
        estimatedTSS: 100,
      };

      const result = validateTrainingLoad(workout, baseHistory, 2);

      const hardDayWarning = result.warnings.find((w) => w.type === 'consecutive_hard');
      expect(hardDayWarning).toBeDefined();
      expect(hardDayWarning?.severity).toBe('warning');
      expect(hardDayWarning?.actual).toBe(2);
    });

    it('does not warn when consecutive hard days below threshold', () => {
      const workout: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 60,
        intensity: 'threshold',
        estimatedTSS: 100,
      };

      const result = validateTrainingLoad(workout, baseHistory, 1);

      expect(result.warnings.some((w) => w.type === 'consecutive_hard')).toBe(false);
    });
  });

  describe('TSS estimation', () => {
    it('estimates TSS when not provided', () => {
      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 90,
        intensity: 'threshold',
      };

      const result = validateTrainingLoad(workout, baseHistory);

      // Should estimate ~150 TSS (100 base * 90/60)
      expect(result.projectedLoad).toBeDefined();
      expect(result.projectedLoad?.weeklyTSS).toBeGreaterThan(result.currentLoad.weeklyTSS);
    });

    it('uses provided TSS over estimation', () => {
      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 90,
        intensity: 'threshold',
        estimatedTSS: 50,
      };

      const result = validateTrainingLoad(workout, baseHistory);

      // With explicit TSS of 50, projected weekly should be current + 50
      expect(result.projectedLoad?.weeklyTSS).toBe(result.currentLoad.weeklyTSS + 50);
    });

    it('scales TSS by duration for different lengths', () => {
      const shortWorkout: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 30,
        intensity: 'easy',
      };

      const longWorkout: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 120,
        intensity: 'easy',
      };

      const shortResult = validateTrainingLoad(shortWorkout, baseHistory);
      const longResult = validateTrainingLoad(longWorkout, baseHistory);

      // Long workout should add more projected TSS
      expect(longResult.projectedLoad?.weeklyTSS).toBeGreaterThan(
        shortResult.projectedLoad?.weeklyTSS
      );
    });
  });

  describe('monotony detection', () => {
    it('detects high monotony when training lacks variability', () => {
      const monotonousHistory: TrainingHistory = {
        ...baseHistory,
        activities: Array.from({ length: 7 }, (_, i) => ({
          date: daysAgo(i),
          tss: 60,
          intensity: 'moderate',
        })),
      };

      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'moderate',
        estimatedTSS: 60,
      };

      const result = validateTrainingLoad(workout, monotonousHistory);

      expect(result.currentLoad.monotony).toBeGreaterThan(2.0);
      expect(result.warnings.some((w) => w.type === 'monotony')).toBe(true);
    });

    it('does not flag monotony for varied training', () => {
      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'moderate',
        estimatedTSS: 60,
      };

      // baseHistory has varied TSS values (0, 40, 50, 60, 80, 90, 100)
      const result = validateTrainingLoad(workout, baseHistory);

      expect(result.warnings.some((w) => w.type === 'monotony')).toBe(false);
    });
  });

  describe('strain calculation', () => {
    it('detects critical strain with high monotony and high volume', () => {
      const highStrainHistory: TrainingHistory = {
        ...baseHistory,
        activities: Array.from({ length: 7 }, (_, i) => ({
          date: daysAgo(i),
          tss: 150,
          intensity: 'threshold',
        })),
      };

      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'easy',
        estimatedTSS: 40,
      };

      const result = validateTrainingLoad(workout, highStrainHistory);

      // Monotony = 3.0 (all same), weeklyTSS = 1050, strain = 3150 > 2000
      expect(result.currentLoad.strain).toBeGreaterThan(2000);
      expect(result.warnings.some((w) => w.type === 'strain' && w.severity === 'danger')).toBe(
        true
      );
    });

    it('detects when proposed workout pushes projected strain over threshold', () => {
      // Current strain is below threshold but adding a high-TSS workout pushes it over
      const borderlineHistory: TrainingHistory = {
        ...baseHistory,
        activities: [
          // Monotonous moderate training - strain is near but below threshold
          { date: daysAgo(0), tss: 80, intensity: 'moderate' },
          { date: daysAgo(1), tss: 80, intensity: 'moderate' },
          { date: daysAgo(2), tss: 80, intensity: 'moderate' },
          { date: daysAgo(3), tss: 80, intensity: 'moderate' },
          { date: daysAgo(4), tss: 80, intensity: 'moderate' },
          { date: daysAgo(5), tss: 80, intensity: 'moderate' },
        ],
      };

      // Adding another 80 TSS moderate workout increases projected strain
      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'moderate',
        estimatedTSS: 80,
      };

      const result = validateTrainingLoad(workout, borderlineHistory);

      // Projected strain should be higher than current due to added workout
      expect(result.projectedLoad?.strain).toBeGreaterThan(result.currentLoad.strain ?? 0);
    });
  });

  describe('recommendations', () => {
    it('provides safe parameters message for low risk', () => {
      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'moderate',
        estimatedTSS: 60,
      };

      const result = validateTrainingLoad(workout, baseHistory);

      expect(result.recommendations).toContain('Training load is within safe parameters');
    });

    it('provides rest recommendation for critical risk', () => {
      const fatigued: TrainingHistory = {
        ...baseHistory,
        fitnessMetrics: {
          ...baseHistory.fitnessMetrics,
          tsb: -35,
          atl: 110,
        },
      };

      const workout: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 90,
        intensity: 'threshold',
        estimatedTSS: 120,
      };

      const result = validateTrainingLoad(workout, fatigued);

      expect(
        result.recommendations.some(
          (r) => r.toLowerCase().includes('rest') || r.toLowerCase().includes('recovery')
        )
      ).toBe(true);
    });

    it('provides volume reduction recommendation for ramp rate warnings', () => {
      const rampingHistory: TrainingHistory = {
        ...baseHistory,
        fitnessMetrics: {
          ...baseHistory.fitnessMetrics,
          rampRate: 9,
        },
      };

      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'moderate',
        estimatedTSS: 60,
      };

      const result = validateTrainingLoad(workout, rampingHistory);

      expect(result.recommendations.some((r) => r.toLowerCase().includes('reduce'))).toBe(true);
    });

    it('provides variability recommendation for monotony warnings', () => {
      const monotonousHistory: TrainingHistory = {
        ...baseHistory,
        activities: Array.from({ length: 7 }, (_, i) => ({
          date: daysAgo(i),
          tss: 60,
          intensity: 'moderate',
        })),
      };

      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'moderate',
        estimatedTSS: 60,
      };

      const result = validateTrainingLoad(workout, monotonousHistory);

      expect(result.recommendations.some((r) => r.toLowerCase().includes('vary'))).toBe(true);
    });
  });

  describe('load metrics', () => {
    it('calculates current and projected load metrics', () => {
      const workout: ProposedWorkout = {
        sport: 'bike',
        durationMinutes: 60,
        intensity: 'moderate',
        estimatedTSS: 60,
      };

      const result = validateTrainingLoad(workout, baseHistory);

      // Current load should reflect history
      expect(result.currentLoad.ctl).toBe(70);
      expect(result.currentLoad.atl).toBe(85);
      expect(result.currentLoad.tsb).toBe(-15);
      expect(result.currentLoad.rampRate).toBe(4);

      // Projected load should account for proposed workout
      expect(result.projectedLoad).toBeDefined();
      expect(result.projectedLoad?.atl).toBeGreaterThan(result.currentLoad.atl);
      expect(result.projectedLoad?.tsb).toBeLessThan(result.currentLoad.tsb);
    });

    it('handles empty activity history', () => {
      const emptyHistory: TrainingHistory = {
        activities: [],
        fitnessMetrics: {
          date: daysAgo(0),
          ctl: 30,
          atl: 20,
          tsb: 10,
        },
      };

      const workout: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 45,
        intensity: 'easy',
        estimatedTSS: 30,
      };

      const result = validateTrainingLoad(workout, emptyHistory);

      expect(result.currentLoad.weeklyTSS).toBe(0);
      expect(result.currentLoad.monotony).toBe(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('warning structure', () => {
    it('includes required fields in all warnings', () => {
      const fatigued: TrainingHistory = {
        ...baseHistory,
        fitnessMetrics: {
          ...baseHistory.fitnessMetrics,
          tsb: -35,
          atl: 110,
          rampRate: 12,
        },
      };

      const workout: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 90,
        intensity: 'threshold',
        estimatedTSS: 120,
      };

      const result = validateTrainingLoad(workout, fatigued, 3);

      for (const warning of result.warnings) {
        expect(warning.type).toBeDefined();
        expect(warning.severity).toBeDefined();
        expect(warning.message).toBeDefined();
        expect(typeof warning.message).toBe('string');
        expect(warning.message.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// validateWorkoutModification TESTS
// =============================================================================

describe('validateWorkoutModification', () => {
  const baseOriginal: ProposedWorkout = {
    sport: 'run',
    durationMinutes: 60,
    intensity: 'moderate',
    estimatedTSS: 60,
  };

  describe('intensity jump checks', () => {
    it('returns no warning for same intensity', () => {
      const modified: ProposedWorkout = { ...baseOriginal };
      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.warnings.filter((w) => w.type === 'intensity_jump')).toHaveLength(0);
    });

    it('returns no warning for 1-level increase', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'tempo' };
      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.warnings.filter((w) => w.type === 'intensity_jump')).toHaveLength(0);
    });

    it('returns warning for 2-level increase', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'threshold' };
      const result = validateWorkoutModification(baseOriginal, modified);

      const warning = result.warnings.find((w) => w.type === 'intensity_jump');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
      expect(warning?.message).toContain('moderate');
      expect(warning?.message).toContain('threshold');
    });

    it('returns danger for 3+ level increase', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'vo2max' };
      const result = validateWorkoutModification(baseOriginal, modified);

      const warning = result.warnings.find((w) => w.type === 'intensity_jump');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('danger');
    });

    it('returns no warning for intensity decrease', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'recovery' };
      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.warnings.filter((w) => w.type === 'intensity_jump')).toHaveLength(0);
    });

    it('provides step-up recommendation for intensity jump', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'threshold' };
      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.recommendations.some((r) => r.includes('stepping up gradually'))).toBe(true);
    });
  });

  describe('TSS increase checks', () => {
    it('returns no warning for TSS increase at or below 50%', () => {
      const modified: ProposedWorkout = { ...baseOriginal, estimatedTSS: 90 };
      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.warnings.filter((w) => w.type === 'load_increase')).toHaveLength(0);
    });

    it('returns warning for TSS increase between 51-100%', () => {
      const modified: ProposedWorkout = { ...baseOriginal, estimatedTSS: 100 };
      const result = validateWorkoutModification(baseOriginal, modified);

      const warning = result.warnings.find((w) => w.type === 'load_increase');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
    });

    it('returns danger for TSS increase above 100%', () => {
      const modified: ProposedWorkout = { ...baseOriginal, estimatedTSS: 130 };
      const result = validateWorkoutModification(baseOriginal, modified);

      const warning = result.warnings.find((w) => w.type === 'load_increase');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('danger');
    });

    it('returns no warning for TSS decrease', () => {
      const modified: ProposedWorkout = { ...baseOriginal, estimatedTSS: 30 };
      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.warnings.filter((w) => w.type === 'load_increase')).toHaveLength(0);
    });
  });

  describe('duration increase checks', () => {
    it('returns no warning for duration increase at or below 50%', () => {
      const modified: ProposedWorkout = { ...baseOriginal, durationMinutes: 90 };
      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.warnings.filter((w) => w.type === 'duration_increase')).toHaveLength(0);
    });

    it('returns warning for duration increase between 51-100%', () => {
      const modified: ProposedWorkout = { ...baseOriginal, durationMinutes: 100 };
      const result = validateWorkoutModification(baseOriginal, modified);

      const warning = result.warnings.find((w) => w.type === 'duration_increase');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
    });

    it('returns danger for duration increase above 100%', () => {
      const modified: ProposedWorkout = { ...baseOriginal, durationMinutes: 130 };
      const result = validateWorkoutModification(baseOriginal, modified);

      const warning = result.warnings.find((w) => w.type === 'duration_increase');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('danger');
    });
  });

  describe('readiness interaction', () => {
    it('returns danger when red readiness with intensity increase', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'tempo' };
      const context: ModificationContext = {
        readiness: { readiness: 'red', score: 25, concerns: [], recommendations: [] },
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      const warning = result.warnings.find(
        (w) => w.type === 'fatigue_risk' && w.message.includes('RED')
      );
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('danger');
    });

    it('returns warning when yellow readiness with intensity increase', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'tempo' };
      const context: ModificationContext = {
        readiness: { readiness: 'yellow', score: 55, concerns: [], recommendations: [] },
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      const warning = result.warnings.find(
        (w) => w.type === 'fatigue_risk' && w.message.includes('YELLOW')
      );
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
    });

    it('returns no fatigue_risk warning when green readiness with intensity increase', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'tempo' };
      const context: ModificationContext = {
        readiness: { readiness: 'green', score: 85, concerns: [], recommendations: [] },
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      expect(result.warnings.filter((w) => w.type === 'fatigue_risk')).toHaveLength(0);
    });

    it('returns no fatigue_risk warning when red readiness but intensity decreases', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'easy' };
      const context: ModificationContext = {
        readiness: { readiness: 'red', score: 25, concerns: [], recommendations: [] },
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      expect(
        result.warnings.filter((w) => w.type === 'fatigue_risk' && w.message.includes('readiness'))
      ).toHaveLength(0);
    });
  });

  describe('fatigue interaction', () => {
    it('returns danger when critical fatigue with TSS increase', () => {
      const modified: ProposedWorkout = { ...baseOriginal, estimatedTSS: 80 };
      const context: ModificationContext = {
        fatigue: { level: 'critical', tsb: -45, concerns: [], recommendations: [] },
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      const warning = result.warnings.find(
        (w) => w.type === 'fatigue_risk' && w.message.includes('CRITICAL')
      );
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('danger');
    });

    it('returns warning when high fatigue with >25% TSS increase', () => {
      const modified: ProposedWorkout = { ...baseOriginal, estimatedTSS: 80 };
      const context: ModificationContext = {
        fatigue: { level: 'high', tsb: -30, concerns: [], recommendations: [] },
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      const warning = result.warnings.find(
        (w) => w.type === 'fatigue_risk' && w.message.includes('HIGH')
      );
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
    });

    it('returns no fatigue warning when low fatigue with TSS increase', () => {
      const modified: ProposedWorkout = { ...baseOriginal, estimatedTSS: 100 };
      const context: ModificationContext = {
        fatigue: { level: 'low', tsb: 10, concerns: [], recommendations: [] },
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      expect(
        result.warnings.filter((w) => w.type === 'fatigue_risk' && w.message.includes('fatigue'))
      ).toHaveLength(0);
    });
  });

  describe('constraint violation checks', () => {
    it('returns danger when sport change to restricted sport', () => {
      const modified: ProposedWorkout = { ...baseOriginal, sport: 'swim' };
      const context: ModificationContext = {
        constraints: [
          {
            id: 'c1',
            athleteId: 'a1',
            constraintType: 'injury',
            title: 'Shoulder injury',
            startDate: '2025-01-01',
            status: 'active',
            injuryBodyPart: 'shoulder',
            injuryRestrictions: ['swim'],
          },
        ],
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      const warning = result.warnings.find((w) => w.type === 'constraint_violation');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('danger');
      expect(warning?.message).toContain('swim');
      expect(warning?.message).toContain('shoulder');
    });

    it('returns no warning when sport change to unrestricted sport', () => {
      const modified: ProposedWorkout = { ...baseOriginal, sport: 'bike' };
      const context: ModificationContext = {
        constraints: [
          {
            id: 'c1',
            athleteId: 'a1',
            constraintType: 'injury',
            title: 'Shoulder injury',
            startDate: '2025-01-01',
            status: 'active',
            injuryBodyPart: 'shoulder',
            injuryRestrictions: ['swim'],
          },
        ],
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      expect(result.warnings.filter((w) => w.type === 'constraint_violation')).toHaveLength(0);
    });

    it('returns danger for high intensity with restriction and severe injury', () => {
      const modified: ProposedWorkout = { ...baseOriginal, sport: 'bike', intensity: 'threshold' };
      const context: ModificationContext = {
        constraints: [
          {
            id: 'c1',
            athleteId: 'a1',
            constraintType: 'injury',
            title: 'Back strain',
            startDate: '2025-01-01',
            status: 'active',
            injuryBodyPart: 'back',
            injurySeverity: 'severe',
            injuryRestrictions: ['high_intensity'],
          },
        ],
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      const warning = result.warnings.find(
        (w) => w.type === 'constraint_violation' && w.message.includes('High intensity')
      );
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('danger');
    });

    it('returns warning for high intensity with restriction and mild injury', () => {
      const modified: ProposedWorkout = { ...baseOriginal, sport: 'bike', intensity: 'threshold' };
      const context: ModificationContext = {
        constraints: [
          {
            id: 'c1',
            athleteId: 'a1',
            constraintType: 'injury',
            title: 'Mild back strain',
            startDate: '2025-01-01',
            status: 'active',
            injuryBodyPart: 'back',
            injurySeverity: 'mild',
            injuryRestrictions: ['high_intensity'],
          },
        ],
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      const warning = result.warnings.find(
        (w) => w.type === 'constraint_violation' && w.message.includes('High intensity')
      );
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
    });

    it('does not check constraints when sport has not changed', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'threshold' };
      const context: ModificationContext = {
        constraints: [
          {
            id: 'c1',
            athleteId: 'a1',
            constraintType: 'injury',
            title: 'Back strain',
            startDate: '2025-01-01',
            status: 'active',
            injuryRestrictions: ['high_intensity'],
          },
        ],
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      expect(result.warnings.filter((w) => w.type === 'constraint_violation')).toHaveLength(0);
    });
  });

  describe('consecutive hard days', () => {
    it('returns danger for threshold workout after 2 consecutive hard days', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'threshold' };
      const context: ModificationContext = {
        recentActivities: [
          { date: '2025-01-20', intensity: 'threshold' },
          { date: '2025-01-19', intensity: 'vo2max' },
        ],
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      const warning = result.warnings.find((w) => w.type === 'consecutive_hard_days');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('danger');
    });

    it('returns no warning for threshold workout after 1 hard day', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'threshold' };
      const context: ModificationContext = {
        recentActivities: [
          { date: '2025-01-20', intensity: 'threshold' },
          { date: '2025-01-19', intensity: 'easy' },
        ],
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      expect(result.warnings.filter((w) => w.type === 'consecutive_hard_days')).toHaveLength(0);
    });

    it('returns no warning for easy workout even after 2 hard days', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'easy' };
      const context: ModificationContext = {
        recentActivities: [
          { date: '2025-01-20', intensity: 'threshold' },
          { date: '2025-01-19', intensity: 'vo2max' },
        ],
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      expect(result.warnings.filter((w) => w.type === 'consecutive_hard_days')).toHaveLength(0);
    });
  });

  describe('overall risk determination', () => {
    it('returns low risk with no warnings', () => {
      const modified: ProposedWorkout = { ...baseOriginal };
      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.risk).toBe('low');
      expect(result.isValid).toBe(true);
    });

    it('returns moderate risk with 1 warning', () => {
      // 2-level intensity jump → warning
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'threshold' };
      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.risk).toBe('moderate');
      expect(result.isValid).toBe(true);
    });

    it('returns high risk with 1 danger', () => {
      // 3+ level intensity jump → danger
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'vo2max' };
      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.risk).toBe('high');
      expect(result.isValid).toBe(true);
    });

    it('returns critical risk with 2+ dangers', () => {
      // 3+ level intensity jump → danger + red readiness increase → danger = critical
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'vo2max' };
      const context: ModificationContext = {
        readiness: { readiness: 'red', score: 25, concerns: [], recommendations: [] },
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      expect(result.risk).toBe('critical');
      expect(result.isValid).toBe(false);
    });
  });

  describe('safe alternative suggestions', () => {
    it('suggests alternative for high risk modifications', () => {
      const modified: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 120,
        intensity: 'sprint',
        estimatedTSS: 200,
      };

      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.suggestedModification).toBeDefined();
    });

    it('caps intensity at 1 level above original', () => {
      const modified: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 60,
        intensity: 'sprint',
        estimatedTSS: 140,
      };

      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.suggestedModification).toBeDefined();
      // Original is 'moderate' (level 2), so safe should be 'tempo' (level 3)
      expect(result.suggestedModification?.intensity).toBe('tempo');
    });

    it('caps duration at 125% of original', () => {
      const modified: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 120,
        intensity: 'sprint',
        estimatedTSS: 200,
      };

      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.suggestedModification).toBeDefined();
      // 60 * 1.25 = 75
      expect(result.suggestedModification?.durationMinutes).toBe(75);
    });

    it('reverts to original sport if constraint violation', () => {
      const modified: ProposedWorkout = {
        sport: 'swim',
        durationMinutes: 60,
        intensity: 'sprint',
        estimatedTSS: 140,
      };
      const context: ModificationContext = {
        constraints: [
          {
            id: 'c1',
            athleteId: 'a1',
            constraintType: 'injury',
            title: 'Shoulder injury',
            startDate: '2025-01-01',
            status: 'active',
            injuryRestrictions: ['swim'],
          },
        ],
      };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      expect(result.suggestedModification).toBeDefined();
      expect(result.suggestedModification?.sport).toBe('run');
    });

    it('does not suggest alternative for low risk', () => {
      const modified: ProposedWorkout = { ...baseOriginal };
      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.suggestedModification).toBeUndefined();
    });

    it('does not suggest alternative for moderate risk', () => {
      // 2-level intensity jump → warning → moderate
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'threshold' };
      const result = validateWorkoutModification(baseOriginal, modified);

      expect(result.risk).toBe('moderate');
      expect(result.suggestedModification).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles zero original TSS without division by zero', () => {
      const original: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 60,
        intensity: 'easy',
        estimatedTSS: 0,
      };
      const modified: ProposedWorkout = { ...original, estimatedTSS: 50 };

      const result = validateWorkoutModification(original, modified);

      // No crash, no load_increase warning (tssIncreasePercent is 0 when original is 0)
      expect(result.warnings.filter((w) => w.type === 'load_increase')).toHaveLength(0);
    });

    it('handles zero original duration without division by zero', () => {
      const original: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 0,
        intensity: 'easy',
        estimatedTSS: 0,
      };
      const modified: ProposedWorkout = { ...original, durationMinutes: 30 };

      const result = validateWorkoutModification(original, modified);

      // No crash, no duration_increase warning
      expect(result.warnings.filter((w) => w.type === 'duration_increase')).toHaveLength(0);
    });

    it('handles undefined estimatedTSS', () => {
      const original: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 60,
        intensity: 'moderate',
      };
      const modified: ProposedWorkout = {
        sport: 'run',
        durationMinutes: 60,
        intensity: 'moderate',
      };

      const result = validateWorkoutModification(original, modified);

      expect(result.risk).toBe('low');
      expect(result.isValid).toBe(true);
    });

    it('handles empty constraints array', () => {
      const modified: ProposedWorkout = { ...baseOriginal, sport: 'swim' };
      const context: ModificationContext = { constraints: [] };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      expect(result.warnings.filter((w) => w.type === 'constraint_violation')).toHaveLength(0);
    });

    it('handles empty context', () => {
      const modified: ProposedWorkout = { ...baseOriginal };
      const result = validateWorkoutModification(baseOriginal, modified, {});

      expect(result.risk).toBe('low');
      expect(result.isValid).toBe(true);
    });

    it('handles same workout (no modification) as low risk', () => {
      const result = validateWorkoutModification(baseOriginal, { ...baseOriginal });

      expect(result.risk).toBe('low');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('handles empty recentActivities array', () => {
      const modified: ProposedWorkout = { ...baseOriginal, intensity: 'threshold' };
      const context: ModificationContext = { recentActivities: [] };

      const result = validateWorkoutModification(baseOriginal, modified, context);

      expect(result.warnings.filter((w) => w.type === 'consecutive_hard_days')).toHaveLength(0);
    });
  });
});
