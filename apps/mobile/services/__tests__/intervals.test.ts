import { formatDateLocal } from '@khepri/core';

import { getRecentActivities, getTodayWellness } from '../intervals';

const mockGetSession = jest.fn();

let mockSupabase: object | undefined;

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

const originalFetch = global.fetch;
const mockFetch = jest.fn();
global.fetch = mockFetch;

const TEST_SUPABASE_URL = 'https://test.supabase.co';

function createMockSupabase() {
  return {
    auth: {
      getSession: mockGetSession,
    },
  };
}

describe('intervals service', () => {
  let originalUrl: string | undefined;
  // Compute fixedDate after setting system time so it uses the same local logic
  let fixedDate: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_URL = TEST_SUPABASE_URL;
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token-123' } },
    });
    // Fix the date for deterministic tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-13T12:00:00Z'));
    fixedDate = formatDateLocal(new Date());
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('getRecentActivities', () => {
    const mockActivities = [
      {
        id: 'act-1',
        name: 'Morning Ride',
        type: 'Ride',
        start_date: '2026-02-13T07:00:00Z',
        duration: 3600,
        distance: 35000,
        tss: 55,
      },
      {
        id: 'act-2',
        name: 'Tempo Run',
        type: 'Run',
        start_date: '2026-02-12T06:30:00Z',
        duration: 2700,
        tss: 48,
      },
    ];

    it('returns activities on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { activities: mockActivities, total: 2, source: 'mock' },
          }),
      });

      const result = await getRecentActivities();

      expect(result).toEqual(mockActivities);
    });

    it('sends correct tool request with oldest date', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { activities: [], total: 0, source: 'mock' },
          }),
      });

      await getRecentActivities(7);

      const expectedOldest = formatDateLocal(
        new Date(new Date('2026-02-13T12:00:00Z').getTime() - 7 * 24 * 60 * 60 * 1000)
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_SUPABASE_URL}/functions/v1/mcp-gateway`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'execute_tool',
            tool_name: 'get_activities',
            tool_input: { oldest: expectedOldest },
          }),
        })
      );
    });

    it('returns empty array when response is not successful', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'No credentials configured',
          }),
      });

      const result = await getRecentActivities();

      expect(result).toEqual([]);
    });

    it('returns empty array when response has no data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: undefined,
          }),
      });

      const result = await getRecentActivities();

      expect(result).toEqual([]);
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(getRecentActivities()).rejects.toThrow('Failed to fetch activities');
    });

    it('throws when not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(getRecentActivities()).rejects.toThrow('Not authenticated');
    });

    it('uses custom daysBack parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { activities: [], total: 0, source: 'mock' },
          }),
      });

      await getRecentActivities(14);

      const expectedOldest = formatDateLocal(
        new Date(new Date('2026-02-13T12:00:00Z').getTime() - 14 * 24 * 60 * 60 * 1000)
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            action: 'execute_tool',
            tool_name: 'get_activities',
            tool_input: { oldest: expectedOldest },
          }),
        })
      );
    });
  });

  describe('getTodayWellness', () => {
    it('returns wellness data for today', async () => {
      const wellnessPoint = {
        date: fixedDate,
        ctl: 70,
        atl: 65,
        tsb: 5,
        rampRate: 2,
        sleepQuality: 4,
        sleepHours: 7.5,
        fatigue: 2,
        stress: 3,
        soreness: 2,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              wellness: [wellnessPoint],
              summary: null,
              date_range: { oldest: fixedDate, newest: fixedDate },
            },
          }),
      });

      const result = await getTodayWellness();

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_SUPABASE_URL}/functions/v1/mcp-gateway`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'execute_tool',
            tool_name: 'get_wellness_data',
            tool_input: {
              oldest: fixedDate,
              newest: fixedDate,
            },
          }),
        })
      );
      expect(result).toEqual(wellnessPoint);
    });

    it('returns null when no wellness data for today', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              wellness: [],
              summary: null,
              date_range: { oldest: fixedDate, newest: fixedDate },
            },
          }),
      });

      const result = await getTodayWellness();

      expect(result).toBeNull();
    });

    it('returns null when response is not successful', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'No credentials configured',
          }),
      });

      const result = await getTodayWellness();

      expect(result).toBeNull();
    });

    it('returns null when response has no data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: undefined,
          }),
      });

      const result = await getTodayWellness();

      expect(result).toBeNull();
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(getTodayWellness()).rejects.toThrow('Failed to fetch wellness data');
    });

    it('throws when not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(getTodayWellness()).rejects.toThrow('Not authenticated');
    });

    it('throws when Supabase is not configured', async () => {
      mockSupabase = undefined;

      await expect(getTodayWellness()).rejects.toThrow('Supabase is not configured');
    });

    it('throws when EXPO_PUBLIC_SUPABASE_URL is not set', async () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = '';

      await expect(getTodayWellness()).rejects.toThrow(
        'EXPO_PUBLIC_SUPABASE_URL is not configured'
      );
    });

    it('includes authorization header in request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              wellness: [],
              summary: null,
              date_range: { oldest: fixedDate, newest: fixedDate },
            },
          }),
      });

      await getTodayWellness();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('filters wellness array for today only', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              wellness: [
                { date: '2026-02-12', ctl: 68, atl: 63, tsb: 5, rampRate: 1 },
                { date: fixedDate, ctl: 70, atl: 65, tsb: 5, rampRate: 2, sleepQuality: 4 },
                { date: '2026-02-14', ctl: 72, atl: 67, tsb: 5, rampRate: 3 },
              ],
              summary: null,
              date_range: { oldest: '2026-02-12', newest: '2026-02-14' },
            },
          }),
      });

      const result = await getTodayWellness();

      expect(result).toEqual(expect.objectContaining({ date: fixedDate, sleepQuality: 4 }));
    });
  });
});
