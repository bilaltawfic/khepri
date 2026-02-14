import { jest } from '@jest/globals';

// =============================================================================
// ESM module mocks — must be set up before importing the module under test
// =============================================================================

const mockGetIntervalsCredentials = jest.fn<() => Promise<unknown>>();
const mockFetchEvents = jest.fn<() => Promise<unknown>>();

/**
 * Local copy of IntervalsApiError for test assertions.
 * Matches the real class in utils/intervals-api.ts.
 */
class IntervalsApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'IntervalsApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

jest.unstable_mockModule('../../utils/credentials.ts', () => ({
  getIntervalsCredentials: mockGetIntervalsCredentials,
}));

jest.unstable_mockModule('../../utils/intervals-api.ts', () => ({
  IntervalsApiError,
  fetchEvents: mockFetchEvents,
}));

// Dynamic import after mocks are registered
const { getEventsTool } = await import('../get-events.ts');

// =============================================================================
// Test helpers
// =============================================================================

const ATHLETE_ID = 'athlete-test-1';

/** Minimal mock SupabaseClient — the handler delegates DB work to getIntervalsCredentials. */
const mockSupabase = {} as never;

/** Convenience: call the handler with defaults. */
async function callHandler(input: Record<string, unknown> = {}) {
  return getEventsTool.handler(input, ATHLETE_ID, mockSupabase);
}

/** Factory for Intervals.icu API event objects. */
function makeIntervalsEvent(overrides?: Record<string, unknown>) {
  return {
    id: 100,
    name: 'Morning Ride',
    type: 'WORKOUT',
    start_date_local: '2026-02-14T07:00:00Z',
    end_date_local: undefined,
    description: 'Easy spin',
    category: 'Ride',
    moving_time: 3600,
    icu_training_load: 50,
    distance: 30000,
    indoor: false,
    event_priority: undefined,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getEventsTool', () => {
  describe('definition', () => {
    it('has the correct tool name', () => {
      expect(getEventsTool.definition.name).toBe('get_events');
    });
  });

  // ---------------------------------------------------------------------------
  // Mock data fallback (no credentials)
  // ---------------------------------------------------------------------------
  describe('when no credentials are configured', () => {
    beforeEach(() => {
      mockGetIntervalsCredentials.mockResolvedValue(null);
    });

    it('returns mock events with source "mock"', async () => {
      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveProperty('source', 'mock');
      expect(result.data).toHaveProperty('events');
    });

    it('does not call fetchEvents', async () => {
      await callHandler({ oldest: '2026-02-14', newest: '2026-02-28' });
      expect(mockFetchEvents).not.toHaveBeenCalled();
    });

    it('applies type filter to mock data', async () => {
      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-03-01',
        types: ['race'],
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      const events = (result.data as { events: Array<{ type: string }> }).events;
      for (const event of events) {
        expect(event.type).toBe('race');
      }
    });

    it('applies category filter to mock data', async () => {
      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
        category: 'Ride',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      const events = (result.data as { events: Array<{ category?: string }> }).events;
      for (const event of events) {
        expect(event.category?.toLowerCase()).toBe('ride');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Real API path (credentials exist)
  // ---------------------------------------------------------------------------
  describe('when credentials are configured', () => {
    const fakeCredentials = {
      intervalsAthleteId: 'i12345',
      apiKey: 'test-key',
    };

    beforeEach(() => {
      mockGetIntervalsCredentials.mockResolvedValue(fakeCredentials);
    });

    it('fetches events from Intervals.icu API', async () => {
      mockFetchEvents.mockResolvedValue([makeIntervalsEvent()]);

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });

      expect(mockFetchEvents).toHaveBeenCalledWith(fakeCredentials, {
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveProperty('source', 'intervals.icu');
    });

    it('transforms Intervals.icu events to CalendarEvent shape', async () => {
      mockFetchEvents.mockResolvedValue([
        makeIntervalsEvent({
          id: 42,
          name: 'Tempo Run',
          type: 'WORKOUT',
          start_date_local: '2026-02-14T06:00:00Z',
          end_date_local: '2026-02-14T07:00:00Z',
          description: 'Threshold intervals',
          category: 'Run',
          moving_time: 2700,
          icu_training_load: 65,
          distance: 10000,
          indoor: false,
          event_priority: 'B',
        }),
      ]);

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-14',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const events = (result.data as { events: Array<Record<string, unknown>> }).events;
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.id).toBe('42');
      expect(event.name).toBe('Tempo Run');
      expect(event.type).toBe('workout');
      expect(event.start_date).toBe('2026-02-14T06:00:00Z');
      expect(event.end_date).toBe('2026-02-14T07:00:00Z');
      expect(event.description).toBe('Threshold intervals');
      expect(event.category).toBe('Run');
      expect(event.planned_duration).toBe(2700);
      expect(event.planned_tss).toBe(65);
      expect(event.planned_distance).toBe(10000);
      expect(event.indoor).toBe(false);
      expect(event.priority).toBe('B');
    });

    it('applies type filter to real API data', async () => {
      mockFetchEvents.mockResolvedValue([
        makeIntervalsEvent({ id: 1, type: 'WORKOUT' }),
        makeIntervalsEvent({ id: 2, type: 'RACE', name: 'Sprint Tri' }),
        makeIntervalsEvent({ id: 3, type: 'NOTE', name: 'Coach Note' }),
      ]);

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
        types: ['race'],
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      const events = (result.data as { events: Array<{ type: string }> }).events;
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('race');
    });

    it('applies category filter to real API data', async () => {
      mockFetchEvents.mockResolvedValue([
        makeIntervalsEvent({ id: 1, category: 'Ride' }),
        makeIntervalsEvent({ id: 2, category: 'Run' }),
      ]);

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
        category: 'run',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      const events = (result.data as { events: Array<{ category?: string }> }).events;
      expect(events).toHaveLength(1);
      expect(events[0].category).toBe('Run');
    });
  });

  // ---------------------------------------------------------------------------
  // Event type normalization
  // ---------------------------------------------------------------------------
  describe('normalizeEventType (via transform)', () => {
    beforeEach(() => {
      mockGetIntervalsCredentials.mockResolvedValue({
        intervalsAthleteId: 'i1',
        apiKey: 'k1',
      });
    });

    it.each([
      ['WORKOUT', 'workout'],
      ['RACE', 'race'],
      ['NOTE', 'note'],
      ['REST_DAY', 'rest_day'],
      ['TRAVEL', 'travel'],
    ])('maps %s → %s', async (intervalsType, expectedType) => {
      mockFetchEvents.mockResolvedValue([makeIntervalsEvent({ id: 1, type: intervalsType })]);

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      const events = (result.data as { events: Array<{ type: string }> }).events;
      expect(events[0].type).toBe(expectedType);
    });

    it('defaults unknown types to "workout"', async () => {
      mockFetchEvents.mockResolvedValue([makeIntervalsEvent({ id: 1, type: 'UNKNOWN_TYPE' })]);

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      const events = (result.data as { events: Array<{ type: string }> }).events;
      expect(events[0].type).toBe('workout');
    });
  });

  // ---------------------------------------------------------------------------
  // Event priority normalization
  // ---------------------------------------------------------------------------
  describe('normalizeEventPriority (via transform)', () => {
    beforeEach(() => {
      mockGetIntervalsCredentials.mockResolvedValue({
        intervalsAthleteId: 'i1',
        apiKey: 'k1',
      });
    });

    it.each(['A', 'B', 'C'])('preserves valid priority %s', async (priority) => {
      mockFetchEvents.mockResolvedValue([makeIntervalsEvent({ id: 1, event_priority: priority })]);

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      const events = (result.data as { events: Array<{ priority?: string }> }).events;
      expect(events[0].priority).toBe(priority);
    });

    it('returns undefined for invalid priority', async () => {
      mockFetchEvents.mockResolvedValue([makeIntervalsEvent({ id: 1, event_priority: 'X' })]);

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      const events = (result.data as { events: Array<{ priority?: string }> }).events;
      expect(events[0].priority).toBeUndefined();
    });

    it('returns undefined for missing priority', async () => {
      mockFetchEvents.mockResolvedValue([makeIntervalsEvent({ id: 1, event_priority: undefined })]);

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      const events = (result.data as { events: Array<{ priority?: string }> }).events;
      expect(events[0].priority).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  describe('error handling', () => {
    beforeEach(() => {
      mockGetIntervalsCredentials.mockResolvedValue({
        intervalsAthleteId: 'i1',
        apiKey: 'k1',
      });
    });

    it('falls back to mock on INVALID_CREDENTIALS error', async () => {
      mockFetchEvents.mockRejectedValue(
        new IntervalsApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
      );

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveProperty('source', 'mock');
    });

    it('returns error for RATE_LIMITED', async () => {
      mockFetchEvents.mockRejectedValue(
        new IntervalsApiError('Rate limit exceeded', 429, 'RATE_LIMITED')
      );

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('RATE_LIMITED');
    });

    it('returns error for API_ERROR', async () => {
      mockFetchEvents.mockRejectedValue(
        new IntervalsApiError('Server error: 500', 500, 'API_ERROR')
      );

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('API_ERROR');
      expect(result.error).toContain('500');
    });

    it('returns error for NETWORK_ERROR', async () => {
      mockFetchEvents.mockRejectedValue(new IntervalsApiError('Network error', 0, 'NETWORK_ERROR'));

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('returns generic error for non-IntervalsApiError', async () => {
      mockFetchEvents.mockRejectedValue(new Error('Unexpected failure'));

      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('GET_EVENTS_ERROR');
      expect(result.error).toBe('Unexpected failure');
    });
  });

  // ---------------------------------------------------------------------------
  // Response shape
  // ---------------------------------------------------------------------------
  describe('response shape', () => {
    beforeEach(() => {
      mockGetIntervalsCredentials.mockResolvedValue(null);
    });

    it('includes date_range and filters_applied', async () => {
      const result = await callHandler({
        oldest: '2026-02-14',
        newest: '2026-02-28',
        types: ['workout'],
        category: 'Ride',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const data = result.data as Record<string, unknown>;
      expect(data).toHaveProperty('date_range');
      expect(data).toHaveProperty('filters_applied');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('source');

      const dateRange = data.date_range as { oldest: string; newest: string };
      expect(dateRange.oldest).toBe('2026-02-14');
      expect(dateRange.newest).toBe('2026-02-28');

      const filters = data.filters_applied as { types?: string[]; category?: string };
      expect(filters.types).toEqual(['workout']);
      expect(filters.category).toBe('Ride');
    });
  });
});
