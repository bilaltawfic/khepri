import { describe, expect, it } from '@jest/globals';
import {
  computeBlockCompliance,
  computeWeeklyCompliance,
  computeWorkoutCompliance,
} from './compliance.js';

// =============================================================================
// computeWorkoutCompliance
// =============================================================================

describe('computeWorkoutCompliance', () => {
  // COMPLY-01: Green threshold (80-120%)
  describe('green threshold', () => {
    it('returns green at exactly 80% (lower bound)', () => {
      const result = computeWorkoutCompliance({ duration_minutes: 100 }, { duration_minutes: 80 });
      expect(result.score).toBe('green');
      expect(result.direction).toBe('on_target');
      expect(result.ratio).toBeCloseTo(0.8);
    });

    it('returns green at exactly 100%', () => {
      const result = computeWorkoutCompliance({ duration_minutes: 60 }, { duration_minutes: 60 });
      expect(result.score).toBe('green');
      expect(result.direction).toBe('on_target');
    });

    it('returns green at exactly 120% (upper bound)', () => {
      const result = computeWorkoutCompliance({ duration_minutes: 100 }, { duration_minutes: 120 });
      expect(result.score).toBe('green');
      expect(result.direction).toBe('on_target');
      expect(result.ratio).toBeCloseTo(1.2);
    });
  });

  // COMPLY-02: Amber threshold (50-79%, 121-150%)
  describe('amber threshold', () => {
    it('returns amber at 50% (lower amber bound, under)', () => {
      const result = computeWorkoutCompliance({ duration_minutes: 100 }, { duration_minutes: 50 });
      expect(result.score).toBe('amber');
      expect(result.direction).toBe('under');
    });

    it('returns amber at 79% (upper amber-under bound)', () => {
      const result = computeWorkoutCompliance({ duration_minutes: 100 }, { duration_minutes: 79 });
      expect(result.score).toBe('amber');
      expect(result.direction).toBe('under');
    });

    it('returns amber at 121% (lower amber-over bound)', () => {
      const result = computeWorkoutCompliance({ duration_minutes: 100 }, { duration_minutes: 121 });
      expect(result.score).toBe('amber');
      expect(result.direction).toBe('over');
    });

    it('returns amber at 150% (upper amber-over bound)', () => {
      const result = computeWorkoutCompliance({ duration_minutes: 100 }, { duration_minutes: 150 });
      expect(result.score).toBe('amber');
      expect(result.direction).toBe('over');
    });
  });

  // COMPLY-03: Red threshold (<50%, >150%)
  describe('red threshold', () => {
    it('returns red at 49% (just below amber-under bound)', () => {
      const result = computeWorkoutCompliance({ duration_minutes: 100 }, { duration_minutes: 49 });
      expect(result.score).toBe('red');
      expect(result.direction).toBe('under');
    });

    it('returns red at 0% actual', () => {
      const result = computeWorkoutCompliance({ duration_minutes: 60 }, { duration_minutes: 0 });
      expect(result.score).toBe('red');
      expect(result.direction).toBe('under');
      expect(result.ratio).toBe(0);
    });

    it('returns red at 151% (just above amber-over bound)', () => {
      const result = computeWorkoutCompliance({ duration_minutes: 100 }, { duration_minutes: 151 });
      expect(result.score).toBe('red');
      expect(result.direction).toBe('over');
    });

    it('returns red at 200%', () => {
      const result = computeWorkoutCompliance({ duration_minutes: 60 }, { duration_minutes: 120 });
      expect(result.score).toBe('red');
      expect(result.direction).toBe('over');
    });
  });

  // COMPLY-04: Missed workout (no actual data) — handled by caller, not here
  // computeWorkoutCompliance receives 0 actual when duration is 0
  it('returns red for 0 actual duration (near-miss)', () => {
    const result = computeWorkoutCompliance({ duration_minutes: 60 }, { duration_minutes: 0 });
    expect(result.score).toBe('red');
    expect(result.ratio).toBe(0);
  });

  // COMPLY-05: Unplanned activity (no planned workout)
  it('returns unplanned when planned duration is 0', () => {
    const result = computeWorkoutCompliance({ duration_minutes: 0 }, { duration_minutes: 45 });
    expect(result.score).toBe('unplanned');
    expect(result.planned_value).toBe(0);
    expect(result.actual_value).toBe(45);
  });

  // COMPLY-06: Metric priority (TSS > Duration > Distance)
  describe('metric priority', () => {
    it('uses TSS when both planned and actual TSS are available', () => {
      const result = computeWorkoutCompliance(
        { duration_minutes: 60, tss: 100 },
        { duration_minutes: 60, tss: 90 }
      );
      expect(result.metric_used).toBe('tss');
      expect(result.planned_value).toBe(100);
      expect(result.actual_value).toBe(90);
    });

    it('falls back to duration when TSS is null on planned', () => {
      const result = computeWorkoutCompliance(
        { duration_minutes: 60, tss: null },
        { duration_minutes: 60, tss: 90 }
      );
      expect(result.metric_used).toBe('duration');
    });

    it('falls back to duration when TSS is null on actual', () => {
      const result = computeWorkoutCompliance(
        { duration_minutes: 60, tss: 100 },
        { duration_minutes: 60, tss: null }
      );
      expect(result.metric_used).toBe('duration');
    });

    it('uses duration over distance when TSS unavailable (priority: TSS > Duration > Distance)', () => {
      // Per spec, duration takes precedence over distance when TSS is unavailable.
      // Distance is only used when duration is genuinely absent (both sides are 0).
      const result = computeWorkoutCompliance(
        { duration_minutes: 60, tss: null, distance_meters: 10000 },
        { duration_minutes: 65, tss: null, distance_meters: 9500 }
      );
      expect(result.metric_used).toBe('duration');
      expect(result.planned_value).toBe(60);
      expect(result.actual_value).toBe(65);
    });

    it('uses distance when TSS unavailable and both duration values are zero', () => {
      // Edge case: distance-only activity with no meaningful duration
      const result = computeWorkoutCompliance(
        { duration_minutes: 0, tss: null, distance_meters: 10000 },
        { duration_minutes: 0, tss: null, distance_meters: 9500 }
      );
      // Note: planned duration = 0 is treated as unplanned before metric selection is reached
      expect(result.score).toBe('unplanned');
    });

    it('uses duration when neither TSS nor distance is available', () => {
      const result = computeWorkoutCompliance({ duration_minutes: 60 }, { duration_minutes: 48 });
      expect(result.metric_used).toBe('duration');
      expect(result.planned_value).toBe(60);
      expect(result.actual_value).toBe(48);
    });

    it('falls back to duration when distance is null on one side', () => {
      const result = computeWorkoutCompliance(
        { duration_minutes: 60, distance_meters: null },
        { duration_minutes: 60, distance_meters: 5000 }
      );
      expect(result.metric_used).toBe('duration');
    });
  });

  // Edge: planned TSS = 0 but duration > 0 → unplanned
  it('returns unplanned when planned TSS is 0 (after metric selection)', () => {
    const result = computeWorkoutCompliance(
      { duration_minutes: 60, tss: 0 },
      { duration_minutes: 60, tss: 50 }
    );
    expect(result.score).toBe('unplanned');
  });

  it('includes correct planned_value and actual_value in result', () => {
    const result = computeWorkoutCompliance(
      { duration_minutes: 60, tss: 80 },
      { duration_minutes: 70, tss: 100 }
    );
    expect(result.planned_value).toBe(80);
    expect(result.actual_value).toBe(100);
  });
});

// =============================================================================
// computeWeeklyCompliance
// =============================================================================

describe('computeWeeklyCompliance', () => {
  // COMPLY-07: Weekly score computed correctly from individual workouts
  it('computes score as weighted average (green=1, amber=0.5, red=0, missed=0)', () => {
    const workouts = [
      {
        compliance: {
          score: 'green' as const,
          metric_used: 'duration' as const,
          planned_value: 60,
          actual_value: 60,
          ratio: 1,
          direction: 'on_target' as const,
        },
        planned_duration_minutes: 60,
      },
      {
        compliance: {
          score: 'amber' as const,
          metric_used: 'duration' as const,
          planned_value: 60,
          actual_value: 40,
          ratio: 0.67,
          direction: 'under' as const,
        },
        planned_duration_minutes: 60,
      },
      {
        compliance: {
          score: 'red' as const,
          metric_used: 'duration' as const,
          planned_value: 60,
          actual_value: 20,
          ratio: 0.33,
          direction: 'under' as const,
        },
        planned_duration_minutes: 60,
      },
    ];
    const result = computeWeeklyCompliance(workouts);
    // (1.0 + 0.5 + 0.0) / 3 = 0.5
    expect(result.compliance_score).toBeCloseTo(0.5);
    expect(result.planned_sessions).toBe(3);
    expect(result.completed_sessions).toBe(3);
    expect(result.missed_sessions).toBe(0);
    expect(result.green_count).toBe(1);
    expect(result.amber_count).toBe(1);
    expect(result.red_count).toBe(1);
  });

  it('counts missed workouts (null compliance, planned duration > 0)', () => {
    const workouts = [
      { compliance: null, planned_duration_minutes: 60 },
      { compliance: null, planned_duration_minutes: 45 },
    ];
    const result = computeWeeklyCompliance(workouts);
    expect(result.missed_sessions).toBe(2);
    expect(result.planned_sessions).toBe(2);
    expect(result.compliance_score).toBe(0);
  });

  it('excludes rest days (planned duration = 0, null compliance)', () => {
    const workouts = [
      { compliance: null, planned_duration_minutes: 0 },
      { compliance: null, planned_duration_minutes: 0 },
      {
        compliance: {
          score: 'green' as const,
          metric_used: 'duration' as const,
          planned_value: 60,
          actual_value: 60,
          ratio: 1,
          direction: 'on_target' as const,
        },
        planned_duration_minutes: 60,
      },
    ];
    const result = computeWeeklyCompliance(workouts);
    expect(result.planned_sessions).toBe(1);
    expect(result.compliance_score).toBe(1.0);
  });

  it('counts unplanned sessions separately', () => {
    const workouts = [
      {
        compliance: {
          score: 'unplanned' as const,
          metric_used: 'duration' as const,
          planned_value: 0,
          actual_value: 30,
          ratio: 0,
          direction: 'on_target' as const,
        },
        planned_duration_minutes: 0,
      },
    ];
    const result = computeWeeklyCompliance(workouts);
    expect(result.unplanned_sessions).toBe(1);
    expect(result.planned_sessions).toBe(0);
  });

  // COMPLY-08: Weekly color thresholds (>=0.8 green, >=0.5 amber, <0.5 red)
  describe('color thresholds', () => {
    it('returns green for score >= 0.8', () => {
      const workouts = Array.from({ length: 5 }, () => ({
        compliance: {
          score: 'green' as const,
          metric_used: 'duration' as const,
          planned_value: 60,
          actual_value: 60,
          ratio: 1,
          direction: 'on_target' as const,
        },
        planned_duration_minutes: 60,
      }));
      const result = computeWeeklyCompliance(workouts);
      expect(result.compliance_color).toBe('green');
    });

    it('returns amber for score >= 0.5 and < 0.8', () => {
      // 3 amber (0.5 each) + 3 missed (0) = 6 sessions, score = 3*0.5/6 = 0.25 — need different setup
      // 4 green (1.0) + 1 missed (0) + 1 missed (0) = 6 sessions → 4/6 ≈ 0.67 → amber
      const workouts = [
        ...Array.from({ length: 4 }, () => ({
          compliance: {
            score: 'green' as const,
            metric_used: 'duration' as const,
            planned_value: 60,
            actual_value: 60,
            ratio: 1,
            direction: 'on_target' as const,
          },
          planned_duration_minutes: 60,
        })),
        { compliance: null, planned_duration_minutes: 60 },
        { compliance: null, planned_duration_minutes: 60 },
      ];
      const result = computeWeeklyCompliance(workouts);
      expect(result.compliance_color).toBe('amber');
    });

    it('returns red for score < 0.5', () => {
      const workouts = Array.from({ length: 5 }, () => ({
        compliance: null,
        planned_duration_minutes: 60,
      }));
      const result = computeWeeklyCompliance(workouts);
      expect(result.compliance_score).toBe(0);
      expect(result.compliance_color).toBe('red');
    });
  });

  it('accumulates planned and actual hours', () => {
    const workouts = [
      { compliance: null, planned_duration_minutes: 60, actual_duration_minutes: 55 },
      { compliance: null, planned_duration_minutes: 90, actual_duration_minutes: null },
    ];
    const result = computeWeeklyCompliance(workouts);
    expect(result.planned_hours).toBeCloseTo(2.5);
    expect(result.actual_hours).toBeCloseTo(55 / 60);
  });

  it('accumulates planned and actual TSS', () => {
    const workouts = [
      { compliance: null, planned_duration_minutes: 60, planned_tss: 80, actual_tss: 70 },
      { compliance: null, planned_duration_minutes: 45, planned_tss: 50, actual_tss: null },
    ];
    const result = computeWeeklyCompliance(workouts);
    expect(result.planned_tss).toBe(130);
    expect(result.actual_tss).toBe(70);
  });

  // Edge: all workouts missed → score = 0, color = red
  it('scores 0 and returns red when all workouts are missed', () => {
    const workouts = [
      { compliance: null, planned_duration_minutes: 60 },
      { compliance: null, planned_duration_minutes: 45 },
      { compliance: null, planned_duration_minutes: 90 },
    ];
    const result = computeWeeklyCompliance(workouts);
    expect(result.compliance_score).toBe(0);
    expect(result.compliance_color).toBe('red');
    expect(result.missed_sessions).toBe(3);
  });

  it('returns 0 score for empty workout list', () => {
    const result = computeWeeklyCompliance([]);
    expect(result.compliance_score).toBe(0);
    expect(result.planned_sessions).toBe(0);
  });
});

// =============================================================================
// computeBlockCompliance
// =============================================================================

describe('computeBlockCompliance', () => {
  // COMPLY-09: Block compliance aggregates weekly scores
  it('averages weekly compliance scores', () => {
    const weeks = [
      {
        planned_sessions: 5,
        completed_sessions: 5,
        missed_sessions: 0,
        unplanned_sessions: 0,
        green_count: 5,
        amber_count: 0,
        red_count: 0,
        compliance_score: 1.0,
        compliance_color: 'green' as const,
        planned_hours: 5,
        actual_hours: 5,
        planned_tss: 300,
        actual_tss: 300,
      },
      {
        planned_sessions: 5,
        completed_sessions: 4,
        missed_sessions: 1,
        unplanned_sessions: 0,
        green_count: 4,
        amber_count: 0,
        red_count: 0,
        compliance_score: 0.8,
        compliance_color: 'green' as const,
        planned_hours: 5,
        actual_hours: 4,
        planned_tss: 300,
        actual_tss: 240,
      },
      {
        planned_sessions: 5,
        completed_sessions: 3,
        missed_sessions: 2,
        unplanned_sessions: 0,
        green_count: 3,
        amber_count: 0,
        red_count: 0,
        compliance_score: 0.6,
        compliance_color: 'amber' as const,
        planned_hours: 5,
        actual_hours: 3,
        planned_tss: 300,
        actual_tss: 180,
      },
    ];
    const result = computeBlockCompliance(weeks);
    expect(result.total_weeks).toBe(3);
    expect(result.weeks_completed).toBe(3);
    expect(result.overall_score).toBeCloseTo((1.0 + 0.8 + 0.6) / 3);
  });

  it('returns green overall color for score >= 0.8', () => {
    const weeks = Array.from({ length: 3 }, () => ({
      planned_sessions: 5,
      completed_sessions: 5,
      missed_sessions: 0,
      unplanned_sessions: 0,
      green_count: 5,
      amber_count: 0,
      red_count: 0,
      compliance_score: 1.0,
      compliance_color: 'green' as const,
      planned_hours: 5,
      actual_hours: 5,
      planned_tss: 300,
      actual_tss: 300,
    }));
    const result = computeBlockCompliance(weeks);
    expect(result.overall_color).toBe('green');
  });

  it('returns amber overall color for score >= 0.5 < 0.8', () => {
    const weeks = Array.from({ length: 2 }, () => ({
      planned_sessions: 5,
      completed_sessions: 4,
      missed_sessions: 1,
      unplanned_sessions: 0,
      green_count: 4,
      amber_count: 0,
      red_count: 0,
      compliance_score: 0.65,
      compliance_color: 'amber' as const,
      planned_hours: 5,
      actual_hours: 4,
      planned_tss: 300,
      actual_tss: 240,
    }));
    const result = computeBlockCompliance(weeks);
    expect(result.overall_color).toBe('amber');
  });

  it('returns red overall color for score < 0.5', () => {
    const weeks = Array.from({ length: 2 }, () => ({
      planned_sessions: 5,
      completed_sessions: 1,
      missed_sessions: 4,
      unplanned_sessions: 0,
      green_count: 1,
      amber_count: 0,
      red_count: 0,
      compliance_score: 0.2,
      compliance_color: 'red' as const,
      planned_hours: 5,
      actual_hours: 1,
      planned_tss: 300,
      actual_tss: 60,
    }));
    const result = computeBlockCompliance(weeks);
    expect(result.overall_color).toBe('red');
  });

  it('excludes weeks with no planned sessions from average', () => {
    const weeks = [
      {
        planned_sessions: 0,
        completed_sessions: 0,
        missed_sessions: 0,
        unplanned_sessions: 2,
        green_count: 0,
        amber_count: 0,
        red_count: 0,
        compliance_score: 0,
        compliance_color: 'red' as const,
        planned_hours: 0,
        actual_hours: 1,
        planned_tss: 0,
        actual_tss: 0,
      },
      {
        planned_sessions: 5,
        completed_sessions: 5,
        missed_sessions: 0,
        unplanned_sessions: 0,
        green_count: 5,
        amber_count: 0,
        red_count: 0,
        compliance_score: 1.0,
        compliance_color: 'green' as const,
        planned_hours: 5,
        actual_hours: 5,
        planned_tss: 300,
        actual_tss: 300,
      },
    ];
    const result = computeBlockCompliance(weeks);
    expect(result.weeks_completed).toBe(1);
    expect(result.overall_score).toBeCloseTo(1.0);
  });

  it('returns 0 and red for empty weeks array', () => {
    const result = computeBlockCompliance([]);
    expect(result.overall_score).toBe(0);
    expect(result.overall_color).toBe('red');
    expect(result.total_weeks).toBe(0);
    expect(result.weeks_completed).toBe(0);
  });

  describe('trend', () => {
    it('returns improving when last 3 weeks increase by more than 0.1', () => {
      const makeWeek = (score: number) => ({
        planned_sessions: 5,
        completed_sessions: 5,
        missed_sessions: 0,
        unplanned_sessions: 0,
        green_count: 5,
        amber_count: 0,
        red_count: 0,
        compliance_score: score,
        compliance_color: 'green' as const,
        planned_hours: 5,
        actual_hours: 5,
        planned_tss: 300,
        actual_tss: 300,
      });
      const weeks = [makeWeek(0.5), makeWeek(0.6), makeWeek(0.7), makeWeek(0.8), makeWeek(0.9)];
      // last 3 weeks: 0.7, 0.8, 0.9 → delta = 0.9 - 0.7 = 0.2 → improving
      const result = computeBlockCompliance(weeks);
      expect(result.trend).toBe('improving');
    });

    it('returns declining when last 3 weeks decrease by more than 0.1', () => {
      const makeWeek = (score: number) => ({
        planned_sessions: 5,
        completed_sessions: 5,
        missed_sessions: 0,
        unplanned_sessions: 0,
        green_count: 5,
        amber_count: 0,
        red_count: 0,
        compliance_score: score,
        compliance_color: 'green' as const,
        planned_hours: 5,
        actual_hours: 5,
        planned_tss: 300,
        actual_tss: 300,
      });
      const weeks = [makeWeek(0.9), makeWeek(0.8), makeWeek(0.7), makeWeek(0.6), makeWeek(0.5)];
      // last 3 weeks: 0.7, 0.6, 0.5 → delta = 0.5 - 0.7 = -0.2 → declining
      const result = computeBlockCompliance(weeks);
      expect(result.trend).toBe('declining');
    });

    it('returns stable when last 3 weeks change by <= 0.1', () => {
      const makeWeek = (score: number) => ({
        planned_sessions: 5,
        completed_sessions: 5,
        missed_sessions: 0,
        unplanned_sessions: 0,
        green_count: 5,
        amber_count: 0,
        red_count: 0,
        compliance_score: score,
        compliance_color: 'green' as const,
        planned_hours: 5,
        actual_hours: 5,
        planned_tss: 300,
        actual_tss: 300,
      });
      const weeks = [makeWeek(0.8), makeWeek(0.8), makeWeek(0.8), makeWeek(0.82), makeWeek(0.85)];
      // last 3 weeks: 0.8, 0.82, 0.85 → delta = 0.05 → stable
      const result = computeBlockCompliance(weeks);
      expect(result.trend).toBe('stable');
    });

    it('returns stable when fewer than 3 scored weeks', () => {
      const weeks = [
        {
          planned_sessions: 5,
          completed_sessions: 5,
          missed_sessions: 0,
          unplanned_sessions: 0,
          green_count: 5,
          amber_count: 0,
          red_count: 0,
          compliance_score: 0.9,
          compliance_color: 'green' as const,
          planned_hours: 5,
          actual_hours: 5,
          planned_tss: 300,
          actual_tss: 300,
        },
        {
          planned_sessions: 5,
          completed_sessions: 4,
          missed_sessions: 1,
          unplanned_sessions: 0,
          green_count: 4,
          amber_count: 0,
          red_count: 0,
          compliance_score: 0.8,
          compliance_color: 'green' as const,
          planned_hours: 5,
          actual_hours: 4,
          planned_tss: 300,
          actual_tss: 240,
        },
      ];
      const result = computeBlockCompliance(weeks);
      expect(result.trend).toBe('stable');
    });
  });
});
