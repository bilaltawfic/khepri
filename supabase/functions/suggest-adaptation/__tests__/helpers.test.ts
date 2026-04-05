import {
  buildPrompt,
  isAdaptationType,
  isConfidence,
  parseResponse,
  screenAdaptation,
  validateRequest,
} from '../helpers.ts';
import type { BlockPhase, CheckInData, WellnessData, WorkoutRow } from '../helpers.ts';

// =============================================================================
// Fixtures
// =============================================================================

const goodCheckIn: CheckInData = {
  sleepQuality: 8,
  sleepHours: 7.5,
  energy: 8,
  stress: 3,
  soreness: 2,
};

const basePhase: BlockPhase = {
  name: 'Base',
  focus: 'base',
  weeks: 4,
  weeklyHours: 8,
};

const taperPhase: BlockPhase = {
  name: 'Taper',
  focus: 'taper',
  weeks: 2,
  weeklyHours: 5,
};

const goodWellness: WellnessData = { ctl: 60, atl: 55, tsb: 5 };

const workout: WorkoutRow = {
  id: 'w1',
  name: 'Run - Threshold',
  sport: 'run',
  workout_type: 'threshold',
  planned_duration_minutes: 60,
  planned_tss: 80,
  external_id: 'ext-1',
};

// =============================================================================
// isAdaptationType
// =============================================================================

describe('isAdaptationType', () => {
  it('returns true for valid types', () => {
    expect(isAdaptationType('no_change')).toBe(true);
    expect(isAdaptationType('reduce_intensity')).toBe(true);
    expect(isAdaptationType('swap_days')).toBe(true);
    expect(isAdaptationType('add_rest')).toBe(true);
  });

  it('returns false for unknown types', () => {
    expect(isAdaptationType('skip_workout')).toBe(false);
    expect(isAdaptationType('')).toBe(false);
    expect(isAdaptationType(null)).toBe(false);
    expect(isAdaptationType(42)).toBe(false);
  });
});

// =============================================================================
// isConfidence
// =============================================================================

describe('isConfidence', () => {
  it('returns true for valid confidence values', () => {
    expect(isConfidence('high')).toBe(true);
    expect(isConfidence('medium')).toBe(true);
    expect(isConfidence('low')).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(isConfidence('very_high')).toBe(false);
    expect(isConfidence('')).toBe(false);
    expect(isConfidence(undefined)).toBe(false);
  });
});

// =============================================================================
// validateRequest
// =============================================================================

describe('validateRequest', () => {
  const validBody = {
    athlete_id: 'a1',
    workout_id: 'w1',
    check_in: {
      sleepQuality: 7,
      sleepHours: 7,
      energy: 8,
      stress: 3,
      soreness: 2,
    },
    block_phase: { name: 'Base', focus: 'base', weeks: 4, weeklyHours: 8 },
  };

  it('returns null for a valid request', () => {
    expect(validateRequest(validBody)).toBeNull();
  });

  it('rejects non-object bodies', () => {
    expect(validateRequest(null)).toBe('Request body must be a JSON object');
    expect(validateRequest('string')).toBe('Request body must be a JSON object');
    expect(validateRequest([1, 2])).toBe('Request body must be a JSON object');
  });

  it('rejects missing athlete_id', () => {
    expect(validateRequest({ ...validBody, athlete_id: '' })).toBe('athlete_id is required');
    expect(validateRequest({ ...validBody, athlete_id: 42 })).toBe('athlete_id is required');
  });

  it('rejects missing workout_id', () => {
    expect(validateRequest({ ...validBody, workout_id: '' })).toBe('workout_id is required');
  });

  it('rejects missing check_in', () => {
    const { check_in: _, ...rest } = validBody;
    expect(validateRequest(rest)).toBe('check_in data is required');
    expect(validateRequest({ ...validBody, check_in: null })).toBe('check_in data is required');
  });

  it('rejects missing block_phase', () => {
    const { block_phase: _, ...rest } = validBody;
    expect(validateRequest(rest)).toBe('block_phase is required');
  });

  it('rejects check_in with missing numeric fields', () => {
    expect(
      validateRequest({
        ...validBody,
        check_in: { sleepQuality: 7, sleepHours: 7, energy: 8, stress: 3 }, // soreness missing
      })
    ).toBe('check_in must include sleepQuality, sleepHours, energy, stress, soreness');
  });

  it('rejects check_in with string fields instead of numbers', () => {
    expect(
      validateRequest({
        ...validBody,
        check_in: { sleepQuality: '7', sleepHours: 7, energy: 8, stress: 3, soreness: 2 },
      })
    ).toBe('check_in must include sleepQuality, sleepHours, energy, stress, soreness');
  });
});

// =============================================================================
// screenAdaptation
// =============================================================================

describe('screenAdaptation', () => {
  it('returns no_change for good metrics', () => {
    expect(screenAdaptation(goodCheckIn, goodWellness, basePhase)).toEqual(['no_change']);
  });

  it('returns reduce_intensity and swap_days for poor sleep hours', () => {
    const result = screenAdaptation({ ...goodCheckIn, sleepHours: 5 }, null, basePhase);
    expect(result).toContain('reduce_intensity');
    expect(result).toContain('swap_days');
  });

  it('returns reduce_intensity and swap_days for poor sleep quality', () => {
    const result = screenAdaptation({ ...goodCheckIn, sleepQuality: 3 }, null, basePhase);
    expect(result).toContain('reduce_intensity');
    expect(result).toContain('swap_days');
  });

  it('returns reduce_intensity for high negative TSB', () => {
    const result = screenAdaptation(goodCheckIn, { ...goodWellness, tsb: -25 }, basePhase);
    expect(result).toContain('reduce_intensity');
  });

  it('returns increase_intensity for high TSB in base phase', () => {
    const result = screenAdaptation(goodCheckIn, { ...goodWellness, tsb: 15 }, basePhase);
    expect(result).toContain('increase_intensity');
  });

  it('does NOT return increase_intensity in taper phase', () => {
    const result = screenAdaptation(goodCheckIn, { ...goodWellness, tsb: 20 }, taperPhase);
    expect(result).not.toContain('increase_intensity');
  });

  it('does NOT return increase_intensity in recovery phase', () => {
    const recoveryPhase: BlockPhase = { ...basePhase, focus: 'recovery' };
    const result = screenAdaptation(goodCheckIn, { ...goodWellness, tsb: 20 }, recoveryPhase);
    expect(result).not.toContain('increase_intensity');
  });

  it('returns add_rest and reduce_intensity for low energy', () => {
    const result = screenAdaptation({ ...goodCheckIn, energy: 3 }, null, basePhase);
    expect(result).toContain('add_rest');
    expect(result).toContain('reduce_intensity');
  });

  it('returns substitute and add_rest for high soreness', () => {
    const result = screenAdaptation({ ...goodCheckIn, soreness: 8 }, null, basePhase);
    expect(result).toContain('substitute');
    expect(result).toContain('add_rest');
  });

  it('returns reduce_duration only when available time is less than planned', () => {
    const checkIn = { ...goodCheckIn, availableTimeMinutes: 30 };
    const withDuration = screenAdaptation(checkIn, null, basePhase, 60);
    expect(withDuration).toContain('reduce_duration');

    const noDuration = screenAdaptation(checkIn, null, basePhase);
    expect(noDuration).toContain('reduce_duration');
  });

  it('does NOT return reduce_duration when available time >= planned duration', () => {
    const checkIn = { ...goodCheckIn, availableTimeMinutes: 60 };
    const result = screenAdaptation(checkIn, null, basePhase, 60);
    expect(result).not.toContain('reduce_duration');
  });

  it('deduplicates results', () => {
    // Both sleepHours < 6 and sleepQuality < 4 — reduce_intensity would appear twice
    const result = screenAdaptation(
      { ...goodCheckIn, sleepHours: 5, sleepQuality: 3 },
      null,
      basePhase
    );
    const deduped = [...new Set(result)];
    expect(result).toEqual(deduped);
  });
});

// =============================================================================
// buildPrompt
// =============================================================================

describe('buildPrompt', () => {
  const req = {
    athlete_id: 'a1',
    workout_id: 'w1',
    check_in: goodCheckIn,
    block_phase: basePhase,
  };

  it('includes workout name and sport', () => {
    const prompt = buildPrompt(workout, req);
    expect(prompt).toContain('Run - Threshold');
    expect(prompt).toContain('run');
  });

  it('includes planned duration', () => {
    const prompt = buildPrompt(workout, req);
    expect(prompt).toContain('Planned Duration: 60 min');
  });

  it('includes planned TSS when present', () => {
    const prompt = buildPrompt(workout, req);
    expect(prompt).toContain('Planned TSS: 80');
  });

  it('omits TSS line when planned_tss is null', () => {
    const noTssWorkout = { ...workout, planned_tss: null };
    const prompt = buildPrompt(noTssWorkout, req);
    expect(prompt).not.toContain('Planned TSS');
  });

  it('includes check-in metrics', () => {
    const prompt = buildPrompt(workout, req);
    expect(prompt).toContain('Sleep Quality: 8/10');
    expect(prompt).toContain('Sleep Hours: 7.5h');
    expect(prompt).toContain('Energy: 8/10');
    expect(prompt).toContain('Stress: 3/10');
    expect(prompt).toContain('Overall Soreness: 2/10');
  });

  it('includes wellness CTL/ATL/TSB when provided', () => {
    const prompt = buildPrompt(workout, { ...req, wellness: goodWellness });
    expect(prompt).toContain('CTL: 60, ATL: 55, TSB: 5');
  });

  it('shows no wellness message when not provided', () => {
    const prompt = buildPrompt(workout, req);
    expect(prompt).toContain('No wellness data available.');
  });

  it('includes time constraint message when available time is less than planned', () => {
    const prompt = buildPrompt(workout, {
      ...req,
      check_in: { ...goodCheckIn, availableTimeMinutes: 30 },
    });
    expect(prompt).toContain('Available time (30 min) is less than planned duration (60 min).');
  });

  it('omits time constraint when available time >= planned', () => {
    const prompt = buildPrompt(workout, {
      ...req,
      check_in: { ...goodCheckIn, availableTimeMinutes: 60 },
    });
    // The time constraint message has this specific parenthetical format
    expect(prompt).not.toContain('is less than planned duration');
  });

  it('includes week compliance when provided', () => {
    const prompt = buildPrompt(workout, {
      ...req,
      week_compliance: { plannedMinutes: 300, completedMinutes: 240, completionRate: 0.8 },
    });
    expect(prompt).toContain('Week compliance: 80%');
    expect(prompt).toContain('240/300 min');
  });

  it('shows no compliance message when not provided', () => {
    const prompt = buildPrompt(workout, req);
    expect(prompt).toContain('No weekly compliance data available.');
  });

  it('includes phase name and focus', () => {
    const prompt = buildPrompt(workout, req);
    expect(prompt).toContain('base (Base)');
  });

  it('includes workout id in response format template', () => {
    const prompt = buildPrompt(workout, req);
    expect(prompt).toContain('"workoutId": "w1"');
  });
});

// =============================================================================
// parseResponse
// =============================================================================

describe('parseResponse', () => {
  const validJson = JSON.stringify({
    type: 'reduce_intensity',
    reason: 'Poor sleep detected.',
    workoutId: 'w1',
    originalDurationMinutes: 60,
    swapTargetDate: null,
    modifiedFields: { plannedDurationMinutes: 45 },
    confidence: 'high',
  });

  it('parses a valid JSON response', () => {
    const result = parseResponse(validJson);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('reduce_intensity');
    expect(result?.reason).toBe('Poor sleep detected.');
    expect(result?.workoutId).toBe('w1');
    expect(result?.originalDurationMinutes).toBe(60);
    expect(result?.confidence).toBe('high');
    expect(result?.modifiedFields).toEqual({ plannedDurationMinutes: 45 });
  });

  it('strips markdown code fences before parsing', () => {
    const fenced = `\`\`\`json\n${validJson}\n\`\`\``;
    const result = parseResponse(fenced);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('reduce_intensity');
  });

  it('returns null for invalid JSON', () => {
    expect(parseResponse('not json')).toBeNull();
    expect(parseResponse('')).toBeNull();
  });

  it('returns null when type is invalid', () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), type: 'unknown_type' });
    expect(parseResponse(json)).toBeNull();
  });

  it('returns null when reason is empty', () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), reason: '' });
    expect(parseResponse(json)).toBeNull();
  });

  it('returns null when workoutId is missing', () => {
    const { workoutId: _, ...rest } = JSON.parse(validJson);
    expect(parseResponse(JSON.stringify(rest))).toBeNull();
  });

  it('returns null when originalDurationMinutes is missing', () => {
    const { originalDurationMinutes: _, ...rest } = JSON.parse(validJson);
    expect(parseResponse(JSON.stringify(rest))).toBeNull();
  });

  it('returns null when confidence is invalid', () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), confidence: 'very_high' });
    expect(parseResponse(json)).toBeNull();
  });

  it('sets swapTargetDate from string field', () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), swapTargetDate: '2026-04-07' });
    const result = parseResponse(json);
    expect(result?.swapTargetDate).toBe('2026-04-07');
  });

  it('sets swapTargetDate to null when not a string', () => {
    const result = parseResponse(validJson);
    expect(result?.swapTargetDate).toBeNull();
  });

  it('sets modifiedFields to null when not an object', () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), modifiedFields: null });
    const result = parseResponse(json);
    expect(result?.modifiedFields).toBeNull();
  });

  it('parses no_change type with null modifiedFields', () => {
    const json = JSON.stringify({
      type: 'no_change',
      reason: 'All metrics look good.',
      workoutId: 'w1',
      originalDurationMinutes: 60,
      swapTargetDate: null,
      modifiedFields: null,
      confidence: 'high',
    });
    const result = parseResponse(json);
    expect(result?.type).toBe('no_change');
    expect(result?.modifiedFields).toBeNull();
  });
});
