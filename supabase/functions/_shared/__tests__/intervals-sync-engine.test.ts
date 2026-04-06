import {
  computeCompliance,
  diffEventVsWorkout,
  mapIntervalsTypeToSport,
  mapSportToIntervalsType,
  matchActivityToWorkout,
} from '../intervals-sync-engine.ts';
import type {
  LocalEventState,
  PlannedWorkout,
  RemoteEventState,
  SyncActivity,
} from '../intervals-sync-engine.ts';

// =============================================================================
// Sport Mapping
// =============================================================================

describe('mapIntervalsTypeToSport', () => {
  it.each([
    ['Ride', 'bike'],
    ['VirtualRide', 'bike'],
    ['MountainBikeRide', 'bike'],
    ['GravelRide', 'bike'],
    ['TrackRide', 'bike'],
    ['Run', 'run'],
    ['VirtualRun', 'run'],
    ['TrailRun', 'run'],
    ['Swim', 'swim'],
    ['OpenWaterSwim', 'swim'],
    ['WeightTraining', 'strength'],
  ])('maps %s → %s', (input, expected) => {
    expect(mapIntervalsTypeToSport(input)).toBe(expected);
  });

  it('returns null for unrecognised types', () => {
    expect(mapIntervalsTypeToSport('Hike')).toBeNull();
    expect(mapIntervalsTypeToSport('Rowing')).toBeNull();
  });
});

describe('mapSportToIntervalsType', () => {
  it.each([
    ['bike', 'Ride'],
    ['run', 'Run'],
    ['swim', 'Swim'],
    ['strength', 'WeightTraining'],
  ])('maps %s → %s', (input, expected) => {
    expect(mapSportToIntervalsType(input)).toBe(expected);
  });

  it('returns "Other" for unknown sports', () => {
    expect(mapSportToIntervalsType('rest')).toBe('Other');
    expect(mapSportToIntervalsType('yoga')).toBe('Other');
  });
});

// =============================================================================
// Activity → Workout Matching
// =============================================================================

function makeActivity(overrides: Partial<SyncActivity> = {}): SyncActivity {
  return {
    id: 'act-1',
    type: 'Ride',
    start_date_local: '2026-04-01T08:00:00',
    moving_time: 3600, // 60 min
    distance: 30000,
    icu_training_load: 80,
    ...overrides,
  };
}

function makeWorkout(overrides: Partial<PlannedWorkout> = {}): PlannedWorkout {
  return {
    id: 'w-1',
    date: '2026-04-01',
    sport: 'bike',
    planned_duration_minutes: 60,
    planned_tss: 80,
    planned_distance_meters: 30000,
    name: 'Endurance Ride',
    external_id: 'khepri-block1-2026-04-01-bike',
    block_id: 'block-1',
    intervals_activity_id: null,
    ...overrides,
  };
}

describe('matchActivityToWorkout', () => {
  it('matches activity to workout by date and sport', () => {
    const result = matchActivityToWorkout(makeActivity(), [makeWorkout()]);
    expect(result).not.toBeNull();
    expect(result?.workout.id).toBe('w-1');
    expect(result?.confidence).toBe('exact');
  });

  it('returns null when no workouts on that date', () => {
    const result = matchActivityToWorkout(makeActivity(), [makeWorkout({ date: '2026-04-02' })]);
    expect(result).toBeNull();
  });

  it('returns null when sport does not match', () => {
    const result = matchActivityToWorkout(makeActivity({ type: 'Run' }), [
      makeWorkout({ sport: 'bike' }),
    ]);
    expect(result).toBeNull();
  });

  it('returns null for unrecognised activity type', () => {
    const result = matchActivityToWorkout(makeActivity({ type: 'Hike' }), [makeWorkout()]);
    expect(result).toBeNull();
  });

  it('skips workouts matched to a different activity', () => {
    const result = matchActivityToWorkout(makeActivity({ id: 'act-new' }), [
      makeWorkout({ intervals_activity_id: 'existing-activity' }),
    ]);
    expect(result).toBeNull();
  });

  it('allows re-matching to the same activity for idempotent updates', () => {
    const result = matchActivityToWorkout(makeActivity({ id: 'act-1' }), [
      makeWorkout({ intervals_activity_id: 'act-1' }),
    ]);
    expect(result).not.toBeNull();
    expect(result?.workout.id).toBe('w-1');
  });

  it('picks closest by duration when multiple same-sport workouts on same day', () => {
    const shortWorkout = makeWorkout({ id: 'w-short', planned_duration_minutes: 30 });
    const longWorkout = makeWorkout({ id: 'w-long', planned_duration_minutes: 90 });

    // Activity is 40 min — closer to w-short (30 min) than w-long (90 min)
    const result = matchActivityToWorkout(
      makeActivity({ moving_time: 2400 }), // 40 min
      [shortWorkout, longWorkout]
    );
    expect(result).not.toBeNull();
    expect(result?.workout.id).toBe('w-short'); // 40 min closer to 30 than 90
  });

  it('assigns exact confidence for 80-120% duration match', () => {
    const result = matchActivityToWorkout(
      makeActivity({ moving_time: 3600 }), // 60 min
      [makeWorkout({ planned_duration_minutes: 60 })]
    );
    expect(result?.confidence).toBe('exact');
  });

  it('assigns probable confidence for 50-79% or 121-150% duration match', () => {
    const result = matchActivityToWorkout(
      makeActivity({ moving_time: 2700 }), // 45 min vs planned 60 → 75%
      [makeWorkout({ planned_duration_minutes: 60 })]
    );
    expect(result?.confidence).toBe('probable');
  });

  it('assigns weak confidence for <50% or >150% duration match', () => {
    const result = matchActivityToWorkout(
      makeActivity({ moving_time: 1200 }), // 20 min vs planned 60 → 33%
      [makeWorkout({ planned_duration_minutes: 60 })]
    );
    expect(result?.confidence).toBe('weak');
  });
});

// =============================================================================
// Compliance Computation
// =============================================================================

describe('computeCompliance', () => {
  it('returns green compliance for exact match', () => {
    const result = computeCompliance(
      { duration_minutes: 60, tss: 80, distance_meters: 30000 },
      { duration_minutes: 60, tss: 80, distance_meters: 30000 }
    );
    expect(result.score).toBe(100);
    expect(result.color).toBe('green');
    expect(result.completionStatus).toBe('completed');
    expect(result.tssMatch).toBe(100);
    expect(result.durationMatch).toBe(100);
    expect(result.distanceMatch).toBe(100);
  });

  it('uses TSS as primary metric when available', () => {
    const result = computeCompliance(
      { duration_minutes: 60, tss: 100 },
      { duration_minutes: 30, tss: 90 } // TSS=90% (green), duration=50% (amber)
    );
    // Primary is TSS → 90% → green
    expect(result.score).toBe(90);
    expect(result.color).toBe('green');
  });

  it('falls back to duration when TSS not available', () => {
    const result = computeCompliance({ duration_minutes: 60 }, { duration_minutes: 45 });
    // 45/60 = 75% → amber
    expect(result.score).toBe(75);
    expect(result.color).toBe('amber');
  });

  it('falls back to distance when duration and TSS unavailable', () => {
    const result = computeCompliance(
      { duration_minutes: 0, distance_meters: 1000 },
      { duration_minutes: 0, distance_meters: 800 }
    );
    // 800/1000 = 80% → green
    expect(result.score).toBe(80);
    expect(result.color).toBe('green');
  });

  it('returns amber for 50-79% match', () => {
    const result = computeCompliance(
      { duration_minutes: 60 },
      { duration_minutes: 36 } // 60%
    );
    expect(result.color).toBe('amber');
  });

  it('returns amber for 121-150% match', () => {
    const result = computeCompliance(
      { duration_minutes: 60 },
      { duration_minutes: 78 } // 130%
    );
    expect(result.color).toBe('amber');
  });

  it('returns red for <50% match', () => {
    const result = computeCompliance(
      { duration_minutes: 60 },
      { duration_minutes: 20 } // 33%
    );
    expect(result.color).toBe('red');
  });

  it('returns red for >150% match', () => {
    const result = computeCompliance(
      { duration_minutes: 60 },
      { duration_minutes: 100 } // 167%
    );
    expect(result.color).toBe('red');
  });

  it('returns skipped when actual duration is 0', () => {
    const result = computeCompliance({ duration_minutes: 60 }, { duration_minutes: 0 });
    expect(result.completionStatus).toBe('skipped');
  });

  it('returns partial when score < 50', () => {
    const result = computeCompliance(
      { duration_minutes: 60, tss: 100 },
      { duration_minutes: 15, tss: 30 } // 30%
    );
    expect(result.completionStatus).toBe('partial');
  });

  it('falls back to duration when actual TSS is missing but planned TSS exists', () => {
    const result = computeCompliance(
      { duration_minutes: 60, tss: 100 },
      { duration_minutes: 54, tss: null } // No actual TSS, falls back to duration: 54/60=90%
    );
    expect(result.score).toBe(90);
    expect(result.color).toBe('green');
    expect(result.tssMatch).toBeNull();
    expect(result.durationMatch).toBe(90);
  });

  it('handles null planned values gracefully', () => {
    const result = computeCompliance(
      { duration_minutes: 60, tss: null, distance_meters: null },
      { duration_minutes: 60, tss: null, distance_meters: null }
    );
    // Only duration available → 100%
    expect(result.score).toBe(100);
    expect(result.color).toBe('green');
    expect(result.tssMatch).toBeNull();
    expect(result.distanceMatch).toBeNull();
  });

  it('handles zero planned duration with no other metrics', () => {
    const result = computeCompliance({ duration_minutes: 0 }, { duration_minutes: 0 });
    expect(result.color).toBe('red');
    expect(result.score).toBe(0);
  });

  it('rounds match percentages', () => {
    const result = computeCompliance(
      { duration_minutes: 60, tss: 100 },
      { duration_minutes: 47, tss: 73 }
    );
    // TSS: 73/100 = 73, Duration: 47/60 = 78.33 → 78
    expect(result.tssMatch).toBe(73);
    expect(result.durationMatch).toBe(78);
  });
});

// =============================================================================
// Event Diff Detection
// =============================================================================

describe('diffEventVsWorkout', () => {
  const baseRemote: RemoteEventState = {
    id: 1,
    name: 'Endurance Ride',
    description: '- 60m 65%',
    moving_time: 3600,
    start_date_local: '2026-04-01',
  };

  const baseLocal: LocalEventState = {
    name: 'Endurance Ride',
    description_dsl: '- 60m 65%',
    planned_duration_minutes: 60,
    date: '2026-04-01',
  };

  it('reports no changes when event matches workout', () => {
    const result = diffEventVsWorkout(baseRemote, baseLocal);
    expect(result.changed).toBe(false);
    expect(result.fields).toHaveLength(0);
  });

  it('detects name change', () => {
    const result = diffEventVsWorkout({ ...baseRemote, name: 'Tempo Ride' }, baseLocal);
    expect(result.changed).toBe(true);
    expect(result.fields).toContain('name');
  });

  it('detects description change', () => {
    const result = diffEventVsWorkout({ ...baseRemote, description: '- 45m 70%' }, baseLocal);
    expect(result.changed).toBe(true);
    expect(result.fields).toContain('description');
  });

  it('detects duration change', () => {
    const result = diffEventVsWorkout(
      { ...baseRemote, moving_time: 2700 }, // 45 min vs 60 min
      baseLocal
    );
    expect(result.changed).toBe(true);
    expect(result.fields).toContain('duration');
  });

  it('detects date change', () => {
    const result = diffEventVsWorkout({ ...baseRemote, start_date_local: '2026-04-02' }, baseLocal);
    expect(result.changed).toBe(true);
    expect(result.fields).toContain('date');
  });

  it('detects multiple changes at once', () => {
    const result = diffEventVsWorkout(
      { ...baseRemote, name: 'New Name', start_date_local: '2026-04-05' },
      baseLocal
    );
    expect(result.changed).toBe(true);
    expect(result.fields).toContain('name');
    expect(result.fields).toContain('date');
    expect(result.fields).toHaveLength(2);
  });

  it('ignores duration when remote moving_time is null', () => {
    const result = diffEventVsWorkout({ ...baseRemote, moving_time: undefined }, baseLocal);
    expect(result.changed).toBe(false);
  });

  it('handles empty remote description vs empty local DSL', () => {
    const result = diffEventVsWorkout(
      { ...baseRemote, description: '' },
      { ...baseLocal, description_dsl: '' }
    );
    expect(result.changed).toBe(false);
  });

  it('handles undefined remote description as empty string', () => {
    const result = diffEventVsWorkout(
      { ...baseRemote, description: undefined },
      { ...baseLocal, description_dsl: '' }
    );
    expect(result.changed).toBe(false);
  });

  it('extracts date from datetime string for comparison', () => {
    const result = diffEventVsWorkout(
      { ...baseRemote, start_date_local: '2026-04-01T10:00:00' },
      baseLocal
    );
    expect(result.changed).toBe(false);
  });
});
