import {
  buildTrainingPlan,
  calculateEndDate,
  calculatePeriodization,
  generatePlanName,
  resolveTotalWeeks,
  weeksUntilGoal,
} from '../plan-builder.ts';
import type { AthleteData, GoalData, PeriodizationData } from '../types.ts';

// =============================================================================
// Test fixtures
// =============================================================================

const ATHLETE: AthleteData = { id: 'athlete-001', display_name: 'Test Runner' };

const GOAL_WITH_RACE: GoalData = {
  id: 'goal-001',
  title: 'Boston Marathon 2026',
  goal_type: 'race',
  target_date: '2026-06-15',
  race_event_name: 'Boston Marathon',
  race_distance: 'marathon',
  priority: 'high',
};

const GOAL_NO_RACE: GoalData = {
  id: 'goal-002',
  title: 'Improve 5K time',
  goal_type: 'performance',
  target_date: '2026-09-01',
  race_event_name: null,
  race_distance: null,
  priority: 'medium',
};

const GOAL_NO_DATE: GoalData = {
  id: 'goal-003',
  title: 'General fitness',
  goal_type: 'lifestyle',
  target_date: null,
  race_event_name: null,
  race_distance: null,
  priority: 'low',
};

// =============================================================================
// weeksUntilGoal
// =============================================================================

describe('weeksUntilGoal', () => {
  it('returns correct weeks for valid dates', () => {
    // 84 days = 12 weeks
    expect(weeksUntilGoal('2026-01-01', '2026-03-26')).toBe(12);
  });

  it('returns null when target is before start', () => {
    expect(weeksUntilGoal('2026-06-01', '2026-01-01')).toBeNull();
  });

  it('returns null when target equals start', () => {
    expect(weeksUntilGoal('2026-03-01', '2026-03-01')).toBeNull();
  });

  it('clamps to MIN_WEEKS (4) when dates are very close', () => {
    // 14 days = 2 weeks, below minimum of 4
    expect(weeksUntilGoal('2026-01-01', '2026-01-15')).toBe(4);
  });

  it('clamps to MAX_WEEKS (52) for far-future targets', () => {
    // ~104 weeks apart
    expect(weeksUntilGoal('2026-01-01', '2028-01-01')).toBe(52);
  });

  it('returns null for invalid start date format', () => {
    expect(weeksUntilGoal('not-a-date', '2026-06-01')).toBeNull();
  });

  it('returns null for invalid target date format', () => {
    expect(weeksUntilGoal('2026-01-01', '06/15/2026')).toBeNull();
  });

  it('returns null when both dates are invalid', () => {
    expect(weeksUntilGoal('bad', 'dates')).toBeNull();
  });

  it('returns exact value within valid range', () => {
    // 35 days = 5 weeks (within 4-52)
    expect(weeksUntilGoal('2026-01-01', '2026-02-05')).toBe(5);
  });
});

// =============================================================================
// calculateEndDate
// =============================================================================

describe('calculateEndDate', () => {
  it('calculates end date correctly for 12 weeks', () => {
    // 12 weeks = 84 days, minus 1 = 83 days after start
    expect(calculateEndDate('2026-01-01', 12)).toBe('2026-03-25');
  });

  it('calculates end date correctly for 4 weeks', () => {
    // 4 weeks = 28 days, minus 1 = 27 days after start
    expect(calculateEndDate('2026-01-01', 4)).toBe('2026-01-28');
  });

  it('calculates end date correctly for 1 week', () => {
    // 1 week = 7 days, minus 1 = 6 days after start
    expect(calculateEndDate('2026-03-01', 1)).toBe('2026-03-07');
  });

  it('handles month boundaries', () => {
    // 8 weeks from Jan 15
    expect(calculateEndDate('2026-01-15', 8)).toBe('2026-03-11');
  });

  it('handles year boundaries', () => {
    expect(calculateEndDate('2025-12-01', 8)).toBe('2026-01-25');
  });
});

// =============================================================================
// generatePlanName
// =============================================================================

describe('generatePlanName', () => {
  const samplePhases = [
    { phase: 'base' },
    { phase: 'build' },
    { phase: 'peak' },
    { phase: 'taper' },
  ] as const;

  it('includes race event name when available', () => {
    expect(generatePlanName(12, GOAL_WITH_RACE, samplePhases)).toBe(
      '12-Week Plan: Boston Marathon'
    );
  });

  it('includes goal title as fallback when no race event', () => {
    expect(generatePlanName(16, GOAL_NO_RACE, samplePhases)).toBe('16-Week Plan: Improve 5K time');
  });

  it('uses phase names when no goal', () => {
    expect(generatePlanName(12, null, samplePhases)).toBe('12-Week Base → Build → Peak → Taper');
  });

  it('uses phase names when goal has no title or race', () => {
    const goalMinimal: GoalData = {
      ...GOAL_NO_DATE,
      title: null as unknown as string, // edge case: null title
      race_event_name: null,
    };
    expect(generatePlanName(8, goalMinimal, [{ phase: 'base' }, { phase: 'build' }])).toBe(
      '8-Week Base → Build'
    );
  });

  it('capitalizes phase names', () => {
    const result = generatePlanName(6, null, [{ phase: 'base' }, { phase: 'build' }]);
    expect(result).toBe('6-Week Base → Build');
  });
});

// =============================================================================
// resolveTotalWeeks
// =============================================================================

describe('resolveTotalWeeks', () => {
  it('uses explicit total_weeks when provided', () => {
    expect(resolveTotalWeeks(16, '2026-01-01', null)).toBe(16);
  });

  it('clamps explicit weeks to minimum of 4', () => {
    expect(resolveTotalWeeks(2, '2026-01-01', null)).toBe(4);
  });

  it('clamps explicit weeks to maximum of 52', () => {
    expect(resolveTotalWeeks(100, '2026-01-01', null)).toBe(52);
  });

  it('derives from goal target_date when no explicit weeks', () => {
    // 84 days = 12 weeks
    const goal: GoalData = { ...GOAL_NO_RACE, target_date: '2026-03-26' };
    expect(resolveTotalWeeks(undefined, '2026-01-01', goal)).toBe(12);
  });

  it('defaults to 12 when no weeks or goal date', () => {
    expect(resolveTotalWeeks(undefined, '2026-01-01', null)).toBe(12);
  });

  it('defaults to 12 when goal has no target_date', () => {
    expect(resolveTotalWeeks(undefined, '2026-01-01', GOAL_NO_DATE)).toBe(12);
  });

  it('defaults to 12 when goal target_date is in the past', () => {
    const pastGoal: GoalData = { ...GOAL_NO_RACE, target_date: '2025-01-01' };
    expect(resolveTotalWeeks(undefined, '2026-01-01', pastGoal)).toBe(12);
  });

  it('prefers explicit weeks over goal derivation', () => {
    expect(resolveTotalWeeks(8, '2026-01-01', GOAL_WITH_RACE)).toBe(8);
  });

  it('treats zero as valid (clamped to MIN)', () => {
    expect(resolveTotalWeeks(0, '2026-01-01', null)).toBe(4);
  });
});

// =============================================================================
// calculatePeriodization
// =============================================================================

describe('calculatePeriodization', () => {
  it('returns correct structure for 12-week plan', () => {
    const result = calculatePeriodization(12);

    expect(result.total_weeks).toBe(12);
    expect(result.phases.length).toBeGreaterThan(0);
    expect(result.weekly_volumes).toHaveLength(12);
  });

  it('phases sum to total_weeks', () => {
    for (const weeks of [4, 6, 8, 12, 16, 24, 52]) {
      const result = calculatePeriodization(weeks);
      const phaseWeeksSum = result.phases.reduce((sum, p) => sum + p.weeks, 0);
      expect(phaseWeeksSum).toBe(weeks);
    }
  });

  it('weekly_volumes has exactly total_weeks entries', () => {
    for (const weeks of [4, 8, 12, 20, 52]) {
      const result = calculatePeriodization(weeks);
      expect(result.weekly_volumes).toHaveLength(weeks);
    }
  });

  it('short plan (<=8 weeks) has base + build + optional taper', () => {
    const result = calculatePeriodization(6);
    const phaseNames = result.phases.map((p) => p.phase);

    expect(phaseNames).toContain('base');
    expect(phaseNames).toContain('build');
    expect(phaseNames).not.toContain('peak');
  });

  it('standard plan (>8 weeks) includes peak phase', () => {
    const result = calculatePeriodization(12);
    const phaseNames = result.phases.map((p) => p.phase);

    expect(phaseNames).toContain('base');
    expect(phaseNames).toContain('build');
    expect(phaseNames).toContain('peak');
  });

  it('each volume entry has valid fields', () => {
    const result = calculatePeriodization(12);

    for (const vol of result.weekly_volumes) {
      expect(vol.week).toBeGreaterThanOrEqual(1);
      expect(vol.week).toBeLessThanOrEqual(12);
      expect(typeof vol.volume_multiplier).toBe('number');
      expect(vol.volume_multiplier).toBeGreaterThan(0);
      expect(typeof vol.phase).toBe('string');
    }
  });

  it('each phase has valid intensity distribution summing to 100', () => {
    const result = calculatePeriodization(16);

    for (const phase of result.phases) {
      expect(phase.intensity_distribution).toHaveLength(3);
      const sum =
        phase.intensity_distribution[0] +
        phase.intensity_distribution[1] +
        phase.intensity_distribution[2];
      expect(sum).toBe(100);
    }
  });

  it('minimum plan (4 weeks) produces valid structure', () => {
    const result = calculatePeriodization(4);

    expect(result.total_weeks).toBe(4);
    expect(result.phases.length).toBeGreaterThanOrEqual(2);
    expect(result.weekly_volumes).toHaveLength(4);
  });

  it('maximum plan (52 weeks) produces valid structure', () => {
    const result = calculatePeriodization(52);

    expect(result.total_weeks).toBe(52);
    expect(result.weekly_volumes).toHaveLength(52);
    const phaseWeeksSum = result.phases.reduce((sum, p) => sum + p.weeks, 0);
    expect(phaseWeeksSum).toBe(52);
  });
});

// =============================================================================
// buildTrainingPlan
// =============================================================================

describe('buildTrainingPlan', () => {
  const periodization: PeriodizationData = calculatePeriodization(12);
  // Capture a fixed start date for deterministic tests
  const startDate = '2026-02-15';

  it('returns correct payload shape', () => {
    const plan = buildTrainingPlan(ATHLETE, GOAL_WITH_RACE, startDate, 12, periodization);

    expect(plan).toStrictEqual({
      athlete_id: 'athlete-001',
      name: '12-Week Plan: Boston Marathon',
      description: 'Training plan targeting Boston Marathon 2026 on 2026-06-15',
      start_date: '2026-02-15',
      end_date: calculateEndDate(startDate, 12),
      total_weeks: 12,
      status: 'active',
      goal_id: 'goal-001',
      periodization,
      weekly_template: null,
      adaptations: [],
    });
  });

  it('sets goal_id to null when no goal', () => {
    const plan = buildTrainingPlan(ATHLETE, null, startDate, 12, periodization);
    expect(plan.goal_id).toBeNull();
  });

  it('includes goal reference when provided', () => {
    const plan = buildTrainingPlan(ATHLETE, GOAL_WITH_RACE, startDate, 12, periodization);
    expect(plan.goal_id).toBe('goal-001');
  });

  it('sets status to active', () => {
    const plan = buildTrainingPlan(ATHLETE, null, startDate, 12, periodization);
    expect(plan.status).toBe('active');
  });

  it('sets weekly_template to null', () => {
    const plan = buildTrainingPlan(ATHLETE, null, startDate, 12, periodization);
    expect(plan.weekly_template).toBeNull();
  });

  it('sets adaptations to empty array', () => {
    const plan = buildTrainingPlan(ATHLETE, null, startDate, 12, periodization);
    expect(plan.adaptations).toStrictEqual([]);
  });

  it('generates description without target_date when goal has none', () => {
    const plan = buildTrainingPlan(ATHLETE, GOAL_NO_DATE, startDate, 12, periodization);
    expect(plan.description).toBe('Training plan targeting General fitness');
  });

  it('generates generic description when no goal', () => {
    const plan = buildTrainingPlan(ATHLETE, null, startDate, 12, periodization);
    expect(plan.description).toBe('12-week general training plan');
  });

  it('uses athlete_id from athlete data', () => {
    const plan = buildTrainingPlan(ATHLETE, null, startDate, 8, calculatePeriodization(8));
    expect(plan.athlete_id).toBe('athlete-001');
  });

  it('end_date is consistent with start_date + total_weeks', () => {
    const plan = buildTrainingPlan(ATHLETE, null, startDate, 12, periodization);
    expect(plan.end_date).toBe(calculateEndDate(startDate, 12));
  });
});
