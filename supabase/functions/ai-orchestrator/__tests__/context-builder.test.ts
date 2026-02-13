import { jest } from '@jest/globals';
import { fetchAthleteContext } from '../context-builder.ts';

// =============================================================================
// Mock helpers
// =============================================================================

interface MockChain {
  from: jest.Mock;
  select: jest.Mock;
  eq: jest.Mock;
  or: jest.Mock;
  order: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
}

function createMockChain(): MockChain {
  const chain: MockChain = {
    from: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    or: jest.fn(),
    order: jest.fn(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  };

  chain.from.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.or.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);

  return chain;
}

/**
 * Build a mock Supabase client that returns different chain instances
 * for each `from()` call, so we can control per-table responses independently.
 */
function createMockSupabase(overrides?: {
  athlete?: { data: unknown; error: unknown };
  goals?: { data: unknown; error: unknown };
  constraints?: { data: unknown; error: unknown };
  checkin?: { data: unknown; error: unknown };
}) {
  const athleteChain = createMockChain();
  const goalsChain = createMockChain();
  const constraintsChain = createMockChain();
  const checkinChain = createMockChain();

  athleteChain.single.mockResolvedValue(
    overrides?.athlete ?? {
      data: {
        id: 'athlete-1',
        display_name: 'Test Athlete',
        ftp_watts: 250,
        weight_kg: 70,
        running_threshold_pace_sec_per_km: 300,
        css_sec_per_100m: 105,
        max_heart_rate: 185,
        lthr: 170,
      },
      error: null,
    }
  );

  goalsChain.order.mockResolvedValue(
    overrides?.goals ?? {
      data: [
        {
          id: 'g1',
          title: 'Complete Ironman',
          goal_type: 'race',
          target_date: '2026-09-01',
          priority: 'A',
          race_event_name: 'Ironman Barcelona',
          race_distance: '140.6mi',
          race_target_time_seconds: 43200,
        },
      ],
      error: null,
    }
  );

  constraintsChain.or.mockResolvedValue(
    overrides?.constraints ?? {
      data: [
        {
          id: 'c1',
          constraint_type: 'injury',
          description: 'Left knee pain',
          start_date: '2026-01-15',
          end_date: null,
          injury_body_part: 'left_knee',
          injury_severity: 'moderate',
          injury_restrictions: ['run', 'high_intensity'],
        },
      ],
      error: null,
    }
  );

  checkinChain.maybeSingle.mockResolvedValue(
    overrides?.checkin ?? {
      data: {
        checkin_date: '2026-02-14',
        energy_level: 7,
        sleep_quality: 8,
        stress_level: 3,
        muscle_soreness: 4,
        resting_hr: 52,
        hrv_ms: 65,
      },
      error: null,
    }
  );

  const tableMap: Record<string, MockChain> = {
    athletes: athleteChain,
    goals: goalsChain,
    constraints: constraintsChain,
    daily_checkins: checkinChain,
  };

  const supabase = {
    from: jest.fn((table: string) => {
      const chain = tableMap[table];
      if (!chain) throw new Error(`Unexpected table: ${table}`);
      return chain;
    }),
  };

  return { supabase, athleteChain, goalsChain, constraintsChain, checkinChain };
}

// =============================================================================
// Tests
// =============================================================================

describe('fetchAthleteContext', () => {
  it('assembles full context from all data sources', async () => {
    const { supabase } = createMockSupabase();

    // biome-ignore lint/suspicious/noExplicitAny: mock supabase client
    const result = await fetchAthleteContext(supabase as any, 'athlete-1');

    expect(result.athlete_id).toBe('athlete-1');
    expect(result.display_name).toBe('Test Athlete');
    expect(result.ftp_watts).toBe(250);
    expect(result.weight_kg).toBe(70);
    expect(result.running_threshold_pace_sec_per_km).toBe(300);
    expect(result.css_sec_per_100m).toBe(105);
    expect(result.max_heart_rate).toBe(185);
    expect(result.lthr).toBe(170);

    expect(result.active_goals).toHaveLength(1);
    expect(result.active_goals?.[0].title).toBe('Complete Ironman');
    expect(result.active_goals?.[0].goal_type).toBe('race');
    expect(result.active_goals?.[0].race_event_name).toBe('Ironman Barcelona');

    expect(result.active_constraints).toHaveLength(1);
    expect(result.active_constraints?.[0].type).toBe('injury');
    expect(result.active_constraints?.[0].injury_severity).toBe('moderate');

    expect(result.recent_checkin).toBeDefined();
    expect(result.recent_checkin?.date).toBe('2026-02-14');
    expect(result.recent_checkin?.resting_hr).toBe(52);
    expect(result.recent_checkin?.hrv_ms).toBe(65);
  });

  it('throws when athlete is not found (null data)', async () => {
    const { supabase } = createMockSupabase({
      athlete: { data: null, error: null },
    });

    // biome-ignore lint/suspicious/noExplicitAny: mock supabase client
    await expect(fetchAthleteContext(supabase as any, 'missing-id')).rejects.toThrow(
      'Athlete not found: missing-id'
    );
  });

  it('throws when athlete query returns an error', async () => {
    const { supabase } = createMockSupabase({
      athlete: { data: null, error: { message: 'Connection refused' } },
    });

    // biome-ignore lint/suspicious/noExplicitAny: mock supabase client
    await expect(fetchAthleteContext(supabase as any, 'athlete-1')).rejects.toThrow(
      'Failed to fetch athlete: Connection refused'
    );
  });

  it('returns empty arrays when no goals or constraints exist', async () => {
    const { supabase } = createMockSupabase({
      goals: { data: [], error: null },
      constraints: { data: [], error: null },
    });

    // biome-ignore lint/suspicious/noExplicitAny: mock supabase client
    const result = await fetchAthleteContext(supabase as any, 'athlete-1');

    expect(result.active_goals).toEqual([]);
    expect(result.active_constraints).toEqual([]);
  });

  it('returns empty arrays when goals/constraints data is null', async () => {
    const { supabase } = createMockSupabase({
      goals: { data: null, error: { message: 'Table not found' } },
      constraints: { data: null, error: { message: 'Table not found' } },
    });

    // biome-ignore lint/suspicious/noExplicitAny: mock supabase client
    const result = await fetchAthleteContext(supabase as any, 'athlete-1');

    expect(result.active_goals).toEqual([]);
    expect(result.active_constraints).toEqual([]);
  });

  it('returns undefined recent_checkin when no check-in exists today', async () => {
    const { supabase } = createMockSupabase({
      checkin: { data: null, error: null },
    });

    // biome-ignore lint/suspicious/noExplicitAny: mock supabase client
    const result = await fetchAthleteContext(supabase as any, 'athlete-1');

    expect(result.recent_checkin).toBeUndefined();
  });

  it('maps null optional athlete fields to undefined', async () => {
    const { supabase } = createMockSupabase({
      athlete: {
        data: {
          id: 'athlete-1',
          display_name: null,
          ftp_watts: null,
          weight_kg: null,
          running_threshold_pace_sec_per_km: null,
          css_sec_per_100m: null,
          max_heart_rate: null,
          lthr: null,
        },
        error: null,
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: mock supabase client
    const result = await fetchAthleteContext(supabase as any, 'athlete-1');

    expect(result.display_name).toBeUndefined();
    expect(result.ftp_watts).toBeUndefined();
    expect(result.weight_kg).toBeUndefined();
    expect(result.running_threshold_pace_sec_per_km).toBeUndefined();
    expect(result.css_sec_per_100m).toBeUndefined();
    expect(result.max_heart_rate).toBeUndefined();
    expect(result.lthr).toBeUndefined();
  });

  it('skips check-in query when includeCheckin is false', async () => {
    const { supabase, checkinChain } = createMockSupabase();

    // biome-ignore lint/suspicious/noExplicitAny: mock supabase client
    const result = await fetchAthleteContext(supabase as any, 'athlete-1', {
      includeCheckin: false,
    });

    expect(result.recent_checkin).toBeUndefined();
    // The checkin chain should not have been called
    expect(checkinChain.maybeSingle).not.toHaveBeenCalled();
  });

  it('fetches all data in parallel via Promise.all', async () => {
    const callOrder: string[] = [];

    const { supabase, athleteChain, goalsChain, constraintsChain, checkinChain } =
      createMockSupabase();

    // Override to track call order with delays
    athleteChain.single.mockImplementation(
      () =>
        new Promise((resolve) => {
          callOrder.push('athlete-start');
          setTimeout(() => {
            callOrder.push('athlete-end');
            resolve({
              data: {
                id: 'a1',
                display_name: 'A',
                ftp_watts: null,
                weight_kg: null,
                running_threshold_pace_sec_per_km: null,
                css_sec_per_100m: null,
                max_heart_rate: null,
                lthr: null,
              },
              error: null,
            });
          }, 10);
        })
    );

    goalsChain.order.mockImplementation(
      () =>
        new Promise((resolve) => {
          callOrder.push('goals-start');
          setTimeout(() => {
            callOrder.push('goals-end');
            resolve({ data: [], error: null });
          }, 10);
        })
    );

    constraintsChain.or.mockImplementation(
      () =>
        new Promise((resolve) => {
          callOrder.push('constraints-start');
          setTimeout(() => {
            callOrder.push('constraints-end');
            resolve({ data: [], error: null });
          }, 10);
        })
    );

    checkinChain.maybeSingle.mockImplementation(
      () =>
        new Promise((resolve) => {
          callOrder.push('checkin-start');
          setTimeout(() => {
            callOrder.push('checkin-end');
            resolve({ data: null, error: null });
          }, 10);
        })
    );

    // biome-ignore lint/suspicious/noExplicitAny: mock supabase client
    await fetchAthleteContext(supabase as any, 'a1');

    // All starts should come before any ends (parallel execution)
    const starts = callOrder.filter((c) => c.endsWith('-start'));
    const ends = callOrder.filter((c) => c.endsWith('-end'));
    expect(starts).toHaveLength(4);
    expect(ends).toHaveLength(4);

    // Every start should come before the first end
    const firstEndIndex = callOrder.findIndex((c) => c.endsWith('-end'));
    const allStartsBeforeFirstEnd = starts.every((s) => callOrder.indexOf(s) < firstEndIndex);
    expect(allStartsBeforeFirstEnd).toBe(true);
  });

  it('maps constraint_type to type in output', async () => {
    const { supabase } = createMockSupabase({
      constraints: {
        data: [
          {
            id: 'c1',
            constraint_type: 'travel',
            description: 'Business trip',
            start_date: '2026-03-01',
            end_date: '2026-03-07',
            injury_body_part: null,
            injury_severity: null,
            injury_restrictions: null,
          },
        ],
        error: null,
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: mock supabase client
    const result = await fetchAthleteContext(supabase as any, 'athlete-1');

    expect(result.active_constraints?.[0].type).toBe('travel');
    expect(result.active_constraints?.[0].description).toBe('Business trip');
  });
});
