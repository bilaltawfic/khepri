import { describe, expect, it } from '@jest/globals';
import type { BlockPhase } from '../index.js';
import type { Workout } from '../types/workout.js';
import type { AdaptationContext, CheckInData, WellnessData } from '../utils/adaptation-engine.js';
import {
  ADAPTATION_TYPES,
  buildAdaptationPrompt,
  buildAfterSnapshot,
  extractSwappableContent,
  isAdaptationConfidence,
  isAdaptationType,
  parseAdaptationResponse,
  screenAdaptation,
  snapshotWorkout,
} from '../utils/adaptation-engine.js';

// =============================================================================
// Test fixtures
// =============================================================================

function makeCheckIn(overrides?: Partial<CheckInData>): CheckInData {
  return {
    sleepQuality: 7,
    sleepHours: 8,
    energy: 7,
    stress: 4,
    soreness: 3,
    availableTimeMinutes: null,
    ...overrides,
  };
}

function makeWellness(overrides?: Partial<WellnessData>): WellnessData {
  return {
    ctl: 60,
    atl: 55,
    tsb: 5,
    ...overrides,
  };
}

function makeBlockPhase(overrides?: Partial<BlockPhase>): BlockPhase {
  return {
    name: 'Build',
    focus: 'build',
    weeks: 4,
    weeklyHours: 10,
    ...overrides,
  };
}

function makeWorkout(overrides?: Partial<Workout>): Workout {
  return {
    id: 'workout-1',
    blockId: 'block-1',
    athleteId: 'athlete-1',
    date: '2025-04-04',
    weekNumber: 1,
    name: 'Threshold Run',
    sport: 'run',
    workoutType: 'threshold',
    plannedDurationMinutes: 60,
    plannedTss: 80,
    structure: {
      sections: [],
      totalDurationMinutes: 60,
    },
    descriptionDsl: '',
    intervalsTarget: 'PACE',
    syncStatus: 'pending',
    externalId: 'ext-1',
    actualDurationMinutes: null,
    actualTss: null,
    completedAt: null,
    compliance: null,
    ...overrides,
  };
}

function makeContext(overrides?: Partial<AdaptationContext>): AdaptationContext {
  return {
    plannedWorkout: makeWorkout(),
    checkIn: makeCheckIn(),
    wellness: makeWellness(),
    weekWorkouts: [],
    weekCompliance: { plannedMinutes: 300, completedMinutes: 240, completionRate: 0.8 },
    blockPhase: makeBlockPhase(),
    ...overrides,
  };
}

// =============================================================================
// isAdaptationType
// =============================================================================

describe('isAdaptationType', () => {
  it.each([...ADAPTATION_TYPES])('returns true for valid type "%s"', (type) => {
    expect(isAdaptationType(type)).toBe(true);
  });

  it('returns false for invalid string', () => {
    expect(isAdaptationType('add_volume')).toBe(false);
    expect(isAdaptationType('')).toBe(false);
    expect(isAdaptationType('NO_CHANGE')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isAdaptationType(null)).toBe(false);
    expect(isAdaptationType(123)).toBe(false);
    expect(isAdaptationType(undefined)).toBe(false);
    expect(isAdaptationType({})).toBe(false);
  });
});

// =============================================================================
// isAdaptationConfidence
// =============================================================================

describe('isAdaptationConfidence', () => {
  it.each(['high', 'medium', 'low'])('returns true for "%s"', (confidence) => {
    expect(isAdaptationConfidence(confidence)).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(isAdaptationConfidence('very_high')).toBe(false);
    expect(isAdaptationConfidence(null)).toBe(false);
  });
});

// =============================================================================
// screenAdaptation
// =============================================================================

describe('screenAdaptation', () => {
  it('returns no_change when all metrics are good', () => {
    const result = screenAdaptation(makeCheckIn(), makeWellness(), makeBlockPhase());
    expect(result).toContain('no_change');
  });

  it('suggests reduce_intensity when sleep is poor', () => {
    const checkIn = makeCheckIn({ sleepQuality: 3, sleepHours: 5 });
    const result = screenAdaptation(checkIn, null, makeBlockPhase());
    expect(result).toContain('reduce_intensity');
    expect(result).toContain('swap_days');
  });

  it('suggests reduce_intensity when TSB is very negative (< -20)', () => {
    const wellness = makeWellness({ tsb: -25 });
    const result = screenAdaptation(makeCheckIn(), wellness, makeBlockPhase());
    expect(result).toContain('reduce_intensity');
  });

  it('does NOT suggest increase_intensity in taper phase', () => {
    const wellness = makeWellness({ tsb: 15 }); // Fresh
    const blockPhase = makeBlockPhase({ focus: 'taper' });
    const result = screenAdaptation(makeCheckIn(), wellness, blockPhase);
    expect(result).not.toContain('increase_intensity');
  });

  it('does NOT suggest increase_intensity in recovery phase', () => {
    const wellness = makeWellness({ tsb: 15 });
    const blockPhase = makeBlockPhase({ focus: 'recovery' });
    const result = screenAdaptation(makeCheckIn(), wellness, blockPhase);
    expect(result).not.toContain('increase_intensity');
  });

  it('suggests increase_intensity when TSB > 10 in build phase', () => {
    const wellness = makeWellness({ tsb: 12 });
    const result = screenAdaptation(makeCheckIn(), wellness, makeBlockPhase());
    expect(result).toContain('increase_intensity');
  });

  it('suggests add_rest and reduce_intensity for low energy', () => {
    const checkIn = makeCheckIn({ energy: 3 });
    const result = screenAdaptation(checkIn, null, makeBlockPhase());
    expect(result).toContain('add_rest');
    expect(result).toContain('reduce_intensity');
  });

  it('suggests substitute or add_rest for high soreness (> 7)', () => {
    const checkIn = makeCheckIn({ soreness: 8 });
    const result = screenAdaptation(checkIn, null, makeBlockPhase());
    expect(result).toContain('substitute');
    expect(result).toContain('add_rest');
  });

  it('deduplicates suggestions', () => {
    // Poor sleep + low energy both suggest reduce_intensity
    const checkIn = makeCheckIn({ sleepQuality: 3, sleepHours: 5, energy: 3 });
    const result = screenAdaptation(checkIn, null, makeBlockPhase());
    const reduceCount = result.filter((t) => t === 'reduce_intensity').length;
    expect(reduceCount).toBe(1);
  });

  it('includes reduce_duration when available time is less than planned', () => {
    const checkIn = makeCheckIn({ availableTimeMinutes: 30 });
    // plannedDurationMinutes=60, available=30 → constrained
    const result = screenAdaptation(checkIn, null, makeBlockPhase(), 60);
    expect(result).toContain('reduce_duration');
  });

  it('does NOT include reduce_duration when available time exceeds planned', () => {
    const checkIn = makeCheckIn({ availableTimeMinutes: 90 });
    // plannedDurationMinutes=60, available=90 → not constrained
    const result = screenAdaptation(checkIn, null, makeBlockPhase(), 60);
    expect(result).not.toContain('reduce_duration');
  });

  it('works without wellness data', () => {
    expect(() => screenAdaptation(makeCheckIn(), null, makeBlockPhase())).not.toThrow();
    expect(() => screenAdaptation(makeCheckIn(), undefined, makeBlockPhase())).not.toThrow();
  });
});

// =============================================================================
// snapshotWorkout
// =============================================================================

describe('snapshotWorkout', () => {
  it('captures correct before-state snapshot', () => {
    const workout = makeWorkout();
    const snapshot = snapshotWorkout(workout);

    expect(snapshot.workoutId).toBe('workout-1');
    expect(snapshot.before.name).toBe('Threshold Run');
    expect(snapshot.before.sport).toBe('run');
    expect(snapshot.before.plannedDurationMinutes).toBe(60);
    expect(snapshot.changeType).toBe('modified');
    expect(snapshot.after).toEqual({});
  });

  it('snapshot after is empty initially', () => {
    const snapshot = snapshotWorkout(makeWorkout());
    expect(Object.keys(snapshot.after)).toHaveLength(0);
  });
});

// =============================================================================
// buildAfterSnapshot
// =============================================================================

describe('buildAfterSnapshot', () => {
  it('builds correct after-snapshot', () => {
    const before = { name: 'Hard Run', plannedDurationMinutes: 60 };
    const after = { name: 'Easy Run', plannedDurationMinutes: 30 };
    const snapshot = buildAfterSnapshot('wk-1', before, after, 'modified');

    expect(snapshot.workoutId).toBe('wk-1');
    expect(snapshot.before).toEqual(before);
    expect(snapshot.after).toEqual(after);
    expect(snapshot.changeType).toBe('modified');
  });

  it('handles swapped changeType', () => {
    const snapshot = buildAfterSnapshot('wk-1', {}, {}, 'swapped');
    expect(snapshot.changeType).toBe('swapped');
  });
});

// =============================================================================
// extractSwappableContent
// =============================================================================

describe('extractSwappableContent', () => {
  it('extracts all swappable fields', () => {
    const workout = makeWorkout();
    const content = extractSwappableContent(workout);

    expect(content.name).toBe('Threshold Run');
    expect(content.sport).toBe('run');
    expect(content.workoutType).toBe('threshold');
    expect(content.plannedDurationMinutes).toBe(60);
    expect(content.plannedTss).toBe(80);
    expect(content.intervalsTarget).toBe('PACE');
  });

  it('does not include id, date, weekNumber, or externalId', () => {
    const workout = makeWorkout();
    const content = extractSwappableContent(workout) as Record<string, unknown>;

    expect(content.id).toBeUndefined();
    expect(content.date).toBeUndefined();
    expect(content.weekNumber).toBeUndefined();
    expect(content.externalId).toBeUndefined();
  });
});

// =============================================================================
// buildAdaptationPrompt
// =============================================================================

describe('buildAdaptationPrompt', () => {
  it('includes workout name and duration', () => {
    const ctx = makeContext();
    const prompt = buildAdaptationPrompt(ctx);
    expect(prompt).toContain('Threshold Run');
    expect(prompt).toContain('60 min');
  });

  it('includes check-in values', () => {
    const ctx = makeContext();
    const prompt = buildAdaptationPrompt(ctx);
    expect(prompt).toContain('Sleep Quality: 7/10');
    expect(prompt).toContain('Energy: 7/10');
  });

  it('includes wellness data when provided', () => {
    const ctx = makeContext();
    const prompt = buildAdaptationPrompt(ctx);
    expect(prompt).toContain('CTL: 60');
    expect(prompt).toContain('TSB: 5');
  });

  it('notes "No wellness data available" when wellness is null', () => {
    const ctx = makeContext({ wellness: null });
    const prompt = buildAdaptationPrompt(ctx);
    expect(prompt).toContain('No wellness data available');
  });

  it('includes block phase focus', () => {
    const ctx = makeContext();
    const prompt = buildAdaptationPrompt(ctx);
    expect(prompt).toContain('build');
  });

  it('mentions taper restriction when phase is taper', () => {
    const ctx = makeContext({ blockPhase: makeBlockPhase({ focus: 'taper' }) });
    const prompt = buildAdaptationPrompt(ctx);
    expect(prompt).toContain('NEVER');
  });

  it('includes time constraint message when available time is short', () => {
    const ctx = makeContext({
      checkIn: makeCheckIn({ availableTimeMinutes: 30 }),
    });
    const prompt = buildAdaptationPrompt(ctx);
    expect(prompt).toContain('Available time (30 min)');
  });
});

// =============================================================================
// parseAdaptationResponse
// =============================================================================

describe('parseAdaptationResponse', () => {
  it('parses a valid no_change response', () => {
    const raw = JSON.stringify({
      type: 'no_change',
      reason: 'All metrics look good today.',
      originalWorkout: {
        workoutId: 'workout-1',
        before: { name: 'Run' },
        after: {},
        changeType: 'modified',
      },
      modifiedWorkout: null,
      swapTargetDate: null,
      confidence: 'high',
    });

    const result = parseAdaptationResponse(raw);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('no_change');
    expect(result?.confidence).toBe('high');
    expect(result?.modifiedWorkout).toBeNull();
  });

  it('parses a valid reduce_intensity response', () => {
    const raw = JSON.stringify({
      type: 'reduce_intensity',
      reason: 'Poor sleep detected.',
      originalWorkout: {
        workoutId: 'wk-2',
        before: {},
        after: {},
        changeType: 'modified',
      },
      modifiedWorkout: {
        workoutId: 'wk-2',
        before: { name: 'Hard' },
        after: { name: 'Easy', workoutType: 'recovery' },
        changeType: 'modified',
      },
      swapTargetDate: null,
      confidence: 'medium',
    });

    const result = parseAdaptationResponse(raw);
    expect(result?.type).toBe('reduce_intensity');
    expect(result?.modifiedWorkout?.after.workoutType).toBe('recovery');
  });

  it('parses a swap_days response with swapTargetDate', () => {
    const raw = JSON.stringify({
      type: 'swap_days',
      reason: 'Move threshold to Friday.',
      originalWorkout: { workoutId: 'wk-3', before: {}, after: {}, changeType: 'modified' },
      modifiedWorkout: null,
      swapTargetDate: '2025-04-06',
      confidence: 'low',
    });

    const result = parseAdaptationResponse(raw);
    expect(result?.type).toBe('swap_days');
    expect(result?.swapTargetDate).toBe('2025-04-06');
  });

  it('strips markdown code fences', () => {
    const raw =
      '```json\n{"type":"no_change","reason":"ok","originalWorkout":{"workoutId":"x","before":{},"after":{},"changeType":"modified"},"modifiedWorkout":null,"swapTargetDate":null,"confidence":"high"}\n```';
    const result = parseAdaptationResponse(raw);
    expect(result?.type).toBe('no_change');
  });

  it('returns null for invalid type', () => {
    const raw = JSON.stringify({
      type: 'delete_workout',
      reason: 'bad',
      originalWorkout: { workoutId: 'x', before: {}, after: {}, changeType: 'modified' },
      modifiedWorkout: null,
      swapTargetDate: null,
      confidence: 'high',
    });
    expect(parseAdaptationResponse(raw)).toBeNull();
  });

  it('returns null for invalid confidence', () => {
    const raw = JSON.stringify({
      type: 'no_change',
      reason: 'ok',
      originalWorkout: { workoutId: 'x', before: {}, after: {}, changeType: 'modified' },
      modifiedWorkout: null,
      swapTargetDate: null,
      confidence: 'very_high',
    });
    expect(parseAdaptationResponse(raw)).toBeNull();
  });

  it('returns null for empty reason', () => {
    const raw = JSON.stringify({
      type: 'no_change',
      reason: '',
      originalWorkout: { workoutId: 'x', before: {}, after: {}, changeType: 'modified' },
      modifiedWorkout: null,
      swapTargetDate: null,
      confidence: 'high',
    });
    expect(parseAdaptationResponse(raw)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseAdaptationResponse('not json at all')).toBeNull();
    expect(parseAdaptationResponse('{bad: json}')).toBeNull();
  });

  it('returns null for missing originalWorkout', () => {
    const raw = JSON.stringify({
      type: 'no_change',
      reason: 'ok',
      modifiedWorkout: null,
      swapTargetDate: null,
      confidence: 'high',
    });
    expect(parseAdaptationResponse(raw)).toBeNull();
  });
});
