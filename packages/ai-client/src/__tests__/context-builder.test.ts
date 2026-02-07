/**
 * Context Builder Tests
 */

import { describe, expect, it } from '@jest/globals';
import { buildCoachingContext, serializeContextForPrompt } from '../context-builder.js';
import type {
  Activity,
  AthleteProfile,
  Constraint,
  DailyCheckIn,
  FitnessMetrics,
  Goal,
  InjuryConstraint,
  RaceGoal,
  TrainingPlan,
  WellnessData,
} from '../types.js';

// =============================================================================
// TEST DATA FIXTURES
// =============================================================================

const mockAthlete: AthleteProfile = {
  id: 'athlete-123',
  displayName: 'Test Athlete',
  weightKg: 70,
  heightCm: 175,
  ftpWatts: 250,
  runningThresholdPaceSecPerKm: 270, // 4:30/km
  cssSecPer100m: 95, // 1:35/100m
  maxHeartRate: 185,
  lthr: 168,
  preferredUnits: 'metric',
  timezone: 'America/New_York',
  intervalsIcuConnected: true,
  intervalsIcuAthleteId: 'i12345',
};

// Create a race goal with a future date (6 months from now)
const futureRaceDate = new Date();
futureRaceDate.setMonth(futureRaceDate.getMonth() + 6);

const mockRaceGoal: RaceGoal = {
  id: 'goal-1',
  athleteId: 'athlete-123',
  goalType: 'race',
  title: 'Ironman 70.3 World Championship',
  description: 'Qualify and compete at the 70.3 World Championship',
  targetDate: futureRaceDate.toISOString().split('T')[0],
  priority: 'A',
  status: 'active',
  raceEventName: 'Ironman 70.3 World Championship',
  raceDistance: '70.3',
  raceLocation: 'Taupo, New Zealand',
  raceTargetTimeSeconds: 18000, // 5 hours
};

const mockInjury: InjuryConstraint = {
  id: 'constraint-1',
  athleteId: 'athlete-123',
  constraintType: 'injury',
  title: 'Left knee tendinitis',
  description: 'Mild IT band irritation from overuse',
  startDate: '2025-01-15',
  status: 'active',
  injuryBodyPart: 'left_knee',
  injurySeverity: 'mild',
  injuryRestrictions: ['running', 'high_impact'],
};

const mockActivities: Activity[] = [
  {
    id: 'act-1',
    name: 'Morning Endurance Ride',
    type: 'Ride',
    startDate: '2025-01-20T07:00:00Z',
    movingTime: 5400, // 90 minutes
    distance: 45000,
    averageWatts: 180,
    normalizedPower: 195,
    trainingLoad: 75,
  },
  {
    id: 'act-2',
    name: 'Recovery Swim',
    type: 'Swim',
    startDate: '2025-01-19T06:30:00Z',
    movingTime: 2700, // 45 minutes
    distance: 2000,
    trainingLoad: 35,
  },
];

const mockWellnessData: WellnessData[] = [
  {
    date: '2025-01-21',
    sleepHours: 7.5,
    sleepQuality: 8,
    hrv: 65,
    restingHR: 52,
    fatigue: 4,
    soreness: 3,
  },
  {
    date: '2025-01-20',
    sleepHours: 6.5,
    sleepQuality: 6,
    hrv: 58,
    restingHR: 55,
    fatigue: 5,
    soreness: 4,
  },
];

const mockCheckIn: DailyCheckIn = {
  id: 'checkin-1',
  athleteId: 'athlete-123',
  checkinDate: '2025-01-21',
  sleepQuality: 8,
  sleepHours: 7.5,
  energyLevel: 7,
  stressLevel: 4,
  overallSoreness: 3,
  restingHr: 52,
  hrvMs: 65,
  availableTimeMinutes: 90,
  equipmentAccess: ['bike_trainer', 'pool'],
  travelStatus: 'home',
};

const mockFitnessMetrics: FitnessMetrics = {
  date: '2025-01-21',
  ctl: 65,
  atl: 80,
  tsb: -15,
  rampRate: 4.5,
};

const mockTrainingPlan: TrainingPlan = {
  id: 'plan-1',
  athleteId: 'athlete-123',
  title: '70.3 Build Plan',
  description: '16-week build to Ironman 70.3',
  durationWeeks: 16,
  startDate: '2025-01-06',
  endDate: '2025-04-27',
  targetGoalId: 'goal-1',
  status: 'active',
  phases: [
    {
      name: 'Base',
      startWeek: 1,
      endWeek: 4,
      focus: 'Aerobic foundation',
      description: 'Build aerobic base with high volume, low intensity',
    },
    {
      name: 'Build 1',
      startWeek: 5,
      endWeek: 8,
      focus: 'Threshold development',
      description: 'Introduce threshold intervals',
    },
    {
      name: 'Build 2',
      startWeek: 9,
      endWeek: 12,
      focus: 'Race-specific intensity',
      description: 'Race pace work and brick sessions',
    },
    {
      name: 'Peak',
      startWeek: 13,
      endWeek: 15,
      focus: 'Sharpening',
      description: 'Maintain fitness with race-specific work',
    },
    {
      name: 'Taper',
      startWeek: 16,
      endWeek: 16,
      focus: 'Recovery and freshness',
      description: 'Reduce volume, maintain intensity',
    },
  ],
  adjustmentsLog: [],
};

// =============================================================================
// TESTS
// =============================================================================

describe('buildCoachingContext', () => {
  it('should build a basic context with athlete only', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
    });

    expect(context.athlete).toEqual(mockAthlete);
    expect(context.goals).toEqual([]);
    expect(context.constraints).toEqual([]);
    expect(context.recentActivities).toEqual([]);
    expect(context.wellnessHistory).toEqual([]);
    expect(context.checkIn).toBeUndefined();
    expect(context.fitnessMetrics).toBeUndefined();
    expect(context.trainingPlan).toBeUndefined();
  });

  it('should include active goals and filter out inactive ones', () => {
    const completedGoal: Goal = {
      ...mockRaceGoal,
      id: 'goal-2',
      status: 'completed',
      title: 'Completed Goal',
    };

    const context = buildCoachingContext({
      athlete: mockAthlete,
      goals: [mockRaceGoal, completedGoal],
    });

    expect(context.goals).toHaveLength(1);
    expect(context.goals[0]?.title).toBe('Ironman 70.3 World Championship');
  });

  it('should include active constraints and filter out resolved ones', () => {
    const resolvedConstraint: InjuryConstraint = {
      ...mockInjury,
      id: 'constraint-2',
      status: 'resolved',
      title: 'Resolved Injury',
    };

    const context = buildCoachingContext({
      athlete: mockAthlete,
      constraints: [mockInjury, resolvedConstraint],
    });

    expect(context.constraints).toHaveLength(1);
    expect(context.constraints[0]?.title).toBe('Left knee tendinitis');
  });

  it("should filter out constraints that haven't started yet", () => {
    const futureConstraint: Constraint = {
      ...mockInjury,
      id: 'constraint-future',
      startDate: '2099-01-01', // Future date
      title: 'Future Constraint',
    };

    const context = buildCoachingContext({
      athlete: mockAthlete,
      constraints: [futureConstraint],
    });

    expect(context.constraints).toHaveLength(0);
  });

  it('should sort activities by date (most recent first)', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
      recentActivities: mockActivities,
    });

    expect(context.recentActivities[0]?.name).toBe('Morning Endurance Ride');
    expect(context.recentActivities[1]?.name).toBe('Recovery Swim');
  });

  it('should sort wellness data by date (most recent first)', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
      wellnessData: mockWellnessData,
    });

    expect(context.wellnessHistory[0]?.date).toBe('2025-01-21');
    expect(context.wellnessHistory[1]?.date).toBe('2025-01-20');
  });

  it('should identify the next race goal', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
      goals: [mockRaceGoal],
    });

    expect(context.nextRaceGoal).toBeDefined();
    expect(context.nextRaceGoal?.title).toBe('Ironman 70.3 World Championship');
  });

  it('should calculate days to next race', () => {
    // Create a race goal 30 days in the future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureRaceGoal: RaceGoal = {
      ...mockRaceGoal,
      targetDate: futureDate.toISOString().split('T')[0],
    };

    const context = buildCoachingContext({
      athlete: mockAthlete,
      goals: [futureRaceGoal],
    });

    expect(context.daysToNextRace).toBeDefined();
    expect(context.daysToNextRace).toBeGreaterThanOrEqual(29);
    expect(context.daysToNextRace).toBeLessThanOrEqual(31);
  });

  it('should include check-in data', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
      checkIn: mockCheckIn,
    });

    expect(context.checkIn).toEqual(mockCheckIn);
  });

  it('should include fitness metrics', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
      fitnessMetrics: mockFitnessMetrics,
    });

    expect(context.fitnessMetrics).toEqual(mockFitnessMetrics);
  });

  it('should include training plan and determine current phase', () => {
    // Create a plan that is currently active
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14); // Started 2 weeks ago
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 98); // Ends in 14 weeks

    const activePlan: TrainingPlan = {
      ...mockTrainingPlan,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    };

    const context = buildCoachingContext({
      athlete: mockAthlete,
      trainingPlan: activePlan,
    });

    expect(context.trainingPlan).toBeDefined();
    expect(context.currentPhase).toBeDefined();
    expect(context.weekInPlan).toBeDefined();
    // Should be in Base phase (weeks 1-4) since we're 2 weeks in
    expect(context.currentPhase?.name).toBe('Base');
    expect(context.weekInPlan).toBe(3); // Week 3 (14 days / 7 = 2 complete weeks, currently in week 3)
  });
});

describe('serializeContextForPrompt', () => {
  it('should serialize athlete profile', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
    });

    const serialized = serializeContextForPrompt(context);

    expect(serialized).toContain('## Athlete Profile');
    expect(serialized).toContain('Test Athlete');
    expect(serialized).toContain('FTP: 250 watts');
    expect(serialized).toContain('Max HR: 185 bpm');
  });

  it('should serialize goals', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
      goals: [mockRaceGoal],
    });

    const serialized = serializeContextForPrompt(context);

    expect(serialized).toContain('## Goals');
    expect(serialized).toContain('[A]');
    expect(serialized).toContain('Ironman 70.3 World Championship');
  });

  it('should serialize constraints', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
      constraints: [mockInjury],
    });

    const serialized = serializeContextForPrompt(context);

    expect(serialized).toContain('## Active Constraints');
    expect(serialized).toContain('[INJURY]');
    expect(serialized).toContain('Left knee tendinitis');
    expect(serialized).toContain('mild');
  });

  it('should serialize activities', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
      recentActivities: mockActivities,
    });

    const serialized = serializeContextForPrompt(context);

    expect(serialized).toContain('## Recent Activities');
    expect(serialized).toContain('Morning Endurance Ride');
    expect(serialized).toContain('Recovery Swim');
    expect(serialized).toContain('Period Summary:');
  });

  it('should serialize wellness data', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
      wellnessData: mockWellnessData,
    });

    const serialized = serializeContextForPrompt(context);

    expect(serialized).toContain('## Wellness Trends');
    expect(serialized).toContain('2025-01-21');
    expect(serialized).toContain('HRV: 65');
  });

  it('should serialize check-in data', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
      checkIn: mockCheckIn,
    });

    const serialized = serializeContextForPrompt(context);

    expect(serialized).toContain("## Today's Check-in");
    expect(serialized).toContain('Sleep Quality: 8/10');
    expect(serialized).toContain('Energy Level: 7/10');
    expect(serialized).toContain('Available Time: 90 minutes');
  });

  it('should serialize fitness metrics with status interpretation', () => {
    const context = buildCoachingContext({
      athlete: mockAthlete,
      fitnessMetrics: mockFitnessMetrics,
    });

    const serialized = serializeContextForPrompt(context);

    expect(serialized).toContain('## Fitness Metrics');
    expect(serialized).toContain('CTL (Fitness): 65.0');
    expect(serialized).toContain('ATL (Fatigue): 80.0');
    expect(serialized).toContain('TSB (Form): -15.0');
    expect(serialized).toContain('Status:');
  });

  it('should handle context with all data', () => {
    // Create an active training plan
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 105);

    const activePlan: TrainingPlan = {
      ...mockTrainingPlan,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    };

    const context = buildCoachingContext({
      athlete: mockAthlete,
      goals: [mockRaceGoal],
      constraints: [mockInjury],
      checkIn: mockCheckIn,
      recentActivities: mockActivities,
      wellnessData: mockWellnessData,
      fitnessMetrics: mockFitnessMetrics,
      trainingPlan: activePlan,
    });

    const serialized = serializeContextForPrompt(context);

    // Verify all sections are present
    expect(serialized).toContain('## Athlete Profile');
    expect(serialized).toContain('## Goals');
    expect(serialized).toContain('## Active Constraints');
    expect(serialized).toContain('## Training Plan');
    expect(serialized).toContain('## Fitness Metrics');
    expect(serialized).toContain('## Recent Activities');
    expect(serialized).toContain('## Wellness Trends');
    expect(serialized).toContain("## Today's Check-in");
  });
});
