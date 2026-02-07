/**
 * Type Guard Tests
 */

import { describe, expect, it } from '@jest/globals';
import {
  isAvailabilityConstraint,
  isFitnessGoal,
  isHealthGoal,
  isInjuryConstraint,
  isPerformanceGoal,
  isRaceGoal,
  isTravelConstraint,
} from '../types';
import type {
  AvailabilityConstraint,
  Constraint,
  FitnessGoal,
  Goal,
  HealthGoal,
  InjuryConstraint,
  PerformanceGoal,
  RaceGoal,
  TravelConstraint,
} from '../types';

// =============================================================================
// TEST DATA
// =============================================================================

const raceGoal: RaceGoal = {
  id: 'goal-1',
  athleteId: 'athlete-1',
  goalType: 'race',
  title: 'Ironman',
  priority: 'A',
  status: 'active',
  raceDistance: '140.6',
};

const performanceGoal: PerformanceGoal = {
  id: 'goal-2',
  athleteId: 'athlete-1',
  goalType: 'performance',
  title: 'Increase FTP',
  priority: 'B',
  status: 'active',
  perfMetric: 'ftp',
  perfTargetValue: 300,
};

const fitnessGoal: FitnessGoal = {
  id: 'goal-3',
  athleteId: 'athlete-1',
  goalType: 'fitness',
  title: 'Weekly Volume',
  priority: 'B',
  status: 'active',
  fitnessMetric: 'weekly_hours',
  fitnessTargetValue: 15,
};

const healthGoal: HealthGoal = {
  id: 'goal-4',
  athleteId: 'athlete-1',
  goalType: 'health',
  title: 'Target Weight',
  priority: 'C',
  status: 'active',
  healthMetric: 'weight_kg',
  healthTargetValue: 70,
};

const injuryConstraint: InjuryConstraint = {
  id: 'constraint-1',
  athleteId: 'athlete-1',
  constraintType: 'injury',
  title: 'Knee pain',
  startDate: '2025-01-01',
  status: 'active',
  injurySeverity: 'mild',
};

const travelConstraint: TravelConstraint = {
  id: 'constraint-2',
  athleteId: 'athlete-1',
  constraintType: 'travel',
  title: 'Business trip',
  startDate: '2025-02-01',
  endDate: '2025-02-07',
  status: 'active',
  travelDestination: 'London',
};

const availabilityConstraint: AvailabilityConstraint = {
  id: 'constraint-3',
  athleteId: 'athlete-1',
  constraintType: 'availability',
  title: 'Reduced hours',
  startDate: '2025-01-15',
  status: 'active',
  availabilityHoursPerWeek: 8,
};

// =============================================================================
// GOAL TYPE GUARD TESTS
// =============================================================================

describe('Goal Type Guards', () => {
  describe('isRaceGoal', () => {
    it('should return true for race goals', () => {
      expect(isRaceGoal(raceGoal)).toBe(true);
    });

    it('should return false for non-race goals', () => {
      expect(isRaceGoal(performanceGoal)).toBe(false);
      expect(isRaceGoal(fitnessGoal)).toBe(false);
      expect(isRaceGoal(healthGoal)).toBe(false);
    });

    it('should narrow the type correctly', () => {
      const goal: Goal = raceGoal;
      if (isRaceGoal(goal)) {
        // TypeScript should allow accessing raceDistance
        expect(goal.raceDistance).toBe('140.6');
      }
    });
  });

  describe('isPerformanceGoal', () => {
    it('should return true for performance goals', () => {
      expect(isPerformanceGoal(performanceGoal)).toBe(true);
    });

    it('should return false for non-performance goals', () => {
      expect(isPerformanceGoal(raceGoal)).toBe(false);
      expect(isPerformanceGoal(fitnessGoal)).toBe(false);
      expect(isPerformanceGoal(healthGoal)).toBe(false);
    });

    it('should narrow the type correctly', () => {
      const goal: Goal = performanceGoal;
      if (isPerformanceGoal(goal)) {
        expect(goal.perfMetric).toBe('ftp');
        expect(goal.perfTargetValue).toBe(300);
      }
    });
  });

  describe('isFitnessGoal', () => {
    it('should return true for fitness goals', () => {
      expect(isFitnessGoal(fitnessGoal)).toBe(true);
    });

    it('should return false for non-fitness goals', () => {
      expect(isFitnessGoal(raceGoal)).toBe(false);
      expect(isFitnessGoal(performanceGoal)).toBe(false);
      expect(isFitnessGoal(healthGoal)).toBe(false);
    });

    it('should narrow the type correctly', () => {
      const goal: Goal = fitnessGoal;
      if (isFitnessGoal(goal)) {
        expect(goal.fitnessMetric).toBe('weekly_hours');
        expect(goal.fitnessTargetValue).toBe(15);
      }
    });
  });

  describe('isHealthGoal', () => {
    it('should return true for health goals', () => {
      expect(isHealthGoal(healthGoal)).toBe(true);
    });

    it('should return false for non-health goals', () => {
      expect(isHealthGoal(raceGoal)).toBe(false);
      expect(isHealthGoal(performanceGoal)).toBe(false);
      expect(isHealthGoal(fitnessGoal)).toBe(false);
    });

    it('should narrow the type correctly', () => {
      const goal: Goal = healthGoal;
      if (isHealthGoal(goal)) {
        expect(goal.healthMetric).toBe('weight_kg');
        expect(goal.healthTargetValue).toBe(70);
      }
    });
  });
});

// =============================================================================
// CONSTRAINT TYPE GUARD TESTS
// =============================================================================

describe('Constraint Type Guards', () => {
  describe('isInjuryConstraint', () => {
    it('should return true for injury constraints', () => {
      expect(isInjuryConstraint(injuryConstraint)).toBe(true);
    });

    it('should return false for non-injury constraints', () => {
      expect(isInjuryConstraint(travelConstraint)).toBe(false);
      expect(isInjuryConstraint(availabilityConstraint)).toBe(false);
    });

    it('should narrow the type correctly', () => {
      const constraint: Constraint = injuryConstraint;
      if (isInjuryConstraint(constraint)) {
        expect(constraint.injurySeverity).toBe('mild');
      }
    });
  });

  describe('isTravelConstraint', () => {
    it('should return true for travel constraints', () => {
      expect(isTravelConstraint(travelConstraint)).toBe(true);
    });

    it('should return false for non-travel constraints', () => {
      expect(isTravelConstraint(injuryConstraint)).toBe(false);
      expect(isTravelConstraint(availabilityConstraint)).toBe(false);
    });

    it('should narrow the type correctly', () => {
      const constraint: Constraint = travelConstraint;
      if (isTravelConstraint(constraint)) {
        expect(constraint.travelDestination).toBe('London');
      }
    });
  });

  describe('isAvailabilityConstraint', () => {
    it('should return true for availability constraints', () => {
      expect(isAvailabilityConstraint(availabilityConstraint)).toBe(true);
    });

    it('should return false for non-availability constraints', () => {
      expect(isAvailabilityConstraint(injuryConstraint)).toBe(false);
      expect(isAvailabilityConstraint(travelConstraint)).toBe(false);
    });

    it('should narrow the type correctly', () => {
      const constraint: Constraint = availabilityConstraint;
      if (isAvailabilityConstraint(constraint)) {
        expect(constraint.availabilityHoursPerWeek).toBe(8);
      }
    });
  });
});

// =============================================================================
// TYPE DISCRIMINATION TESTS
// =============================================================================

describe('Type Discrimination', () => {
  it('should correctly identify goal types in a mixed array', () => {
    const goals: Goal[] = [raceGoal, performanceGoal, fitnessGoal, healthGoal];

    const raceGoals = goals.filter(isRaceGoal);
    const performanceGoals = goals.filter(isPerformanceGoal);
    const fitnessGoals = goals.filter(isFitnessGoal);
    const healthGoals = goals.filter(isHealthGoal);

    expect(raceGoals).toHaveLength(1);
    expect(performanceGoals).toHaveLength(1);
    expect(fitnessGoals).toHaveLength(1);
    expect(healthGoals).toHaveLength(1);
  });

  it('should correctly identify constraint types in a mixed array', () => {
    const constraints: Constraint[] = [injuryConstraint, travelConstraint, availabilityConstraint];

    const injuries = constraints.filter(isInjuryConstraint);
    const travel = constraints.filter(isTravelConstraint);
    const availability = constraints.filter(isAvailabilityConstraint);

    expect(injuries).toHaveLength(1);
    expect(travel).toHaveLength(1);
    expect(availability).toHaveLength(1);
  });
});
