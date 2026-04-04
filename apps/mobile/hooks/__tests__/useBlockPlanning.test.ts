import { renderHook, waitFor } from '@testing-library/react-native';
import { useBlockPlanning } from '../useBlockPlanning';

const mockGetAthleteByAuthUser = jest.fn();
const mockGetActiveSeason = jest.fn();
const mockGetSeasonRaceBlocks = jest.fn();
const mockGetBlockWorkouts = jest.fn();
const mockCreateRaceBlock = jest.fn();
const mockLockBlock = jest.fn();
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
