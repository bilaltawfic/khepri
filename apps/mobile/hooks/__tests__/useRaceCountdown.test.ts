import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useRaceCountdown } from '../useRaceCountdown';

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
const mockGetUpcomingRaceGoals = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getUpcomingRaceGoals: (...args: unknown[]) => mockGetUpcomingRaceGoals(...args),
}));

// Mock intervals service
const mockGetWellnessData = jest.fn();

jest.mock('@/services/intervals', () => ({
  getWellnessData: (...args: unknown[]) => mockGetWellnessData(...args),
}));

const mockAthleteId = 'athlete-456';

const mockGoals = [
  {
    id: 'goal-1',
    athlete_id: mockAthleteId,
    title: 'Spring Marathon',
    goal_type: 'race',
    status: 'active',
    target_date: '2026-04-15',
    race_event_name: 'City Marathon 2026',
    race_location: 'London',
    race_distance: '42.2 km',
    race_target_time_seconds: 12600,
    priority: 'A',
    description: null,
    fitness_metric: null,
    fitness_target_value: null,
    health_current_value: null,
    health_metric: null,
    health_target_value: null,
    perf_current_value: null,
    perf_metric: null,
    perf_target_value: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'goal-2',
    athlete_id: mockAthleteId,
    title: 'Sprint Tri',
    goal_type: 'race',
    status: 'active',
    target_date: '2026-06-01',
    race_event_name: 'Local Sprint Triathlon',
    race_location: null,
    race_distance: 'Sprint',
    race_target_time_seconds: null,
    priority: 'B',
    description: null,
    fitness_metric: null,
    fitness_target_value: null,
    health_current_value: null,
    health_metric: null,
    health_target_value: null,
    perf_current_value: null,
    perf_metric: null,
    perf_target_value: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

function makeFitnessData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    date: `2026-02-${String(i + 1).padStart(2, '0')}`,
    ctl: 50 + i,
    atl: 45 + i,
    tsb: 5 - i * 0.5,
    rampRate: 1,
  }));
}

describe('useRaceCountdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'auth-user-123' };

    mockGetAthleteByAuthUser.mockResolvedValue({
      data: { id: mockAthleteId },
      error: null,
    });

    mockGetUpcomingRaceGoals.mockResolvedValue({
      data: mockGoals,
      error: null,
    });

    mockGetWellnessData.mockResolvedValue(makeFitnessData(14));
  });

  describe('loading', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() => useRaceCountdown());
      expect(result.current.isLoading).toBe(true);
    });

    it('clears loading after fetch completes', async () => {
      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('successful fetch', () => {
    it('returns race goals with readiness data', async () => {
      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.races).toHaveLength(2);
      expect(result.current.races[0]?.goal.id).toBe('goal-1');
      expect(result.current.races[1]?.goal.id).toBe('goal-2');
      expect(result.current.error).toBeNull();
    });

    it('computes readiness when sufficient fitness data exists', async () => {
      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const first = result.current.races[0];
      expect(first?.readiness).not.toBeNull();
      expect(first?.readiness?.daysUntilRace).toBeGreaterThan(0);
      expect(first?.readiness?.currentForm).toBeDefined();
      expect(first?.readiness?.recommendation).toBeDefined();
    });
  });

  describe('empty state', () => {
    it('returns empty array when no upcoming races', async () => {
      mockGetUpcomingRaceGoals.mockResolvedValue({
        data: [],
        error: null,
      });

      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.races).toHaveLength(0);
      expect(result.current.error).toBeNull();
    });

    it('returns empty array when no user', async () => {
      mockUser = null;

      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.races).toHaveLength(0);
      expect(result.current.error).toBeNull();
      expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
    });
  });

  describe('wellness data unavailable', () => {
    it('sets readiness to null when wellness fetch fails', async () => {
      mockGetWellnessData.mockRejectedValue(new Error('Not connected'));

      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.races).toHaveLength(2);
      expect(result.current.races[0]?.readiness).toBeNull();
      expect(result.current.races[1]?.readiness).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('sets readiness to null when insufficient fitness data', async () => {
      mockGetWellnessData.mockResolvedValue(makeFitnessData(3));

      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.races[0]?.readiness).toBeNull();
    });
  });

  describe('error handling', () => {
    it('sets error when athlete fetch fails', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: { message: 'Athlete not found' },
      });

      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.error).toBe('Athlete not found');
      });

      expect(result.current.races).toHaveLength(0);
    });

    it('sets error when no athlete profile exists', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.error).toBe('No athlete profile found for this user');
      });
    });

    it('sets error when goals fetch fails', async () => {
      mockGetUpcomingRaceGoals.mockResolvedValue({
        data: null,
        error: { message: 'Failed to load goals' },
      });

      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load goals');
      });
    });

    it('handles unexpected exception', async () => {
      mockGetAthleteByAuthUser.mockRejectedValue('unexpected');

      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load race data');
      });
    });
  });

  describe('refresh', () => {
    it('re-fetches data on refresh', async () => {
      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetUpcomingRaceGoals.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetUpcomingRaceGoals).toHaveBeenCalled();
    });

    it('updates races after refresh', async () => {
      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.races).toHaveLength(2);
      });

      mockGetUpcomingRaceGoals.mockResolvedValue({
        data: [mockGoals[0]],
        error: null,
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.races).toHaveLength(1);
    });

    it('sets error on refresh failure', async () => {
      const { result } = renderHook(() => useRaceCountdown());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetAthleteByAuthUser.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.races).toHaveLength(0);
    });
  });
});
