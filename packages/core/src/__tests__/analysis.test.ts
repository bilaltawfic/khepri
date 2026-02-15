import type { ActivityRecord, FitnessDataPoint } from '../index.js';
import {
  assessRecovery,
  calculateFormTrend,
  calculateRaceReadiness,
  calculateWeeklyLoads,
  getFormStatus,
} from '../index.js';

// ============================================================================
// Test helpers
// ============================================================================

function makeDataPoint(overrides: Partial<FitnessDataPoint> & { date: string }): FitnessDataPoint {
  return { ctl: 50, atl: 50, tsb: 0, ...overrides };
}

/** Generate N consecutive daily data points starting from a date */
function generateDataPoints(
  count: number,
  start: string,
  base: Omit<FitnessDataPoint, 'date'> = { ctl: 50, atl: 50, tsb: 0 },
): FitnessDataPoint[] {
  const points: FitnessDataPoint[] = [];
  const startDate = new Date(start + 'T00:00:00');
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    points.push({ ...base, date: `${year}-${month}-${day}` });
  }
  return points;
}

function makeActivity(overrides: Partial<ActivityRecord> & { date: string }): ActivityRecord {
  return { duration: 60, tss: 100, ...overrides };
}

// ============================================================================
// getFormStatus
// ============================================================================

describe('getFormStatus', () => {
  it('returns race_ready for TSB > 15', () => {
    expect(getFormStatus(20)).toBe('race_ready');
  });

  it('returns fresh for TSB between 5 and 15 (exclusive)', () => {
    expect(getFormStatus(10)).toBe('fresh');
  });

  it('returns optimal for TSB between -10 and 5 (inclusive)', () => {
    expect(getFormStatus(0)).toBe('optimal');
  });

  it('returns tired for TSB between -25 and -10 (exclusive)', () => {
    expect(getFormStatus(-15)).toBe('tired');
  });

  it('returns overtrained for TSB < -25', () => {
    expect(getFormStatus(-30)).toBe('overtrained');
  });

  // Boundary values
  it('returns fresh at TSB exactly 15 (boundary: not race_ready)', () => {
    expect(getFormStatus(15)).toBe('fresh');
  });

  it('returns optimal at TSB exactly 5 (boundary: not fresh)', () => {
    expect(getFormStatus(5)).toBe('optimal');
  });

  it('returns optimal at TSB exactly -10 (boundary: not tired)', () => {
    expect(getFormStatus(-10)).toBe('optimal');
  });

  it('returns tired at TSB exactly -25 (boundary: not overtrained)', () => {
    expect(getFormStatus(-25)).toBe('tired');
  });

  it('returns optimal for TSB of 0', () => {
    expect(getFormStatus(0)).toBe('optimal');
  });
});

// ============================================================================
// calculateFormTrend
// ============================================================================

describe('calculateFormTrend', () => {
  it('returns null for empty array', () => {
    expect(calculateFormTrend([])).toBeNull();
  });

  it('returns null for single data point', () => {
    const data = [makeDataPoint({ date: '2025-01-01', tsb: 5 })];
    expect(calculateFormTrend(data)).toBeNull();
  });

  it('returns improving when TSB increases by more than 3', () => {
    const data = [
      makeDataPoint({ date: '2025-01-01', tsb: 0 }),
      makeDataPoint({ date: '2025-01-07', tsb: 10 }),
    ];
    const result = calculateFormTrend(data);
    expect(result?.direction).toBe('improving');
  });

  it('returns declining when TSB decreases by more than 3', () => {
    const data = [
      makeDataPoint({ date: '2025-01-01', tsb: 10 }),
      makeDataPoint({ date: '2025-01-07', tsb: 0 }),
    ];
    const result = calculateFormTrend(data);
    expect(result?.direction).toBe('declining');
  });

  it('returns stable when TSB change is within ±3', () => {
    const data = [
      makeDataPoint({ date: '2025-01-01', tsb: 5 }),
      makeDataPoint({ date: '2025-01-07', tsb: 7 }),
    ];
    const result = calculateFormTrend(data);
    expect(result?.direction).toBe('stable');
  });

  it('returns stable at exactly +3 TSB change', () => {
    const data = [
      makeDataPoint({ date: '2025-01-01', tsb: 0 }),
      makeDataPoint({ date: '2025-01-07', tsb: 3 }),
    ];
    const result = calculateFormTrend(data);
    expect(result?.direction).toBe('stable');
  });

  it('returns stable at exactly -3 TSB change', () => {
    const data = [
      makeDataPoint({ date: '2025-01-01', tsb: 3 }),
      makeDataPoint({ date: '2025-01-07', tsb: 0 }),
    ];
    const result = calculateFormTrend(data);
    expect(result?.direction).toBe('stable');
  });

  it('calculates correct average TSB', () => {
    const data = [
      makeDataPoint({ date: '2025-01-01', tsb: 10 }),
      makeDataPoint({ date: '2025-01-02', tsb: 20 }),
      makeDataPoint({ date: '2025-01-03', tsb: 30 }),
    ];
    const result = calculateFormTrend(data);
    expect(result?.averageTsb).toBe(20);
  });

  it('calculates correct CTL and ATL deltas', () => {
    const data = [
      makeDataPoint({ date: '2025-01-01', ctl: 40, atl: 50, tsb: 0 }),
      makeDataPoint({ date: '2025-01-07', ctl: 55, atl: 60, tsb: 5 }),
    ];
    const result = calculateFormTrend(data);
    expect(result?.ctlChange).toBe(15);
    expect(result?.atlChange).toBe(10);
    expect(result?.tsbChange).toBe(5);
  });

  it('sets currentTsb to the last data point TSB', () => {
    const data = [
      makeDataPoint({ date: '2025-01-01', tsb: 5 }),
      makeDataPoint({ date: '2025-01-07', tsb: -5 }),
    ];
    const result = calculateFormTrend(data);
    expect(result?.currentTsb).toBe(-5);
  });
});

// ============================================================================
// calculateWeeklyLoads
// ============================================================================

describe('calculateWeeklyLoads', () => {
  it('returns empty array for empty input', () => {
    expect(calculateWeeklyLoads([])).toEqual([]);
  });

  it('groups activities by ISO week (Monday start)', () => {
    // 2025-01-06 is a Monday, 2025-01-13 is the next Monday
    const activities = [
      makeActivity({ date: '2025-01-06', tss: 50 }),
      makeActivity({ date: '2025-01-08', tss: 60 }),
      makeActivity({ date: '2025-01-13', tss: 70 }),
    ];
    const result = calculateWeeklyLoads(activities);
    expect(result).toHaveLength(2);
    expect(result[0]?.weekStart).toBe('2025-01-06');
    expect(result[1]?.weekStart).toBe('2025-01-13');
  });

  it('calculates correct total TSS per week', () => {
    const activities = [
      makeActivity({ date: '2025-01-06', tss: 50 }),
      makeActivity({ date: '2025-01-08', tss: 60 }),
    ];
    const result = calculateWeeklyLoads(activities);
    expect(result[0]?.totalTss).toBe(110);
  });

  it('calculates correct activity count per week', () => {
    const activities = [
      makeActivity({ date: '2025-01-06', tss: 50 }),
      makeActivity({ date: '2025-01-07', tss: 60 }),
      makeActivity({ date: '2025-01-08', tss: 70 }),
    ];
    const result = calculateWeeklyLoads(activities);
    expect(result[0]?.activityCount).toBe(3);
  });

  it('calculates correct average TSS per activity', () => {
    const activities = [
      makeActivity({ date: '2025-01-06', tss: 40 }),
      makeActivity({ date: '2025-01-07', tss: 80 }),
    ];
    const result = calculateWeeklyLoads(activities);
    expect(result[0]?.averageTssPerActivity).toBe(60);
  });

  it('calculates correct total duration', () => {
    const activities = [
      makeActivity({ date: '2025-01-06', duration: 45, tss: 50 }),
      makeActivity({ date: '2025-01-07', duration: 90, tss: 60 }),
    ];
    const result = calculateWeeklyLoads(activities);
    expect(result[0]?.totalDuration).toBe(135);
  });

  it('handles activities spanning multiple weeks', () => {
    const activities = [
      makeActivity({ date: '2025-01-06', tss: 50 }),  // Week 1
      makeActivity({ date: '2025-01-13', tss: 60 }),  // Week 2
      makeActivity({ date: '2025-01-20', tss: 70 }),  // Week 3
    ];
    const result = calculateWeeklyLoads(activities);
    expect(result).toHaveLength(3);
  });

  it('returns weeks sorted by date ascending', () => {
    // Pass activities out of order
    const activities = [
      makeActivity({ date: '2025-01-20', tss: 70 }),
      makeActivity({ date: '2025-01-06', tss: 50 }),
      makeActivity({ date: '2025-01-13', tss: 60 }),
    ];
    const result = calculateWeeklyLoads(activities);
    expect(result[0]?.weekStart).toBe('2025-01-06');
    expect(result[1]?.weekStart).toBe('2025-01-13');
    expect(result[2]?.weekStart).toBe('2025-01-20');
  });

  it('assigns Sunday activities to the previous Monday week', () => {
    // 2025-01-12 is a Sunday — belongs to week starting 2025-01-06 (Monday)
    const activities = [makeActivity({ date: '2025-01-12', tss: 50 })];
    const result = calculateWeeklyLoads(activities);
    expect(result[0]?.weekStart).toBe('2025-01-06');
  });
});

// ============================================================================
// assessRecovery
// ============================================================================

describe('assessRecovery', () => {
  it('returns null for fewer than 7 data points', () => {
    const data = generateDataPoints(6, '2025-01-01');
    expect(assessRecovery(data)).toBeNull();
  });

  it('returns low fatigue for ATL < 40', () => {
    const data = generateDataPoints(7, '2025-01-01', { ctl: 50, atl: 30, tsb: 20 });
    const result = assessRecovery(data);
    expect(result?.fatigueLevel).toBe('low');
  });

  it('returns moderate fatigue for ATL 40-70', () => {
    const data = generateDataPoints(7, '2025-01-01', { ctl: 50, atl: 55, tsb: -5 });
    const result = assessRecovery(data);
    expect(result?.fatigueLevel).toBe('moderate');
  });

  it('returns high fatigue for ATL 70-90', () => {
    const data = generateDataPoints(7, '2025-01-01', { ctl: 50, atl: 80, tsb: -30 });
    const result = assessRecovery(data);
    expect(result?.fatigueLevel).toBe('high');
  });

  it('returns very_high fatigue for ATL > 90', () => {
    const data = generateDataPoints(7, '2025-01-01', { ctl: 50, atl: 95, tsb: -45 });
    const result = assessRecovery(data);
    expect(result?.fatigueLevel).toBe('very_high');
  });

  it('detects overreaching when ramp rate > 7', () => {
    const data = [
      ...generateDataPoints(6, '2025-01-01', { ctl: 40, atl: 50, tsb: -10 }),
      makeDataPoint({ date: '2025-01-07', ctl: 50, atl: 50, tsb: 0 }),
    ];
    // rampRate = 50 - 40 = 10 > 7
    const result = assessRecovery(data);
    expect(result?.isOverreaching).toBe(true);
    expect(result?.rampRate).toBe(10);
  });

  it('does not flag overreaching when ramp rate <= 7', () => {
    const data = generateDataPoints(7, '2025-01-01', { ctl: 50, atl: 50, tsb: 0 });
    const result = assessRecovery(data);
    expect(result?.isOverreaching).toBe(false);
    expect(result?.rampRate).toBe(0);
  });

  it('suggests correct recovery days per fatigue level', () => {
    const lowData = generateDataPoints(7, '2025-01-01', { ctl: 50, atl: 30, tsb: 20 });
    expect(assessRecovery(lowData)?.suggestedRecoveryDays).toBe(0);

    const modData = generateDataPoints(7, '2025-01-01', { ctl: 50, atl: 55, tsb: -5 });
    expect(assessRecovery(modData)?.suggestedRecoveryDays).toBe(1);

    const highData = generateDataPoints(7, '2025-01-01', { ctl: 50, atl: 80, tsb: -30 });
    expect(assessRecovery(highData)?.suggestedRecoveryDays).toBe(2);

    const vHighData = generateDataPoints(7, '2025-01-01', { ctl: 50, atl: 95, tsb: -45 });
    expect(assessRecovery(vHighData)?.suggestedRecoveryDays).toBe(3);
  });

  // Boundary values for ATL thresholds
  it('returns moderate at ATL exactly 40 (boundary: not low)', () => {
    const data = generateDataPoints(7, '2025-01-01', { ctl: 50, atl: 40, tsb: 10 });
    // ATL 40 is NOT > 40, so it falls to the else branch => low
    // Wait, let's re-check: > 40 means 40 is NOT moderate, it's low
    expect(assessRecovery(data)?.fatigueLevel).toBe('low');
  });

  it('returns high at ATL exactly 70 (boundary: not moderate)', () => {
    const data = generateDataPoints(7, '2025-01-01', { ctl: 50, atl: 70, tsb: -20 });
    // ATL 70 is NOT > 70, so it falls to moderate
    expect(assessRecovery(data)?.fatigueLevel).toBe('moderate');
  });

  it('returns very_high at ATL exactly 90 (boundary: not high)', () => {
    const data = generateDataPoints(7, '2025-01-01', { ctl: 50, atl: 90, tsb: -40 });
    // ATL 90 is NOT > 90, so it falls to high
    expect(assessRecovery(data)?.fatigueLevel).toBe('high');
  });

  it('returns overreaching exactly at ramp rate 7 (boundary)', () => {
    // rampRate = 7, which is NOT > 7 => not overreaching
    const data = [
      ...generateDataPoints(6, '2025-01-01', { ctl: 43, atl: 50, tsb: -7 }),
      makeDataPoint({ date: '2025-01-07', ctl: 50, atl: 50, tsb: 0 }),
    ];
    const result = assessRecovery(data);
    expect(result?.isOverreaching).toBe(false);
  });
});

// ============================================================================
// calculateRaceReadiness
// ============================================================================

describe('calculateRaceReadiness', () => {
  const today = '2025-03-01';

  it('returns null for fewer than 7 data points', () => {
    const data = generateDataPoints(6, '2025-02-23');
    expect(calculateRaceReadiness(data, '2025-04-01', today)).toBeNull();
  });

  it('returns null when race date is in the past', () => {
    const data = generateDataPoints(7, '2025-02-22');
    expect(calculateRaceReadiness(data, '2025-02-01', today)).toBeNull();
  });

  it('calculates correct days until race', () => {
    const data = generateDataPoints(7, '2025-02-22', { ctl: 50, atl: 50, tsb: 0 });
    const result = calculateRaceReadiness(data, '2025-03-15', today);
    expect(result?.daysUntilRace).toBe(14);
  });

  it('projects TSB using trend extrapolation', () => {
    // Create a trend where TSB is improving
    const data: FitnessDataPoint[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date('2025-02-22T00:00:00');
      date.setDate(date.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      data.push({
        date: `${year}-${month}-${day}`,
        ctl: 50 + i,
        atl: 50 - i,
        tsb: 2 * i, // TSB increases by 2 per day
      });
    }
    // Last point: date=2025-02-28, tsb=12
    // Trend over 7 points: tsbChange = 12 - 0 = 12, dailyChange = 12/7
    // daysUntilRace = 1 (from 2025-03-01 to 2025-03-02)
    // projectedTsb = 12 + (12/7) * 1 ≈ 13.71
    const result = calculateRaceReadiness(data, '2025-03-02', today);
    expect(result?.projectedTsb).toBeCloseTo(12 + 12 / 7, 2);
  });

  it('provides race week recommendation for ≤2 days out', () => {
    const data = generateDataPoints(14, '2025-02-15', { ctl: 60, atl: 40, tsb: 20 });
    const result = calculateRaceReadiness(data, '2025-03-02', today);
    // 1 day out
    expect(result?.recommendation).toBe('Race week - rest and stay fresh.');
  });

  it('provides taper recommendation for ≤14 days out', () => {
    const data = generateDataPoints(14, '2025-02-15', { ctl: 60, atl: 40, tsb: 20 });
    const result = calculateRaceReadiness(data, '2025-03-10', today);
    // 9 days out
    expect(result?.recommendation).toBe('Taper phase - reduce volume, maintain intensity.');
  });

  it('provides final build recommendation for ≤28 days out', () => {
    const data = generateDataPoints(14, '2025-02-15', { ctl: 60, atl: 40, tsb: 20 });
    const result = calculateRaceReadiness(data, '2025-03-25', today);
    // 24 days out
    expect(result?.recommendation).toBe('Final build - key workouts then begin taper.');
  });

  it('provides building recommendation for >28 days out', () => {
    const data = generateDataPoints(14, '2025-02-15', { ctl: 60, atl: 40, tsb: 20 });
    const result = calculateRaceReadiness(data, '2025-05-01', today);
    // 61 days out
    expect(result?.recommendation).toBe('Continue building fitness with progressive overload.');
  });

  it('returns high confidence for close race with sufficient data', () => {
    const data = generateDataPoints(14, '2025-02-15', { ctl: 60, atl: 40, tsb: 20 });
    const result = calculateRaceReadiness(data, '2025-03-05', today);
    // 4 days out, 14 data points >= 14
    expect(result?.confidence).toBe('high');
  });

  it('returns medium confidence for race within 21 days', () => {
    const data = generateDataPoints(7, '2025-02-22', { ctl: 60, atl: 40, tsb: 20 });
    const result = calculateRaceReadiness(data, '2025-03-15', today);
    // 14 days out, but only 7 data points (not enough for high even if close)
    expect(result?.confidence).toBe('medium');
  });

  it('returns low confidence for distant race', () => {
    const data = generateDataPoints(14, '2025-02-15', { ctl: 60, atl: 40, tsb: 20 });
    const result = calculateRaceReadiness(data, '2025-05-01', today);
    // 61 days out
    expect(result?.confidence).toBe('low');
  });

  it('accepts optional today parameter for deterministic testing', () => {
    const data = generateDataPoints(7, '2025-02-22', { ctl: 60, atl: 40, tsb: 20 });
    const result1 = calculateRaceReadiness(data, '2025-04-01', '2025-03-01');
    const result2 = calculateRaceReadiness(data, '2025-04-01', '2025-03-01');
    expect(result1).toEqual(result2);
  });

  it('returns correct form status based on current TSB', () => {
    const data = generateDataPoints(7, '2025-02-22', { ctl: 60, atl: 40, tsb: 20 });
    const result = calculateRaceReadiness(data, '2025-04-01', today);
    expect(result?.currentForm).toBe('race_ready');
  });

  it('handles race on the same day (0 days out)', () => {
    const data = generateDataPoints(7, '2025-02-22', { ctl: 60, atl: 40, tsb: 20 });
    const result = calculateRaceReadiness(data, '2025-03-01', today);
    expect(result?.daysUntilRace).toBe(0);
    expect(result).not.toBeNull();
  });
});
