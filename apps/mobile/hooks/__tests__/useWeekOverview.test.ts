import { renderHook, waitFor } from '@testing-library/react-native';
import { useWeekOverview } from '../useWeekOverview';

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

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getActiveTrainingPlan: (...args: unknown[]) => mockGetActiveTrainingPlan(...args),
  pauseTrainingPlan: jest.fn(),
  cancelTrainingPlan: jest.fn(),
}));

// Mock formatDateLocal to return a consistent date
jest.mock('@khepri/core', () => {
  const actual = jest.requireActual('@khepri/core');
  return {
    ...actual,
    formatDateLocal: () => '2026-03-15',
  };
});

const mockAthleteId = 'athlete-123';

const mockPlan = {
  id: 'plan-1',
  athlete_id: mockAthleteId,
  goal_id: null,
  name: '12-Week Base Build',
  description: null,
  start_date: '2026-03-01',
  end_date: '2026-05-24',
  total_weeks: 12,
  status: 'active',
  periodization: {
    total_weeks: 12,
    phases: [
      { phase: 'base', weeks: 6, focus: 'aerobic_endurance', intensity_distribution: [80, 15, 5] },
      { phase: 'build', weeks: 4, focus: 'threshold_work', intensity_distribution: [70, 20, 10] },
      { phase: 'taper', weeks: 2, focus: 'recovery', intensity_distribution: [90, 5, 5] },
    ],
    weekly_volumes: [],
  },
  weekly_template: {
    monday: { type: 'rest' },
    tuesday: { type: 'workout', category: 'Run' },
    wednesday: { type: 'workout', category: 'Swim' },
    thursday: { type: 'workout', category: 'Bike' },
    friday: { type: 'rest' },
    saturday: { type: 'workout', category: 'Run' },
    sunday: { type: 'workout', category: 'Bike' },
  },
  adaptations: [],
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

describe('useWeekOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'auth-user-123' };
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: { id: mockAthleteId },
      error: null,
    });
  });

  it('returns week info when plan is active', async () => {
    mockGetActiveTrainingPlan.mockResolvedValue({ data: mockPlan, error: null });

    const { result } = renderHook(() => useWeekOverview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.info).not.toBeNull();
    expect(result.current.info?.currentWeek).toBe(3);
    expect(result.current.info?.phaseName).toBe('Base');
    expect(result.current.info?.dailySlots).toHaveLength(7);
    expect(result.current.error).toBeNull();
  });

  it('returns null info when no active plan', async () => {
    mockGetActiveTrainingPlan.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useWeekOverview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.info).toBeNull();
  });

  it('returns error on fetch failure', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const { result } = renderHook(() => useWeekOverview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.info).toBeNull();
  });

  it('returns null info when no user is logged in', async () => {
    mockUser = null;

    const { result } = renderHook(() => useWeekOverview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.info).toBeNull();
  });
});
