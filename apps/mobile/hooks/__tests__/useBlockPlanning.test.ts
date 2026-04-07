import { renderHook, waitFor } from '@testing-library/react-native';
import { useBlockPlanning } from '../useBlockPlanning';

const mockGetAthleteByAuthUser = jest.fn();
const mockGetActiveSeason = jest.fn();
const mockGetSeasonRaceBlocks = jest.fn();
const mockGetBlockWorkouts = jest.fn();
const mockCreateRaceBlock = jest.fn();
const mockLockBlock = jest.fn();
const mockGetUpcomingRaceGoals = jest.fn();
const mockFunctionsInvoke = jest.fn();
let mockSupabase: { functions: { invoke: jest.Mock } } | undefined;

jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'test-user-123' } }),
}));

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getActiveSeason: (...args: unknown[]) => mockGetActiveSeason(...args),
  getSeasonRaceBlocks: (...args: unknown[]) => mockGetSeasonRaceBlocks(...args),
  getBlockWorkouts: (...args: unknown[]) => mockGetBlockWorkouts(...args),
  createRaceBlock: (...args: unknown[]) => mockCreateRaceBlock(...args),
  lockBlock: (...args: unknown[]) => mockLockBlock(...args),
  getUpcomingRaceGoals: (...args: unknown[]) => mockGetUpcomingRaceGoals(...args),
}));

const MOCK_SEASON = {
  id: 'season-1',
  athlete_id: 'athlete-1',
  name: '2026 Season',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  status: 'active',
  preferences: {
    weeklyHoursTarget: 10,
    availableDays: [0, 1, 2, 3, 4, 5],
    sportPriority: ['run', 'bike', 'swim'],
    maxSessionsPerDay: 2,
    preferredRestDays: [6],
  },
  skeleton: {
    phases: [
      {
        name: 'Base 1',
        startDate: '2026-01-01',
        endDate: '2026-02-26',
        focus: 'Base building',
        weeklyHours: 8,
      },
      {
        name: 'Build 1',
        startDate: '2026-02-26',
        endDate: '2026-04-23',
        focus: 'Build threshold',
        weeklyHours: 10,
      },
    ],
    generatedAt: '2026-01-01T00:00:00.000Z',
  },
};

describe('useBlockPlanning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFunctionsInvoke.mockResolvedValue({ data: { success: true }, error: null });
    mockGetUpcomingRaceGoals.mockResolvedValue({ data: [], error: null });
    mockSupabase = { functions: { invoke: mockFunctionsInvoke } };
  });

  it('loads season and shows setup step when no existing block', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.step).toBe('setup');
    expect(result.current.season).toEqual(MOCK_SEASON);
    expect(result.current.block).toBeNull();
  });

  it('returns blockMeta from skeleton when no block exists', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.blockMeta).not.toBeNull();
    expect(result.current.blockMeta?.blockName).toBe('Base 1');
    expect(result.current.blockMeta?.blockStartDate).toBe('2026-01-01');
    expect(result.current.blockMeta?.blockEndDate).toBe('2026-04-23');
    expect(result.current.blockMeta?.blockTotalWeeks).toBeGreaterThan(0);
  });

  it('returns blockMeta from block fields when existing block exists', async () => {
    const mockBlock = {
      id: 'block-1',
      season_id: 'season-1',
      status: 'draft',
      name: 'Build 1',
      start_date: '2026-02-01',
      end_date: '2026-04-01',
      total_weeks: 9,
    };
    const mockWorkouts = [{ id: 'w1', block_id: 'block-1', week_number: 1, sport: 'run' }];

    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks.mockResolvedValue({ data: [mockBlock], error: null });
    mockGetBlockWorkouts.mockResolvedValue({ data: mockWorkouts, error: null });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.blockMeta).toEqual({
      blockName: 'Build 1',
      blockStartDate: '2026-02-01',
      blockEndDate: '2026-04-01',
      blockTotalWeeks: 9,
    });
  });

  it('returns null blockMeta when no season is loaded', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.blockMeta).toBeNull();
  });

  it('returns null blockMeta when season skeleton is malformed', async () => {
    const seasonWithBadSkeleton = { ...MOCK_SEASON, skeleton: null };
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: seasonWithBadSkeleton, error: null });
    mockGetSeasonRaceBlocks.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.blockMeta).toBeNull();
  });

  it('derives blockMeta weeks correctly from skeleton phases', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Both skeleton phases span 2026-01-01 to 2026-04-23; week count must be positive
    const meta = result.current.blockMeta;
    expect(meta).not.toBeNull();
    expect(meta?.blockTotalWeeks).toBeGreaterThan(0);
    expect(meta?.blockStartDate).toBe('2026-01-01');
    expect(meta?.blockEndDate).toBe('2026-04-23');
  });

  it('sets error when getSeasonRaceBlocks fails', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Could not load season blocks');
  });

  it('resets block and workouts when no existing block found on refresh', async () => {
    // First render: existing block found
    const mockBlock = {
      id: 'block-1',
      season_id: 'season-1',
      status: 'draft',
      name: 'Base 1',
      start_date: '2026-01-01',
      end_date: '2026-04-23',
      total_weeks: 16,
    };
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks
      .mockResolvedValueOnce({ data: [mockBlock], error: null })
      .mockResolvedValueOnce({ data: [], error: null }); // second call returns no blocks
    mockGetBlockWorkouts.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBlockPlanning());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.block).toEqual(mockBlock);

    // Refresh — second call returns no blocks
    await result.current.refresh();

    await waitFor(() => {
      expect(result.current.block).toBeNull();
    });
    expect(result.current.workouts).toHaveLength(0);
    expect(result.current.step).toBe('setup');
  });

  it('shows review step when draft block with workouts exists', async () => {
    const mockBlock = {
      id: 'block-1',
      season_id: 'season-1',
      status: 'draft',
      name: 'Base 1',
      total_weeks: 8,
    };
    const mockWorkouts = [{ id: 'w1', block_id: 'block-1', week_number: 1, sport: 'run' }];

    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks.mockResolvedValue({ data: [mockBlock], error: null });
    mockGetBlockWorkouts.mockResolvedValue({ data: mockWorkouts, error: null });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.step).toBe('review');
    expect(result.current.block).toEqual(mockBlock);
    expect(result.current.workouts).toEqual(mockWorkouts);
  });

  it('shows done step when locked block exists', async () => {
    const mockBlock = {
      id: 'block-1',
      season_id: 'season-1',
      status: 'locked',
      name: 'Base 1',
      total_weeks: 8,
    };

    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks.mockResolvedValue({ data: [mockBlock], error: null });
    mockGetBlockWorkouts.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.step).toBe('done');
  });

  it('sets error when no active season', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('No active season');
  });

  it('sets error when supabase is not configured', async () => {
    mockSupabase = undefined;

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.step).toBe('loading');
    expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
  });

  it('generates workouts by creating block and calling edge function', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    mockGetBlockWorkouts.mockResolvedValue({ data: [], error: null });
    mockCreateRaceBlock.mockResolvedValue({
      data: { id: 'block-new', phases: [] },
      error: null,
    });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.step).toBe('setup');
    });

    await result.current.generateWorkouts({
      weeklyHoursMin: 8,
      weeklyHoursMax: 12,
      unavailableDates: [],
    });

    await waitFor(() => {
      expect(mockCreateRaceBlock).toHaveBeenCalled();
    });
    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'generate-block-workouts',
      expect.objectContaining({ body: expect.any(Object) })
    );
  });

  it('sets error when generateWorkouts fails on block creation', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    mockGetBlockWorkouts.mockResolvedValue({ data: [], error: null });
    mockCreateRaceBlock.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.step).toBe('setup');
    });

    await result.current.generateWorkouts({
      weeklyHoursMin: 8,
      weeklyHoursMax: 12,
      unavailableDates: [],
    });

    await waitFor(() => {
      expect(result.current.error).toContain('DB error');
    });
    expect(result.current.step).toBe('setup');
  });

  it('sets error when no supabase during generate', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.step).toBe('setup');
    });

    // Set supabase to undefined temporarily
    mockSupabase = undefined;

    await result.current.generateWorkouts({
      weeklyHoursMin: 8,
      weeklyHoursMax: 12,
      unavailableDates: [],
    });

    await waitFor(() => {
      expect(result.current.error).toContain('Missing configuration');
    });

    // Restore
    mockSupabase = { functions: { invoke: mockFunctionsInvoke } };
  });

  it('locks block and transitions to done', async () => {
    const mockBlock = {
      id: 'block-1',
      season_id: 'season-1',
      status: 'draft',
      name: 'Base 1',
      total_weeks: 8,
    };
    const mockWorkouts = [{ id: 'w1', block_id: 'block-1', week_number: 1, sport: 'run' }];

    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks.mockResolvedValue({ data: [mockBlock], error: null });
    mockGetBlockWorkouts.mockResolvedValue({ data: mockWorkouts, error: null });
    mockLockBlock.mockResolvedValue({
      data: { ...mockBlock, status: 'locked' },
      error: null,
    });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.step).toBe('review');
    });

    await result.current.lockIn();

    await waitFor(() => {
      expect(result.current.step).toBe('done');
    });
    expect(mockLockBlock).toHaveBeenCalledWith(expect.anything(), 'block-1');
  });

  it('sets error when lockIn fails', async () => {
    const mockBlock = {
      id: 'block-1',
      season_id: 'season-1',
      status: 'draft',
      name: 'Base 1',
      total_weeks: 8,
    };

    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks.mockResolvedValue({ data: [mockBlock], error: null });
    mockGetBlockWorkouts.mockResolvedValue({
      data: [{ id: 'w1', block_id: 'block-1', week_number: 1 }],
      error: null,
    });
    mockLockBlock.mockResolvedValue({
      data: null,
      error: { message: 'Lock failed' },
    });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.step).toBe('review');
    });

    await result.current.lockIn();

    await waitFor(() => {
      expect(result.current.error).toContain('Lock failed');
    });
    expect(result.current.step).toBe('review');
  });

  it('passes sport_requirements and day_preferences in generate-block-workouts body (P9E-R-05)', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    mockGetBlockWorkouts.mockResolvedValue({ data: [], error: null });
    mockCreateRaceBlock.mockResolvedValue({
      data: { id: 'block-new', phases: [] },
      error: null,
    });
    // A 70.3 race implies swim+bike+run requirements
    mockGetUpcomingRaceGoals.mockResolvedValue({
      data: [{ race_discipline: 'triathlon', race_distance: '70.3' }],
      error: null,
    });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.step).toBe('setup');
    });

    await result.current.generateWorkouts({
      weeklyHoursMin: 8,
      weeklyHoursMax: 12,
      unavailableDates: [],
      dayPreferences: [
        { dayOfWeek: 5, sport: 'bike', workoutLabel: 'Long Ride' },
        { dayOfWeek: 0, sport: 'run' },
      ],
    });

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalled();
    });

    const invokeCall = mockFunctionsInvoke.mock.calls[0];
    expect(invokeCall[0]).toBe('generate-block-workouts');
    const body = invokeCall[1].body;
    expect(body.day_preferences).toEqual([
      { dayOfWeek: 5, sport: 'bike', workoutLabel: 'Long Ride' },
      { dayOfWeek: 0, sport: 'run' },
    ]);
    expect(Array.isArray(body.sport_requirements)).toBe(true);
    const sports = (body.sport_requirements as Array<{ sport: string }>).map((r) => r.sport);
    expect(sports).toEqual(expect.arrayContaining(['swim', 'bike', 'run']));
    for (const r of body.sport_requirements as Array<{ minWeeklySessions: number }>) {
      expect(typeof r.minWeeklySessions).toBe('number');
      expect(r.minWeeklySessions).toBeGreaterThanOrEqual(0);
    }
  });

  it('defaults day_preferences and sport_requirements when not provided (backward compat)', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    mockGetBlockWorkouts.mockResolvedValue({ data: [], error: null });
    mockCreateRaceBlock.mockResolvedValue({
      data: { id: 'block-new', phases: [] },
      error: null,
    });
    // No upcoming races → empty sport_requirements
    mockGetUpcomingRaceGoals.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.step).toBe('setup');
    });

    await result.current.generateWorkouts({
      weeklyHoursMin: 8,
      weeklyHoursMax: 12,
      unavailableDates: [],
    });

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalled();
    });
    const body = mockFunctionsInvoke.mock.calls[0][1].body;
    expect(body.day_preferences).toEqual([]);
    expect(body.sport_requirements).toEqual([]);
  });

  it('filters workoutsForWeek by selected week', async () => {
    const mockBlock = {
      id: 'block-1',
      season_id: 'season-1',
      status: 'draft',
      name: 'Base 1',
      total_weeks: 8,
    };
    const mockWorkouts = [
      { id: 'w1', block_id: 'block-1', week_number: 1, sport: 'run' },
      { id: 'w2', block_id: 'block-1', week_number: 1, sport: 'bike' },
      { id: 'w3', block_id: 'block-1', week_number: 2, sport: 'swim' },
    ];

    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveSeason.mockResolvedValue({ data: MOCK_SEASON, error: null });
    mockGetSeasonRaceBlocks.mockResolvedValue({ data: [mockBlock], error: null });
    mockGetBlockWorkouts.mockResolvedValue({ data: mockWorkouts, error: null });

    const { result } = renderHook(() => useBlockPlanning());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Default selectedWeek is 1
    expect(result.current.workoutsForWeek).toHaveLength(2);
    expect(result.current.workoutsForWeek.every((w) => w.week_number === 1)).toBe(true);
  });
});
