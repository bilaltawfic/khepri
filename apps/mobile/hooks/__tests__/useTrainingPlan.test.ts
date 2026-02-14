import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useTrainingPlan } from '../useTrainingPlan';

// Mock useAuth
let mockUser: { id: string } | null = { id: 'auth-user-123' };
jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

// Mock supabase-client queries
const mockGetAthleteByAuthUser = jest.fn();
const mockGetActiveTrainingPlan = jest.fn();
const mockPauseTrainingPlan = jest.fn();
const mockCancelTrainingPlan = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getActiveTrainingPlan: (...args: unknown[]) => mockGetActiveTrainingPlan(...args),
  pauseTrainingPlan: (...args: unknown[]) => mockPauseTrainingPlan(...args),
  cancelTrainingPlan: (...args: unknown[]) => mockCancelTrainingPlan(...args),
}));

describe('useTrainingPlan', () => {
  const mockAthleteId = 'athlete-123';
  const mockPlan = {
    id: 'plan-1',
    athlete_id: mockAthleteId,
    goal_id: 'goal-1',
    name: 'Ironman Base Training',
    description: '20-week Ironman preparation plan',
    start_date: '2026-01-06',
    end_date: '2026-05-25',
    total_weeks: 20,
    status: 'active',
    periodization: {
      phases: [
        {
          phase: 'base',
          weeks: 8,
          focus: 'aerobic_endurance',
          intensity_distribution: [80, 15, 5],
        },
        { phase: 'build', weeks: 6, focus: 'threshold_work', intensity_distribution: [70, 20, 10] },
        { phase: 'peak', weeks: 4, focus: 'race_specific', intensity_distribution: [60, 25, 15] },
        { phase: 'taper', weeks: 2, focus: 'recovery', intensity_distribution: [85, 10, 5] },
      ],
      weekly_volumes: [
        { week: 1, volume_multiplier: 0.7, phase: 'base' },
        { week: 2, volume_multiplier: 0.8, phase: 'base' },
      ],
    },
    weekly_template: null,
    adaptations: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'auth-user-123' };

    mockGetAthleteByAuthUser.mockResolvedValue({
      data: { id: mockAthleteId },
      error: null,
    });

    mockGetActiveTrainingPlan.mockResolvedValue({
      data: mockPlan,
      error: null,
    });

    mockPauseTrainingPlan.mockResolvedValue({ data: null, error: null });
    mockCancelTrainingPlan.mockResolvedValue({ data: null, error: null });
  });

  describe('initial loading', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() => useTrainingPlan());
      expect(result.current.isLoading).toBe(true);
    });

    it('loads active plan successfully', async () => {
      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plan).toEqual(mockPlan);
      expect(result.current.error).toBeNull();
    });

    it('fetches athlete by auth user id', async () => {
      renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(mockGetAthleteByAuthUser).toHaveBeenCalledWith(expect.anything(), 'auth-user-123');
      });
    });
  });

  describe('no active plan', () => {
    it('sets plan to null when no active plan exists', async () => {
      mockGetActiveTrainingPlan.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plan).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('no user', () => {
    it('clears state and stops loading when user is null', async () => {
      mockUser = null;

      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plan).toBeNull();
      expect(result.current.error).toBeNull();
      expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('sets error when athlete fetch fails', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: { message: 'Athlete not found' },
      });

      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.error).toBe('Athlete not found');
      });

      expect(result.current.plan).toBeNull();
    });

    it('sets error when no athlete row exists for user', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.error).toBe('No athlete profile found for this user');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets error when plan fetch fails', async () => {
      mockGetActiveTrainingPlan.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch plan' },
      });

      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch plan');
      });
    });

    it('handles exception during fetch', async () => {
      mockGetAthleteByAuthUser.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });

    it('handles non-Error exception during fetch', async () => {
      mockGetAthleteByAuthUser.mockRejectedValue('string error');

      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load training plan');
      });
    });
  });

  describe('pausePlan', () => {
    it('pauses the active plan and clears state', async () => {
      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.plan).toEqual(mockPlan);
      });

      let pauseResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        pauseResult = await result.current.pausePlan();
      });

      expect(pauseResult?.success).toBe(true);
      expect(mockPauseTrainingPlan).toHaveBeenCalledWith(expect.anything(), 'plan-1');
      expect(result.current.plan).toBeNull();
    });

    it('returns error when no active plan exists', async () => {
      mockGetActiveTrainingPlan.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let pauseResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        pauseResult = await result.current.pausePlan();
      });

      expect(pauseResult?.success).toBe(false);
      expect(pauseResult?.error).toBe('No active plan');
    });

    it('returns error when pause query fails', async () => {
      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.plan).toEqual(mockPlan);
      });

      mockPauseTrainingPlan.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      let pauseResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        pauseResult = await result.current.pausePlan();
      });

      expect(pauseResult?.success).toBe(false);
      expect(pauseResult?.error).toBe('Database error');
    });

    it('handles exception during pause', async () => {
      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.plan).toEqual(mockPlan);
      });

      mockPauseTrainingPlan.mockRejectedValue(new Error('Network error'));

      let pauseResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        pauseResult = await result.current.pausePlan();
      });

      expect(pauseResult?.success).toBe(false);
      expect(pauseResult?.error).toBe('Network error');
    });
  });

  describe('cancelPlan', () => {
    it('cancels the active plan and clears state', async () => {
      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.plan).toEqual(mockPlan);
      });

      let cancelResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        cancelResult = await result.current.cancelPlan();
      });

      expect(cancelResult?.success).toBe(true);
      expect(mockCancelTrainingPlan).toHaveBeenCalledWith(expect.anything(), 'plan-1');
      expect(result.current.plan).toBeNull();
    });

    it('returns error when no active plan exists', async () => {
      mockGetActiveTrainingPlan.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let cancelResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        cancelResult = await result.current.cancelPlan();
      });

      expect(cancelResult?.success).toBe(false);
      expect(cancelResult?.error).toBe('No active plan');
    });

    it('returns error when cancel query fails', async () => {
      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.plan).toEqual(mockPlan);
      });

      mockCancelTrainingPlan.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      let cancelResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        cancelResult = await result.current.cancelPlan();
      });

      expect(cancelResult?.success).toBe(false);
      expect(cancelResult?.error).toBe('Database error');
    });

    it('handles exception during cancel', async () => {
      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.plan).toEqual(mockPlan);
      });

      mockCancelTrainingPlan.mockRejectedValue(new Error('Network error'));

      let cancelResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        cancelResult = await result.current.cancelPlan();
      });

      expect(cancelResult?.success).toBe(false);
      expect(cancelResult?.error).toBe('Network error');
    });
  });

  describe('refresh', () => {
    it('re-fetches plan data', async () => {
      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetActiveTrainingPlan.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetActiveTrainingPlan).toHaveBeenCalled();
    });

    it('does nothing when no user is available', async () => {
      mockUser = null;

      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetActiveTrainingPlan.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetActiveTrainingPlan).not.toHaveBeenCalled();
    });

    it('sets error when refresh fails', async () => {
      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetActiveTrainingPlan.mockResolvedValue({
        data: null,
        error: { message: 'Refresh failed' },
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('Refresh failed');
    });

    it('handles exception during refresh', async () => {
      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetActiveTrainingPlan.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('re-fetches athlete when athleteId is null (initial fetch failed)', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: { message: 'Temporary failure' },
      });

      const { result } = renderHook(() => useTrainingPlan());

      await waitFor(() => {
        expect(result.current.error).toBe('Temporary failure');
      });

      mockGetAthleteByAuthUser.mockResolvedValue({
        data: { id: mockAthleteId },
        error: null,
      });
      mockGetActiveTrainingPlan.mockResolvedValue({
        data: mockPlan,
        error: null,
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetAthleteByAuthUser).toHaveBeenCalledTimes(2);
      expect(result.current.plan).toEqual(mockPlan);
      expect(result.current.error).toBeNull();
    });
  });
});
