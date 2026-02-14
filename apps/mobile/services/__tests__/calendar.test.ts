import { formatDateLocal } from '@khepri/core';

import { getCalendarEvents } from '../calendar';

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

const mockEvents = [
  {
    id: 'event-1',
    name: 'Zone 2 Endurance Ride',
    type: 'workout',
    start_date: '2026-02-14T07:00:00Z',
    category: 'Ride',
    planned_duration: 5400,
    planned_tss: 65,
  },
  {
    id: 'event-2',
    name: 'Recovery Day',
    type: 'rest_day',
    start_date: '2026-02-15T00:00:00Z',
  },
];

describe('calendar service', () => {
  let originalUrl: string | undefined;
  let fixedDate: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_URL = TEST_SUPABASE_URL;
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token-123' } },
    });
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

  describe('getCalendarEvents', () => {
    it('returns events on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              events: mockEvents,
              total: 2,
              source: 'mock',
              date_range: { oldest: '2026-02-14', newest: '2026-02-28' },
            },
          }),
      });

      const result = await getCalendarEvents('2026-02-14', '2026-02-28');

      expect(result).toEqual(mockEvents);
    });

    it('sends correct tool request with provided date range', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              events: [],
              total: 0,
              source: 'mock',
              date_range: { oldest: '2026-02-14', newest: '2026-02-28' },
            },
          }),
      });

      await getCalendarEvents('2026-02-14', '2026-02-28');

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_SUPABASE_URL}/functions/v1/mcp-gateway`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'execute_tool',
            tool_name: 'get_events',
            tool_input: {
              oldest: '2026-02-14',
              newest: '2026-02-28',
            },
          }),
        })
      );
    });

    it('uses default dates when none provided', async () => {
      const twoWeeksOut = new Date('2026-02-13T12:00:00Z');
      twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
      const expectedNewest = formatDateLocal(twoWeeksOut);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              events: [],
              total: 0,
              source: 'mock',
              date_range: { oldest: fixedDate, newest: expectedNewest },
            },
          }),
      });

      await getCalendarEvents();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            action: 'execute_tool',
            tool_name: 'get_events',
            tool_input: {
              oldest: fixedDate,
              newest: expectedNewest,
            },
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

      const result = await getCalendarEvents();

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

      const result = await getCalendarEvents();

      expect(result).toEqual([]);
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(getCalendarEvents()).rejects.toThrow('Failed to fetch calendar events');
    });

    it('throws when not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(getCalendarEvents()).rejects.toThrow('Not authenticated');
    });

    it('throws when Supabase is not configured', async () => {
      mockSupabase = undefined;

      await expect(getCalendarEvents()).rejects.toThrow('Supabase is not configured');
    });

    it('throws when EXPO_PUBLIC_SUPABASE_URL is not set', async () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = '';

      await expect(getCalendarEvents()).rejects.toThrow(
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
              events: [],
              total: 0,
              source: 'mock',
              date_range: { oldest: fixedDate, newest: fixedDate },
            },
          }),
      });

      await getCalendarEvents();

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
  });
});
