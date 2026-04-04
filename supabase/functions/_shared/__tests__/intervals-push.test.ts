import { jest } from '@jest/globals';
import {
  buildAvailabilityPayload,
  buildFallbackDescription,
  buildRacePayload,
  buildWorkoutPayload,
  isValidDsl,
  pushBlockToIntervals,
} from '../intervals-push.ts';
import type {
  IntervalsCredentials,
  PushAvailabilityEvent,
  PushRaceEvent,
  PushWorkout,
  UpsertEventFn,
} from '../intervals-push.ts';

// =============================================================================
// DSL Validation
// =============================================================================

describe('isValidDsl', () => {
  it('returns true for valid DSL with sections and steps', () => {
    const dsl = `Warmup
- 10m ramp 50-75%

Main Set 4x
- 8m 95-105%
- 4m 55%

Cooldown
- 10m 50%`;
    expect(isValidDsl(dsl)).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidDsl('')).toBe(false);
    expect(isValidDsl('   ')).toBe(false);
  });

  it('returns false for text without steps', () => {
    expect(isValidDsl('Just a description without steps')).toBe(false);
  });

  it('returns false for steps without headers', () => {
    expect(isValidDsl('- 10m 50%\n- 20m 65%')).toBe(false);
  });

  it('returns true for minimal valid DSL', () => {
    expect(isValidDsl('Warmup\n- 10m 50%')).toBe(true);
  });
});

describe('buildFallbackDescription', () => {
  it('includes workout name', () => {
    const workout: PushWorkout = {
      external_id: 'test',
      name: 'Endurance Ride',
      date: '2026-04-01',
      sport: 'bike',
      workout_type: 'endurance',
      planned_duration_minutes: 60,
      planned_tss: null,
      planned_distance_meters: null,
      description_dsl: '',
      intervals_target: 'POWER',
    };
    const result = buildFallbackDescription(workout);
    expect(result).toBe('Endurance Ride - 60min - endurance');
  });

  it('omits duration if zero', () => {
    const workout: PushWorkout = {
      external_id: 'test',
      name: 'Rest Day',
      date: '2026-04-01',
      sport: 'rest',
      workout_type: null,
      planned_duration_minutes: 0,
      planned_tss: null,
      planned_distance_meters: null,
      description_dsl: '',
      intervals_target: 'AUTO',
    };
    const result = buildFallbackDescription(workout);
    expect(result).toBe('Rest Day');
  });
});

// =============================================================================
// Payload Building
// =============================================================================

function makeWorkout(overrides: Partial<PushWorkout> = {}): PushWorkout {
  return {
    external_id: 'khepri-block1-2026-04-01-bike',
    name: 'Endurance Ride',
    date: '2026-04-01',
    sport: 'bike',
    workout_type: 'endurance',
    planned_duration_minutes: 60,
    planned_tss: 80,
    planned_distance_meters: 30000,
    description_dsl: 'Warmup\n- 10m 50%\nMain\n- 40m 65%\nCooldown\n- 10m 50%',
    intervals_target: 'POWER',
    ...overrides,
  };
}

describe('buildWorkoutPayload', () => {
  it('creates a WORKOUT event with correct fields', () => {
    const { payload, dslValid } = buildWorkoutPayload(makeWorkout());
    expect(payload.type).toBe('WORKOUT');
    expect(payload.category).toBe('Ride');
    expect(payload.name).toBe('Endurance Ride');
    expect(payload.start_date_local).toBe('2026-04-01');
    expect(payload.moving_time).toBe(3600);
    expect(payload.icu_training_load).toBe(80);
    expect(payload.distance).toBe(30000);
    expect(payload.target).toBe('POWER');
    expect(dslValid).toBe(true);
  });

  it('falls back to simplified description for invalid DSL', () => {
    const { payload, dslValid } = buildWorkoutPayload(
      makeWorkout({ description_dsl: 'invalid dsl text' })
    );
    expect(dslValid).toBe(false);
    expect(payload.description).toBe('Endurance Ride - 60min - endurance');
  });

  it('omits target when AUTO', () => {
    const { payload } = buildWorkoutPayload(makeWorkout({ intervals_target: 'AUTO' }));
    expect(payload.target).toBeUndefined();
  });

  it('creates NOTE event for rest day', () => {
    const { payload } = buildWorkoutPayload(
      makeWorkout({
        sport: 'rest',
        description_dsl: 'Rest\n- rest',
      })
    );
    expect(payload.type).toBe('NOTE');
    expect(payload.category).toBeUndefined();
    expect(payload.color).toBe('#808080');
  });

  it('sets PACE target for run workouts', () => {
    const { payload } = buildWorkoutPayload(
      makeWorkout({ sport: 'run', intervals_target: 'PACE' })
    );
    expect(payload.category).toBe('Run');
    expect(payload.target).toBe('PACE');
  });

  it('skips DSL validation when disabled', () => {
    const { dslValid } = buildWorkoutPayload(
      makeWorkout({ description_dsl: 'no valid dsl' }),
      false
    );
    expect(dslValid).toBe(true);
  });
});

describe('buildRacePayload', () => {
  it('creates RACE_A event for A-priority race', () => {
    const race: PushRaceEvent = {
      external_id: 'race-1',
      name: 'Ironman',
      date: '2026-09-01',
      sport: 'bike',
      priority: 'A',
      distance_meters: 180000,
    };
    const payload = buildRacePayload(race);
    expect(payload.type).toBe('RACE_A');
    expect(payload.color).toBe('#FF0000');
    expect(payload.distance).toBe(180000);
    expect(payload.category).toBe('Ride');
  });

  it('creates RACE_B event for B-priority race', () => {
    const race: PushRaceEvent = {
      external_id: 'race-2',
      name: 'Sprint Tri',
      date: '2026-07-01',
      sport: 'run',
      priority: 'B',
      distance_meters: null,
    };
    const payload = buildRacePayload(race);
    expect(payload.type).toBe('RACE_B');
    expect(payload.color).toBeUndefined();
    expect(payload.distance).toBeUndefined();
  });

  it('creates RACE_C event for C-priority race', () => {
    const payload = buildRacePayload({
      external_id: 'race-3',
      name: 'Fun Run',
      date: '2026-06-01',
      sport: 'run',
      priority: 'C',
      distance_meters: 5000,
    });
    expect(payload.type).toBe('RACE_C');
  });
});

describe('buildAvailabilityPayload', () => {
  it('creates NOTE for rest days', () => {
    const event: PushAvailabilityEvent = {
      external_id: 'rest-1',
      name: 'Rest Day',
      date: '2026-04-01',
      event_type: 'rest',
    };
    const payload = buildAvailabilityPayload(event);
    expect(payload.type).toBe('NOTE');
    expect(payload.color).toBe('#808080');
  });

  it('creates HOLIDAY for travel', () => {
    const payload = buildAvailabilityPayload({
      external_id: 'travel-1',
      name: 'Business Trip',
      date: '2026-04-15',
      event_type: 'travel',
    });
    expect(payload.type).toBe('HOLIDAY');
  });

  it('creates SICK for sick days', () => {
    const payload = buildAvailabilityPayload({
      external_id: 'sick-1',
      name: 'Sick Day',
      date: '2026-04-10',
      event_type: 'sick',
    });
    expect(payload.type).toBe('SICK');
  });

  it('creates INJURED for injury', () => {
    const payload = buildAvailabilityPayload({
      external_id: 'inj-1',
      name: 'Knee Injury',
      date: '2026-04-20',
      event_type: 'injured',
    });
    expect(payload.type).toBe('INJURED');
  });
});

// =============================================================================
// Bulk Push
// =============================================================================

describe('pushBlockToIntervals', () => {
  const credentials: IntervalsCredentials = {
    intervalsAthleteId: 'i12345',
    apiKey: 'test-key',
  };

  it('pushes all events successfully', async () => {
    const mockUpsert = jest.fn<UpsertEventFn>().mockResolvedValue({ id: 1 });

    const result = await pushBlockToIntervals(credentials, mockUpsert, [makeWorkout()], [], []);

    expect(result.success).toBe(true);
    expect(result.pushed_count).toBe(1);
    expect(result.failed_count).toBe(0);
    expect(result.failures).toHaveLength(0);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('handles mixed success and failure', async () => {
    const mockUpsert = jest
      .fn<UpsertEventFn>()
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce(new Error('Rate limited'));

    const result = await pushBlockToIntervals(
      credentials,
      mockUpsert,
      [makeWorkout(), makeWorkout({ external_id: 'w-2' })],
      [],
      []
    );

    expect(result.success).toBe(false);
    expect(result.pushed_count).toBe(1);
    expect(result.failed_count).toBe(1);
    expect(result.failures[0].error).toBe('Rate limited');
  });

  it('pushes workouts, races, and availability events together', async () => {
    const mockUpsert = jest.fn<UpsertEventFn>().mockResolvedValue({ id: 1 });

    const races: PushRaceEvent[] = [
      {
        external_id: 'race-1',
        name: 'Ironman',
        date: '2026-09-01',
        sport: 'bike',
        priority: 'A',
        distance_meters: 180000,
      },
    ];

    const availability: PushAvailabilityEvent[] = [
      { external_id: 'rest-1', name: 'Rest Day', date: '2026-04-01', event_type: 'rest' },
    ];

    const result = await pushBlockToIntervals(
      credentials,
      mockUpsert,
      [makeWorkout()],
      races,
      availability
    );

    expect(result.success).toBe(true);
    expect(result.pushed_count).toBe(3);
    expect(mockUpsert).toHaveBeenCalledTimes(3);
  });

  it('passes external_id to upsert function', async () => {
    const mockUpsert = jest.fn<UpsertEventFn>().mockResolvedValue({ id: 1 });
    const workout = makeWorkout({ external_id: 'my-external-id' });

    await pushBlockToIntervals(credentials, mockUpsert, [workout], [], []);

    expect(mockUpsert).toHaveBeenCalledWith(credentials, expect.any(Object), 'my-external-id');
  });

  it('handles empty input gracefully', async () => {
    const mockUpsert = jest.fn<UpsertEventFn>();

    const result = await pushBlockToIntervals(credentials, mockUpsert, [], [], []);

    expect(result.success).toBe(true);
    expect(result.pushed_count).toBe(0);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('processes events in batches', async () => {
    const mockUpsert = jest.fn<UpsertEventFn>().mockResolvedValue({ id: 1 });

    // Create 55 workouts (exceeds BATCH_SIZE of 50)
    const workouts = Array.from({ length: 55 }, (_, i) => makeWorkout({ external_id: `w-${i}` }));

    const result = await pushBlockToIntervals(credentials, mockUpsert, workouts, [], []);

    expect(result.success).toBe(true);
    expect(result.pushed_count).toBe(55);
    expect(mockUpsert).toHaveBeenCalledTimes(55);
  });
});
