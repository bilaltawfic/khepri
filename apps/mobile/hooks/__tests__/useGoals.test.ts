import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useGoals } from '../useGoals';

// Mock useAuth
const mockUser = { id: 'auth-user-123' };
jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

// Mock supabase-client queries
const mockGetAthleteByAuthUser = jest.fn();
const mockGetActiveGoals = jest.fn();
const mockGetGoalById = jest.fn();
const mockCreateGoal = jest.fn();
const mockUpdateGoal = jest.fn();
const mockDeleteGoal = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getActiveGoals: (...args: unknown[]) => mockGetActiveGoals(...args),
  getGoalById: (...args: unknown[]) => mockGetGoalById(...args),
  createGoal: (...args: unknown[]) => mockCreateGoal(...args),
  updateGoal: (...args: unknown[]) => mockUpdateGoal(...args),
  deleteGoal: (...args: unknown[]) => mockDeleteGoal(...args),
}));

describe('useGoals', () => {
  const mockAthleteId = 'athlete-123';
  const mockGoals = [
    {
      id: 'goal-1',
      athlete_id: mockAthleteId,
      title: 'Complete Ironman',
      goal_type: 'race',
      priority: 'A',
      status: 'active',
      target_date: '2026-09-15',
      race_event_name: 'Ironman Florida',
      race_distance: '140.6',
      race_location: 'Panama City Beach, FL',
      race_target_time_seconds: 39600,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      description: null,
      fitness_metric: null,
      fitness_target_value: null,
      health_current_value: null,
      health_metric: null,
      health_target_value: null,
      perf_current_value: null,
      perf_metric: null,
      perf_target_value: null,
    },
    {
      id: 'goal-2',
      athlete_id: mockAthleteId,
      title: 'Improve FTP',
      goal_type: 'performance',
      priority: 'B',
      status: 'active',
      target_date: '2026-06-01',
      perf_metric: 'ftp',
      perf_current_value: 280,
      perf_target_value: 320,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      description: null,
      fitness_metric: null,
      fitness_target_value: null,
      health_current_value: null,
      health_metric: null,
      health_target_value: null,
      race_distance: null,
      race_event_name: null,
      race_location: null,
      race_target_time_seconds: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: successful athlete fetch via getAthleteByAuthUser
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: { id: mockAthleteId },
      error: null,
    });

    // Default: successful active goals fetch
    mockGetActiveGoals.mockResolvedValue({
      data: mockGoals,
      error: null,
    });

    // Default: successful create
    mockCreateGoal.mockResolvedValue({
      data: {
        id: 'goal-new',
        athlete_id: mockAthleteId,
        title: 'New Goal',
        goal_type: 'fitness',
        priority: 'C',
        status: 'active',
        created_at: '2026-02-10T00:00:00Z',
        updated_at: '2026-02-10T00:00:00Z',
      },
      error: null,
    });

    // Default: successful update
    mockUpdateGoal.mockResolvedValue({
      data: { ...mockGoals[0], title: 'Updated Goal' },
      error: null,
    });

    // Default: successful delete
    mockDeleteGoal.mockResolvedValue({
      data: null,
      error: null,
    });

    // Default: successful get by ID
    mockGetGoalById.mockResolvedValue({
      data: mockGoals[0],
      error: null,
    });
  });

  describe('initial loading', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() => useGoals());

      expect(result.current.isLoading).toBe(true);
    });

    it('loads athlete id from auth user', async () => {
      renderHook(() => useGoals());

      await waitFor(() => {
        expect(mockGetAthleteByAuthUser).toHaveBeenCalledWith(expect.anything(), 'auth-user-123');
      });
    });

    it('fetches goals after getting athlete id', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetActiveGoals).toHaveBeenCalled();
    });

    it('loads goals correctly', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.goals).toHaveLength(2);
      });

      expect(result.current.goals[0].title).toBe('Complete Ironman');
      expect(result.current.goals[1].title).toBe('Improve FTP');
    });
  });

  describe('error handling', () => {
    it('sets error when athlete fetch fails', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: { message: 'Athlete not found' },
      });

      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.error).toBe('Athlete not found');
      });
    });

    it('sets error when no athlete row exists for user', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.error).toBe('No athlete profile found for this user');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets error when goals fetch fails', async () => {
      mockGetActiveGoals.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch goals' },
      });

      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch goals');
      });
    });

    it('handles exception during athlete fetch', async () => {
      mockGetAthleteByAuthUser.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });

    it('handles exception during goals fetch', async () => {
      mockGetActiveGoals.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });
  });

  describe('createGoal', () => {
    it('creates a goal successfully', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        createResult = await result.current.createGoal({
          title: 'New Goal',
          goal_type: 'fitness',
          priority: 'C',
        });
      });

      expect(createResult?.success).toBe(true);
      expect(mockCreateGoal).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'New Goal',
          goal_type: 'fitness',
          priority: 'C',
          athlete_id: mockAthleteId,
        })
      );
    });

    it('adds new goal to state after creation', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.goals.length;

      await act(async () => {
        await result.current.createGoal({
          title: 'New Goal',
          goal_type: 'fitness',
        });
      });

      expect(result.current.goals.length).toBe(initialCount + 1);
    });

    it('returns error when creation fails', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockCreateGoal.mockResolvedValue({
        data: null,
        error: { message: 'Failed to create goal' },
      });

      let createResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        createResult = await result.current.createGoal({
          title: 'New Goal',
          goal_type: 'fitness',
        });
      });

      expect(createResult?.success).toBe(false);
      expect(createResult?.error).toBe('Failed to create goal');
    });

    it('handles exception during creation', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockCreateGoal.mockRejectedValue(new Error('Network error'));

      let createResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        createResult = await result.current.createGoal({
          title: 'New Goal',
          goal_type: 'fitness',
        });
      });

      expect(createResult?.success).toBe(false);
      expect(createResult?.error).toBe('Network error');
    });
  });

  describe('updateGoal', () => {
    it('updates a goal successfully', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        updateResult = await result.current.updateGoal('goal-1', {
          title: 'Updated Goal',
        });
      });

      expect(updateResult?.success).toBe(true);
      expect(mockUpdateGoal).toHaveBeenCalledWith(expect.anything(), 'goal-1', {
        title: 'Updated Goal',
      });
    });

    it('updates goal in state after update', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateGoal('goal-1', {
          title: 'Updated Goal',
        });
      });

      const updatedGoal = result.current.goals.find((g) => g.id === 'goal-1');
      expect(updatedGoal?.title).toBe('Updated Goal');
    });

    it('returns error when update fails', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockUpdateGoal.mockResolvedValue({
        data: null,
        error: { message: 'Failed to update goal' },
      });

      let updateResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        updateResult = await result.current.updateGoal('goal-1', {
          title: 'Updated Goal',
        });
      });

      expect(updateResult?.success).toBe(false);
      expect(updateResult?.error).toBe('Failed to update goal');
    });

    it('handles exception during update', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockUpdateGoal.mockRejectedValue(new Error('Network error'));

      let updateResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        updateResult = await result.current.updateGoal('goal-1', {
          title: 'Updated Goal',
        });
      });

      expect(updateResult?.success).toBe(false);
      expect(updateResult?.error).toBe('Network error');
    });
  });

  describe('deleteGoal', () => {
    it('deletes a goal successfully', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        deleteResult = await result.current.deleteGoal('goal-1');
      });

      expect(deleteResult?.success).toBe(true);
      expect(mockDeleteGoal).toHaveBeenCalledWith(expect.anything(), 'goal-1');
    });

    it('removes goal from state after deletion', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.goals.length;

      await act(async () => {
        await result.current.deleteGoal('goal-1');
      });

      expect(result.current.goals.length).toBe(initialCount - 1);
      expect(result.current.goals.find((g) => g.id === 'goal-1')).toBeUndefined();
    });

    it('returns error when deletion fails', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockDeleteGoal.mockResolvedValue({
        data: null,
        error: { message: 'Failed to delete goal' },
      });

      let deleteResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        deleteResult = await result.current.deleteGoal('goal-1');
      });

      expect(deleteResult?.success).toBe(false);
      expect(deleteResult?.error).toBe('Failed to delete goal');
    });

    it('handles exception during deletion', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockDeleteGoal.mockRejectedValue(new Error('Network error'));

      let deleteResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        deleteResult = await result.current.deleteGoal('goal-1');
      });

      expect(deleteResult?.success).toBe(false);
      expect(deleteResult?.error).toBe('Network error');
    });
  });

  describe('getGoal', () => {
    it('fetches a goal by ID', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let goal: unknown;
      await act(async () => {
        goal = await result.current.getGoal('goal-1');
      });

      expect(goal).toEqual(mockGoals[0]);
      expect(mockGetGoalById).toHaveBeenCalledWith(expect.anything(), 'goal-1');
    });

    it('returns null when goal not found', async () => {
      mockGetGoalById.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let goal: unknown;
      await act(async () => {
        goal = await result.current.getGoal('nonexistent');
      });

      expect(goal).toBeNull();
    });

    it('returns null on exception', async () => {
      mockGetGoalById.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let goal: unknown;
      await act(async () => {
        goal = await result.current.getGoal('goal-1');
      });

      expect(goal).toBeNull();
    });
  });

  describe('refetch', () => {
    it('refetches goals', async () => {
      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear and track calls
      mockGetActiveGoals.mockClear();

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetActiveGoals).toHaveBeenCalled();
    });
  });
});
