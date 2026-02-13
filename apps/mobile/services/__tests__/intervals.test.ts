import { getTodayWellness } from '../intervals';

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
  const fixedDate = '2026-02-13';

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
    jest.setSystemTime(new Date(`${fixedDate}T12:00:00Z`));
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
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
