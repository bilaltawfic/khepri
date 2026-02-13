import { renderHook, waitFor } from '@testing-library/react-native';

import { useDashboard } from '../useDashboard';

// Mock supabase-client functions
const mockGetAthleteByAuthUser = jest.fn();
const mockGetActiveGoals = jest.fn();
const mockGetTodayCheckin = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getActiveGoals: (...args: unknown[]) => mockGetActiveGoals(...args),
  getTodayCheckin: (...args: unknown[]) => mockGetTodayCheckin(...args),
}));

// Mock supabase client
let mockSupabase: object | undefined = {};

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

// Mock auth context
const mockUser = { id: 'auth-user-123', email: 'test@example.com' };
let mockAuthUser: typeof mockUser | null = mockUser;

jest.mock('@/contexts', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isLoading: false,
  }),
}));

const mockAthlete = {
  id: 'athlete-123',
  auth_user_id: 'auth-user-123',
  display_name: 'John Doe',
  ftp_watts: 250,
  weight_kg: 70,
  resting_heart_rate: 50,
  max_heart_rate: 185,
  preferred_units: 'metric',
  timezone: 'UTC',
  date_of_birth: '1990-01-15',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockGoals = [
  {
    id: 'goal-1',
    athlete_id: 'athlete-123',
    title: 'Complete Ironman',
    goal_type: 'race',
    status: 'active',
    target_date: '2026-09-15',
    priority: 'A',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'goal-2',
    athlete_id: 'athlete-123',
    title: 'Improve FTP',
    goal_type: 'performance',
    status: 'active',
    target_date: '2026-06-01',
    priority: 'B',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockCheckin = {
  id: 'checkin-1',
  athlete_id: 'athlete-123',
  checkin_date: '2026-02-13',
  ai_recommendation: {
    workoutSuggestion: 'Easy recovery ride',
    intensityLevel: 'easy',
    duration: 45,
    summary: 'Take it easy today',
  },
};

describe('useDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {};
    mockAuthUser = mockUser;
    mockGetAthleteByAuthUser.mockResolvedValue({ data: mockAthlete, error: null });
    mockGetActiveGoals.mockResolvedValue({ data: mockGoals, error: null });
    mockGetTodayCheckin.mockResolvedValue({ data: mockCheckin, error: null });
  });

  describe('initial load', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useDashboard());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('fetches and returns dashboard data', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).not.toBeNull();
      expect(result.current.error).toBeNull();
      expect(mockGetAthleteByAuthUser).toHaveBeenCalledWith(mockSupabase, 'auth-user-123');
      expect(mockGetActiveGoals).toHaveBeenCalledWith(mockSupabase, 'athlete-123');
      expect(mockGetTodayCheckin).toHaveBeenCalledWith(mockSupabase, 'athlete-123');
    });
  });

  describe('greeting', () => {
    it('includes athlete first name in greeting', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.greeting).toMatch(/John/);
    });

    it('returns greeting without name when display_name is null', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: { ...mockAthlete, display_name: null },
        error: null,
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.athleteName).toBeNull();
      expect(result.current.data?.greeting).toMatch(/^Good (morning|afternoon|evening)!$/);
    });
  });

  describe('fitness metrics', () => {
    it('returns ftp and weight from athlete profile', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.fitnessMetrics.ftp).toBe(250);
      expect(result.current.data?.fitnessMetrics.weight).toBe(70);
    });

    it('returns null for CTL/ATL/TSB (Phase 3)', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.fitnessMetrics.ctl).toBeNull();
      expect(result.current.data?.fitnessMetrics.atl).toBeNull();
      expect(result.current.data?.fitnessMetrics.tsb).toBeNull();
    });

    it('returns null ftp when not set', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: { ...mockAthlete, ftp_watts: null, weight_kg: null },
        error: null,
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.fitnessMetrics.ftp).toBeNull();
      expect(result.current.data?.fitnessMetrics.weight).toBeNull();
    });
  });

  describe('check-in and recommendation', () => {
    it('parses AI recommendation correctly', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.hasCompletedCheckinToday).toBe(true);
      expect(result.current.data?.todayRecommendation).toEqual({
        workoutSuggestion: 'Easy recovery ride',
        intensityLevel: 'easy',
        duration: 45,
        summary: 'Take it easy today',
      });
    });

    it('handles missing check-in gracefully', async () => {
      mockGetTodayCheckin.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.hasCompletedCheckinToday).toBe(false);
      expect(result.current.data?.todayRecommendation).toBeNull();
    });

    it('handles check-in without AI recommendation', async () => {
      mockGetTodayCheckin.mockResolvedValue({
        data: { ...mockCheckin, ai_recommendation: null },
        error: null,
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.hasCompletedCheckinToday).toBe(true);
      expect(result.current.data?.todayRecommendation).toBeNull();
    });

    it('accepts recovery intensity level', async () => {
      mockGetTodayCheckin.mockResolvedValue({
        data: {
          ...mockCheckin,
          ai_recommendation: {
            workoutSuggestion: 'Light swim',
            intensityLevel: 'recovery',
            duration: 30,
            summary: 'Recovery session',
          },
        },
        error: null,
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.todayRecommendation?.intensityLevel).toBe('recovery');
    });

    it('accepts threshold intensity level', async () => {
      mockGetTodayCheckin.mockResolvedValue({
        data: {
          ...mockCheckin,
          ai_recommendation: {
            workoutSuggestion: 'Tempo ride',
            intensityLevel: 'threshold',
            duration: 60,
            summary: 'Push it',
          },
        },
        error: null,
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.todayRecommendation?.intensityLevel).toBe('threshold');
    });

    it('defaults invalid intensity to moderate', async () => {
      mockGetTodayCheckin.mockResolvedValue({
        data: {
          ...mockCheckin,
          ai_recommendation: {
            workoutSuggestion: 'Ride',
            intensityLevel: 'invalid_value',
            duration: 60,
            summary: 'Go ride',
          },
        },
        error: null,
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.todayRecommendation?.intensityLevel).toBe('moderate');
    });

    it('defaults missing duration to 60', async () => {
      mockGetTodayCheckin.mockResolvedValue({
        data: {
          ...mockCheckin,
          ai_recommendation: {
            workoutSuggestion: 'Ride',
            intensityLevel: 'easy',
            summary: 'Go ride',
          },
        },
        error: null,
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.todayRecommendation?.duration).toBe(60);
    });

    it('returns null recommendation for invalid JSON shape', async () => {
      mockGetTodayCheckin.mockResolvedValue({
        data: {
          ...mockCheckin,
          ai_recommendation: { someOtherField: 'value' },
        },
        error: null,
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.todayRecommendation).toBeNull();
    });
  });

  describe('upcoming events', () => {
    it('converts active goals with target dates to events', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.upcomingEvents).toHaveLength(2);
      // Sorted by date (Improve FTP 2026-06-01 comes before Ironman 2026-09-15)
      expect(result.current.data?.upcomingEvents[0]?.title).toBe('Improve FTP');
      expect(result.current.data?.upcomingEvents[1]?.title).toBe('Complete Ironman');
    });

    it('filters out goals without target dates', async () => {
      mockGetActiveGoals.mockResolvedValue({
        data: [{ ...mockGoals[0] }, { ...mockGoals[1], target_date: null }],
        error: null,
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.upcomingEvents).toHaveLength(1);
      expect(result.current.data?.upcomingEvents[0]?.title).toBe('Complete Ironman');
    });

    it('returns empty array when no goals exist', async () => {
      mockGetActiveGoals.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.upcomingEvents).toEqual([]);
    });

    it('limits events to 5', async () => {
      const manyGoals = Array.from({ length: 8 }, (_, i) => ({
        ...mockGoals[0],
        id: `goal-${i}`,
        title: `Goal ${i}`,
        target_date: `2026-0${i + 1}-15`,
      }));
      mockGetActiveGoals.mockResolvedValue({ data: manyGoals, error: null });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.upcomingEvents).toHaveLength(5);
    });
  });

  describe('error handling', () => {
    it('handles athlete fetch error', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Database error');
      expect(result.current.data).toBeNull();
    });

    it('handles missing athlete profile', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('No athlete profile found');
      expect(result.current.data).toBeNull();
    });

    it('handles unexpected exceptions', async () => {
      mockGetAthleteByAuthUser.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.data).toBeNull();
    });

    it('handles non-Error exceptions', async () => {
      mockGetAthleteByAuthUser.mockRejectedValue('unknown failure');

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load dashboard');
      expect(result.current.data).toBeNull();
    });

    it('returns data with warning when goals fetch fails', async () => {
      mockGetActiveGoals.mockResolvedValue({
        data: null,
        error: { message: 'Goals error' },
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).not.toBeNull();
      expect(result.current.data?.upcomingEvents).toEqual([]);
      expect(result.current.data?.warnings).toContain('Unable to load goals');
    });

    it('returns data with warning when checkin fetch fails', async () => {
      mockGetTodayCheckin.mockResolvedValue({
        data: null,
        error: { message: 'Checkin error' },
      });

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).not.toBeNull();
      expect(result.current.data?.hasCompletedCheckinToday).toBe(false);
      expect(result.current.data?.warnings).toContain('Unable to load check-in');
    });

    it('returns empty warnings on successful fetch', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.warnings).toEqual([]);
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockAuthUser = null;
    });

    it('stops loading without fetching', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('when supabase is not configured', () => {
    beforeEach(() => {
      mockSupabase = undefined;
    });

    it('stops loading without fetching', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
      expect(result.current.data).toBeNull();
    });
  });

  describe('refresh', () => {
    it('re-fetches all dashboard data', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAthleteByAuthUser).toHaveBeenCalledTimes(1);

      await result.current.refresh();

      expect(mockGetAthleteByAuthUser).toHaveBeenCalledTimes(2);
      expect(mockGetActiveGoals).toHaveBeenCalledTimes(2);
      expect(mockGetTodayCheckin).toHaveBeenCalledTimes(2);
    });
  });
});
