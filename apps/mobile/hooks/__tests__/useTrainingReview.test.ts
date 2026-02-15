import { renderHook, waitFor } from '@testing-library/react-native';

import { useTrainingReview } from '../useTrainingReview';

// Mock useAuth
const mockUser = { id: 'auth-user-123' };
jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock MCP gateway
const mockGetAuthHeaders = jest.fn().mockResolvedValue({
  Authorization: 'Bearer test-token',
  'Content-Type': 'application/json',
});
const mockGetMCPGatewayUrl = jest
  .fn()
  .mockReturnValue('https://test.supabase.co/functions/v1/mcp-gateway');

jest.mock('@/services/mcp-gateway', () => ({
  getAuthHeaders: (...args: unknown[]) => mockGetAuthHeaders(...args),
  getMCPGatewayUrl: (...args: unknown[]) => mockGetMCPGatewayUrl(...args),
}));

// Mock intervals service
const mockGetRecentActivities = jest.fn();
jest.mock('@/services/intervals', () => ({
  getRecentActivities: (...args: unknown[]) => mockGetRecentActivities(...args),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock core analysis functions
const mockGetFormStatus = jest.fn();
const mockCalculateFormTrend = jest.fn();
const mockCalculateWeeklyLoads = jest.fn();
const mockAssessRecovery = jest.fn();

jest.mock('@khepri/core', () => ({
  getFormStatus: (...args: unknown[]) => mockGetFormStatus(...args),
  calculateFormTrend: (...args: unknown[]) => mockCalculateFormTrend(...args),
  calculateWeeklyLoads: (...args: unknown[]) => mockCalculateWeeklyLoads(...args),
  assessRecovery: (...args: unknown[]) => mockAssessRecovery(...args),
  formatDateLocal: (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },
}));

const mockWellnessData = [
  { date: '2026-01-10', ctl: 50, atl: 55, tsb: -5, rampRate: 2 },
  { date: '2026-01-11', ctl: 51, atl: 54, tsb: -3, rampRate: 2 },
  { date: '2026-01-12', ctl: 52, atl: 53, tsb: -1, rampRate: 2 },
  { date: '2026-01-13', ctl: 52, atl: 50, tsb: 2, rampRate: 1 },
  { date: '2026-01-14', ctl: 53, atl: 48, tsb: 5, rampRate: 1 },
  { date: '2026-01-15', ctl: 53, atl: 46, tsb: 7, rampRate: 1 },
  { date: '2026-01-16', ctl: 54, atl: 44, tsb: 10, rampRate: 1 },
];

const mockActivities = [
  {
    id: 'a1',
    name: 'Ride',
    type: 'Ride',
    start_date: '2026-01-10T08:00:00Z',
    duration: 3600,
    tss: 80,
  },
  {
    id: 'a2',
    name: 'Run',
    type: 'Run',
    start_date: '2026-01-12T07:00:00Z',
    duration: 1800,
    tss: 50,
  },
  {
    id: 'a3',
    name: 'Ride',
    type: 'Ride',
    start_date: '2026-01-14T09:00:00Z',
    duration: 5400,
    tss: undefined,
  },
];

function setupSuccessfulFetch() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        data: {
          wellness: mockWellnessData,
          date_range: { oldest: '2026-01-10', newest: '2026-01-16' },
        },
      }),
  });
}

describe('useTrainingReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setupSuccessfulFetch();
    mockGetRecentActivities.mockResolvedValue(mockActivities);

    mockGetFormStatus.mockReturnValue('fresh');
    mockCalculateFormTrend.mockReturnValue({
      direction: 'improving',
      tsbChange: 15,
      ctlChange: 4,
      atlChange: -11,
      currentTsb: 10,
      averageTsb: 2.1,
    });
    mockCalculateWeeklyLoads.mockReturnValue([
      {
        weekStart: '2026-01-06',
        totalTss: 130,
        activityCount: 2,
        averageTssPerActivity: 65,
        totalDuration: 90,
      },
      {
        weekStart: '2026-01-13',
        totalTss: 50,
        activityCount: 1,
        averageTssPerActivity: 50,
        totalDuration: 90,
      },
    ]);
    mockAssessRecovery.mockReturnValue({
      fatigueLevel: 'moderate',
      suggestedRecoveryDays: 1,
      rampRate: 4,
      isOverreaching: false,
    });
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useTrainingReview());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches and computes training review data on mount', async () => {
    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.error).toBeNull();

    const data = result.current.data;
    if (!data) throw new Error('Expected data to be defined');
    expect(data.formStatus).toBe('fresh');
    expect(data.latestCTL).toBe(54);
    expect(data.latestATL).toBe(44);
    expect(data.latestTSB).toBe(10);
  });

  it('calls getFormStatus with latest TSB', async () => {
    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetFormStatus).toHaveBeenCalledWith(10);
  });

  it('calls calculateFormTrend with last 7 data points', async () => {
    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const trendArg = mockCalculateFormTrend.mock.calls[0]?.[0];
    expect(trendArg).toBeDefined();
    expect(trendArg).toHaveLength(7);
  });

  it('converts activity duration from seconds to minutes', async () => {
    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const weeklyLoadsArg = mockCalculateWeeklyLoads.mock.calls[0]?.[0];
    if (!weeklyLoadsArg) throw new Error('calculateWeeklyLoads not called');

    // 3600 seconds = 60 minutes
    expect(weeklyLoadsArg[0]).toEqual(expect.objectContaining({ duration: 60 }));
    // 1800 seconds = 30 minutes
    expect(weeklyLoadsArg[1]).toEqual(expect.objectContaining({ duration: 30 }));
    // 5400 seconds = 90 minutes
    expect(weeklyLoadsArg[2]).toEqual(expect.objectContaining({ duration: 90 }));
  });

  it('defaults TSS to 0 when activity has undefined tss', async () => {
    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const weeklyLoadsArg = mockCalculateWeeklyLoads.mock.calls[0]?.[0];
    if (!weeklyLoadsArg) throw new Error('calculateWeeklyLoads not called');

    // Third activity has tss: undefined → should default to 0
    expect(weeklyLoadsArg[2]).toEqual(expect.objectContaining({ tss: 0 }));
  });

  it('extracts date from start_date ISO string', async () => {
    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const weeklyLoadsArg = mockCalculateWeeklyLoads.mock.calls[0]?.[0];
    if (!weeklyLoadsArg) throw new Error('calculateWeeklyLoads not called');

    expect(weeklyLoadsArg[0]).toEqual(expect.objectContaining({ date: '2026-01-10' }));
  });

  it('returns null data when wellness API returns empty data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            wellness: [],
            date_range: { oldest: '', newest: '' },
          },
        }),
    });

    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns null data when wellness API returns unsuccessful response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: false,
          data: null,
        }),
    });

    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });

  it('sets error when fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch wellness data');
    expect(result.current.data).toBeNull();
  });

  it('sets error when activities fetch throws', async () => {
    mockGetRecentActivities.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('sets generic error for non-Error exceptions', async () => {
    mockGetRecentActivities.mockRejectedValue('string error');

    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load training data');
  });

  it('includes form trend in data', async () => {
    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.formTrend).toEqual({
      direction: 'improving',
      tsbChange: 15,
      ctlChange: 4,
      atlChange: -11,
      currentTsb: 10,
      averageTsb: 2.1,
    });
  });

  it('includes weekly loads in data', async () => {
    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.weeklyLoads).toHaveLength(2);
  });

  it('includes recovery assessment in data', async () => {
    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.recovery).toEqual({
      fatigueLevel: 'moderate',
      suggestedRecoveryDays: 1,
      rampRate: 4,
      isOverreaching: false,
    });
  });

  it('includes fitness data points for trend display', async () => {
    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.fitnessData).toHaveLength(7);
    expect(result.current.data?.fitnessData[0]).toEqual({
      date: '2026-01-10',
      ctl: 50,
      atl: 55,
      tsb: -5,
    });
  });

  it('does not fetch when user is not authenticated', async () => {
    // Override the mock to return no user
    jest.resetModules();

    // We need to test the no-user case by temporarily changing the mock
    const originalUser = mockUser.id;
    (mockUser as { id: string | null }).id = null;

    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();

    // Restore
    (mockUser as { id: string | null }).id = originalUser;
  });

  it('calls getRecentActivities with 42 days lookback', async () => {
    const { result } = renderHook(() => useTrainingReview());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetRecentActivities).toHaveBeenCalledWith(42);
  });
});
