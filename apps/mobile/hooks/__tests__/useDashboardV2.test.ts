import { renderHook, waitFor } from '@testing-library/react-native';

// Mock dependencies before importing
jest.mock('@/contexts', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'user-1' } })),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

jest.mock('@/services/intervals', () => ({
  getRecentActivities: jest.fn(() => Promise.resolve([])),
}));

const mockGetAthleteByAuthUser = jest.fn();
const mockGetActiveSeason = jest.fn();
const mockGetActiveBlock = jest.fn();
const mockGetWorkoutsByDate = jest.fn();
const mockGetWorkoutsForDateRange = jest.fn();
const mockGetPendingAdaptations = jest.fn();
const mockGetTodayCheckin = jest.fn();
const mockGetGoalById = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getActiveSeason: (...args: unknown[]) => mockGetActiveSeason(...args),
  getActiveBlock: (...args: unknown[]) => mockGetActiveBlock(...args),
  getWorkoutsByDate: (...args: unknown[]) => mockGetWorkoutsByDate(...args),
  getWorkoutsForDateRange: (...args: unknown[]) => mockGetWorkoutsForDateRange(...args),
  getPendingAdaptations: (...args: unknown[]) => mockGetPendingAdaptations(...args),
  getTodayCheckin: (...args: unknown[]) => mockGetTodayCheckin(...args),
  getGoalById: (...args: unknown[]) => mockGetGoalById(...args),
}));

import { useDashboardV2 } from '../useDashboardV2';

function setupDefaultMocks() {
  mockGetAthleteByAuthUser.mockResolvedValue({
    data: { id: 'athlete-1', display_name: 'Test Athlete' },
    error: null,
  });
  mockGetActiveSeason.mockResolvedValue({ data: null, error: null });
  mockGetActiveBlock.mockResolvedValue({ data: null, error: null });
  mockGetWorkoutsByDate.mockResolvedValue({ data: [], error: null });
  mockGetWorkoutsForDateRange.mockResolvedValue({ data: [], error: null });
  mockGetPendingAdaptations.mockResolvedValue({ data: [], error: null });
  mockGetTodayCheckin.mockResolvedValue({ data: null, error: null });
  mockGetGoalById.mockResolvedValue({ data: null, error: null });
}

describe('useDashboardV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useDashboardV2());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns data after loading with no season', async () => {
    const { result } = renderHook(() => useDashboardV2());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.season).toBeNull();
    expect(result.current.data?.activeBlock).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns season and block data when active', async () => {
    const season = { id: 's1', name: '2026 Season', status: 'active' };
    const block = {
      id: 'b1',
      name: 'Block 1',
      start_date: '2026-03-01',
      end_date: '2026-06-01',
      total_weeks: 12,
      goal_id: null,
      status: 'in_progress',
    };

    mockGetActiveSeason.mockResolvedValue({ data: season, error: null });
    mockGetActiveBlock.mockResolvedValue({ data: block, error: null });

    const { result } = renderHook(() => useDashboardV2());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.season).toEqual(season);
    expect(result.current.data?.activeBlock).toEqual(block);
    expect(result.current.data?.blockWeek).toBeGreaterThan(0);
  });

  it('returns error when athlete fetch fails', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const { result } = renderHook(() => useDashboardV2());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Not found');
    expect(result.current.data).toBeNull();
  });

  it('returns checkInDone when checkin exists', async () => {
    mockGetTodayCheckin.mockResolvedValue({
      data: { id: 'c1' },
      error: null,
    });

    const { result } = renderHook(() => useDashboardV2());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.checkInDone).toBe(true);
  });

  it('returns pending adaptations', async () => {
    const adaptations = [{ id: 'a1', reason: 'Fatigue', status: 'suggested' }];
    mockGetPendingAdaptations.mockResolvedValue({ data: adaptations, error: null });

    const { result } = renderHook(() => useDashboardV2());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.pendingAdaptations).toHaveLength(1);
  });

  it('computes weekly compliance from week workouts', async () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const workouts = [
      {
        date: todayStr,
        planned_duration_minutes: 60,
        actual_duration_minutes: 58,
        planned_tss: 75,
        actual_tss: 72,
        compliance: {
          score: 'green',
          metric_used: 'tss',
          planned_value: 75,
          actual_value: 72,
          ratio: 0.96,
          direction: 'on_target',
        },
      },
    ];
    mockGetWorkoutsForDateRange.mockResolvedValue({ data: workouts, error: null });

    const { result } = renderHook(() => useDashboardV2());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.weeklyCompliance).not.toBeNull();
    expect(result.current.data?.weeklyCompliance?.completed_sessions).toBe(1);
  });

  it('fetches next race when block has goal_id', async () => {
    const block = {
      id: 'b1',
      name: 'Block 1',
      start_date: '2026-03-01',
      end_date: '2026-06-01',
      total_weeks: 12,
      goal_id: 'g1',
      status: 'in_progress',
    };
    mockGetActiveBlock.mockResolvedValue({ data: block, error: null });
    mockGetGoalById.mockResolvedValue({
      data: {
        id: 'g1',
        title: 'Ironman 70.3',
        race_event_name: 'Ironman 70.3 Cascais',
        target_date: '2026-08-15',
      },
      error: null,
    });

    const { result } = renderHook(() => useDashboardV2());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.nextRace).not.toBeNull();
    expect(result.current.data?.nextRace?.name).toBe('Ironman 70.3 Cascais');
  });
});
