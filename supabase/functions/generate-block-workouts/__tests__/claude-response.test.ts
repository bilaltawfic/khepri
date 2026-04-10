import type { ClaudeBlockResponse } from '../claude-client.ts';
import type { GenerateRequestForMapper } from '../response-mapper.ts';
import { mapClaudeWorkoutsToInserts, validateClaudeResponse } from '../response-mapper.ts';

// ============================================================================
// Fixtures
// ============================================================================

function makeWorkout(overrides: Record<string, unknown> = {}) {
  return {
    date: '2026-01-05',
    sport: 'run',
    workoutType: 'endurance',
    name: 'Run - Easy Endurance',
    plannedDurationMinutes: 50,
    intensityZone: 'Z2',
    structure: {
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Easy jog', durationMinutes: 10 }],
        },
        {
          name: 'Main Set',
          durationMinutes: 30,
          steps: [{ description: 'Steady Z2', durationMinutes: 30 }],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Walk', durationMinutes: 10 }],
        },
      ],
      totalDurationMinutes: 50,
    },
    ...overrides,
  };
}

function makeClaudeResponse(overrides: Partial<ClaudeBlockResponse> = {}): ClaudeBlockResponse {
  return {
    weeks: [
      {
        weekNumber: 1,
        weekStartDate: '2026-01-05',
        isRecoveryWeek: false,
        workouts: [
          makeWorkout(),
          makeWorkout({ date: '2026-01-06', sport: 'bike', name: 'Bike - Endurance' }),
        ],
      },
    ],
    ...overrides,
  };
}

const BASE_REQUEST: GenerateRequestForMapper = {
  block_id: 'block-abc',
  athlete_id: 'athlete-1',
  start_date: '2026-01-05',
  end_date: '2026-03-01',
};

// ============================================================================
// validateClaudeResponse
// ============================================================================

describe('validateClaudeResponse', () => {
  it('accepts a valid response', () => {
    expect(validateClaudeResponse(makeClaudeResponse(), '2026-01-05', '2026-03-01')).toBeNull();
  });

  it('rejects empty weeks array', () => {
    const response = makeClaudeResponse({ weeks: [] });
    expect(validateClaudeResponse(response, '2026-01-05', '2026-03-01')).toContain('no weeks');
  });

  it('rejects a workout date outside the block range', () => {
    const response = makeClaudeResponse({
      weeks: [
        {
          weekNumber: 1,
          weekStartDate: '2026-01-05',
          isRecoveryWeek: false,
          workouts: [makeWorkout({ date: '2025-12-31' })],
        },
      ],
    });
    expect(validateClaudeResponse(response, '2026-01-05', '2026-03-01')).toContain(
      'outside block range'
    );
  });

  it('rejects an invalid sport', () => {
    const response = makeClaudeResponse({
      weeks: [
        {
          weekNumber: 1,
          weekStartDate: '2026-01-05',
          isRecoveryWeek: false,
          workouts: [makeWorkout({ sport: 'rowing' })],
        },
      ],
    });
    expect(validateClaudeResponse(response, '2026-01-05', '2026-03-01')).toContain('invalid sport');
  });

  it('rejects an invalid workoutType', () => {
    const response = makeClaudeResponse({
      weeks: [
        {
          weekNumber: 1,
          weekStartDate: '2026-01-05',
          isRecoveryWeek: false,
          workouts: [makeWorkout({ workoutType: 'sprint' })],
        },
      ],
    });
    expect(validateClaudeResponse(response, '2026-01-05', '2026-03-01')).toContain(
      'invalid workoutType'
    );
  });

  it('rejects negative duration', () => {
    const response = makeClaudeResponse({
      weeks: [
        {
          weekNumber: 1,
          weekStartDate: '2026-01-05',
          isRecoveryWeek: false,
          workouts: [makeWorkout({ plannedDurationMinutes: -10 })],
        },
      ],
    });
    expect(validateClaudeResponse(response, '2026-01-05', '2026-03-01')).toContain(
      'plannedDurationMinutes'
    );
  });

  it('rejects invalid weekNumber', () => {
    const response = makeClaudeResponse({
      weeks: [
        {
          weekNumber: 0,
          weekStartDate: '2026-01-05',
          isRecoveryWeek: false,
          workouts: [makeWorkout()],
        },
      ],
    });
    expect(validateClaudeResponse(response, '2026-01-05', '2026-03-01')).toContain('weekNumber');
  });

  it('rejects null response', () => {
    expect(validateClaudeResponse(null, '2026-01-05', '2026-03-01')).toContain('not an object');
  });

  it('rejects non-object week entries', () => {
    expect(validateClaudeResponse({ weeks: ['bad'] }, '2026-01-05', '2026-03-01')).toContain(
      'not an object'
    );
  });

  it('rejects non-object workout entries', () => {
    const response = {
      weeks: [
        { weekNumber: 1, weekStartDate: '2026-01-05', isRecoveryWeek: false, workouts: [42] },
      ],
    };
    expect(validateClaudeResponse(response, '2026-01-05', '2026-03-01')).toContain('not an object');
  });

  it('rejects non-ISO date format', () => {
    const response = makeClaudeResponse({
      weeks: [
        {
          weekNumber: 1,
          weekStartDate: '2026-01-05',
          isRecoveryWeek: false,
          workouts: [makeWorkout({ date: 'Jan 5 2026' })],
        },
      ],
    });
    expect(validateClaudeResponse(response, '2026-01-05', '2026-03-01')).toContain(
      'invalid date format'
    );
  });

  it('rejects Infinity and NaN durations', () => {
    const infResponse = makeClaudeResponse({
      weeks: [
        {
          weekNumber: 1,
          weekStartDate: '2026-01-05',
          isRecoveryWeek: false,
          workouts: [makeWorkout({ plannedDurationMinutes: Number.POSITIVE_INFINITY })],
        },
      ],
    });
    expect(validateClaudeResponse(infResponse, '2026-01-05', '2026-03-01')).toContain(
      'plannedDurationMinutes'
    );
  });

  it('rejects duration exceeding upper bound', () => {
    const response = makeClaudeResponse({
      weeks: [
        {
          weekNumber: 1,
          weekStartDate: '2026-01-05',
          isRecoveryWeek: false,
          workouts: [makeWorkout({ plannedDurationMinutes: 700 })],
        },
      ],
    });
    expect(validateClaudeResponse(response, '2026-01-05', '2026-03-01')).toContain(
      'plannedDurationMinutes'
    );
  });

  it('rejects duplicate workouts on the same date within a week', () => {
    const response = makeClaudeResponse({
      weeks: [
        {
          weekNumber: 1,
          weekStartDate: '2026-01-05',
          isRecoveryWeek: false,
          workouts: [
            makeWorkout({ date: '2026-01-05' }),
            makeWorkout({ date: '2026-01-05', sport: 'bike' }),
          ],
        },
      ],
    });
    expect(validateClaudeResponse(response, '2026-01-05', '2026-03-01')).toContain('duplicate');
  });
});

// ============================================================================
// mapClaudeWorkoutsToInserts
// ============================================================================

describe('mapClaudeWorkoutsToInserts', () => {
  it('maps workouts with correct block_id, athlete_id, and external_id', () => {
    const inserts = mapClaudeWorkoutsToInserts(BASE_REQUEST, makeClaudeResponse());
    expect(inserts.length).toBe(2);

    const first = inserts[0];
    expect(first.block_id).toBe('block-abc');
    expect(first.athlete_id).toBe('athlete-1');
    expect(first.external_id).toBe('khepri-block-abc-w1-2026-01-05');
    expect(first.week_number).toBe(1);
    expect(first.sync_status).toBe('pending');
  });

  it('sets intervals_target based on sport', () => {
    const response = makeClaudeResponse({
      weeks: [
        {
          weekNumber: 1,
          weekStartDate: '2026-01-05',
          isRecoveryWeek: false,
          workouts: [
            makeWorkout({ sport: 'bike', date: '2026-01-05' }),
            makeWorkout({ sport: 'run', date: '2026-01-06' }),
            makeWorkout({ sport: 'swim', date: '2026-01-07' }),
          ],
        },
      ],
    });
    const inserts = mapClaudeWorkoutsToInserts(BASE_REQUEST, response);
    expect(inserts[0].intervals_target).toBe('POWER');
    expect(inserts[1].intervals_target).toBe('PACE');
    expect(inserts[2].intervals_target).toBe('AUTO');
  });

  it('sets workout_type to null for rest workouts', () => {
    const response = makeClaudeResponse({
      weeks: [
        {
          weekNumber: 1,
          weekStartDate: '2026-01-05',
          isRecoveryWeek: false,
          workouts: [makeWorkout({ workoutType: 'rest', sport: 'rest' })],
        },
      ],
    });
    const inserts = mapClaudeWorkoutsToInserts(BASE_REQUEST, response);
    expect(inserts[0].workout_type).toBeNull();
  });

  it('preserves structure from Claude response', () => {
    const inserts = mapClaudeWorkoutsToInserts(BASE_REQUEST, makeClaudeResponse());
    const structure = inserts[0].structure as { sections: unknown[]; totalDurationMinutes: number };
    expect(structure.totalDurationMinutes).toBe(50);
    expect(structure.sections).toHaveLength(3);
  });
});
