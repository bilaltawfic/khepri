import { jest } from '@jest/globals';
import {
  ATHLETE_ID,
  type EventResultData,
  FAKE_CREDENTIALS,
  IntervalsApiError,
  MOCK_SUPABASE,
  describeApiErrorHandling,
  makeEventResponse,
} from './event-test-helpers.ts';

// =============================================================================
// ESM module mocks
// =============================================================================

const mockGetIntervalsCredentials = jest.fn<() => Promise<unknown>>();
const mockCreateEvent = jest.fn<() => Promise<unknown>>();

jest.unstable_mockModule('../../utils/credentials.ts', () => ({
  getIntervalsCredentials: mockGetIntervalsCredentials,
}));

jest.unstable_mockModule('../../utils/intervals-api.ts', () => ({
  IntervalsApiError,
  createEvent: mockCreateEvent,
}));

const { createEventTool } = await import('../create-event.ts');

// =============================================================================
// Helpers
// =============================================================================

async function callHandler(input: Record<string, unknown> = {}) {
  return createEventTool.handler(input, ATHLETE_ID, MOCK_SUPABASE);
}

/** Valid input using CalendarEvent field names (matching get_events output). */
const VALID_INPUT = { name: 'Ride', type: 'workout', start_date: '2026-02-20' };

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createEventTool', () => {
  describe('definition', () => {
    it('has the correct tool name', () => {
      expect(createEventTool.definition.name).toBe('create_event');
    });

    it('requires name, type, and start_date (CalendarEvent convention)', () => {
      expect(createEventTool.definition.input_schema.required).toEqual([
        'name',
        'type',
        'start_date',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // Input validation
  // ---------------------------------------------------------------------------
  describe('input validation', () => {
    it('returns error when name is missing', async () => {
      const result = await callHandler({ type: 'workout', start_date: '2026-02-20' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error when name is empty string', async () => {
      const result = await callHandler({
        name: '  ',
        type: 'workout',
        start_date: '2026-02-20',
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for invalid event type', async () => {
      const result = await callHandler({
        name: 'Test',
        type: 'INVALID',
        start_date: '2026-02-20',
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_EVENT_TYPE');
    });

    it('returns error when type is missing', async () => {
      const result = await callHandler({ name: 'Test', start_date: '2026-02-20' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_EVENT_TYPE');
    });

    it('returns error for invalid date format', async () => {
      const result = await callHandler({ name: 'Test', type: 'workout', start_date: 'bad' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_DATE');
    });

    it('returns error when start_date is missing', async () => {
      const result = await callHandler({ name: 'Test', type: 'workout' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_DATE');
    });

    it('returns error for invalid priority', async () => {
      const result = await callHandler({ ...VALID_INPUT, priority: 'X' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_PRIORITY');
    });

    it('returns error for negative planned_duration', async () => {
      const result = await callHandler({ ...VALID_INPUT, planned_duration: -100 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for negative planned_distance', async () => {
      const result = await callHandler({ ...VALID_INPUT, planned_distance: -5000 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for negative planned_tss', async () => {
      const result = await callHandler({ ...VALID_INPUT, planned_tss: -10 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for NaN planned_duration', async () => {
      const result = await callHandler({ ...VALID_INPUT, planned_duration: Number.NaN });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for Infinity planned_distance', async () => {
      const result = await callHandler({
        ...VALID_INPUT,
        planned_distance: Number.POSITIVE_INFINITY,
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for invalid end_date format', async () => {
      const result = await callHandler({ ...VALID_INPUT, end_date: 'bad' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_DATE');
    });

    it('also accepts old API field names (backward compat)', async () => {
      mockGetIntervalsCredentials.mockResolvedValue(FAKE_CREDENTIALS);
      mockCreateEvent.mockResolvedValue(makeEventResponse());
      const result = await callHandler({
        name: 'Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20',
      });
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Credentials
  // ---------------------------------------------------------------------------
  describe('when credentials are missing', () => {
    it('returns NO_CREDENTIALS error', async () => {
      mockGetIntervalsCredentials.mockResolvedValue(null);
      const result = await callHandler(VALID_INPUT);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('NO_CREDENTIALS');
    });
  });

  // ---------------------------------------------------------------------------
  // Successful creation
  // ---------------------------------------------------------------------------
  describe('when credentials are configured', () => {
    beforeEach(() => {
      mockGetIntervalsCredentials.mockResolvedValue(FAKE_CREDENTIALS);
    });

    it('creates event with minimal required fields (CalendarEvent names)', async () => {
      mockCreateEvent.mockResolvedValue(makeEventResponse({ name: 'Zone 2 Ride' }));

      const result = await callHandler({
        name: 'Zone 2 Ride',
        type: 'workout',
        start_date: '2026-02-20T07:00:00',
      });

      expect(mockCreateEvent).toHaveBeenCalledWith(
        FAKE_CREDENTIALS,
        expect.objectContaining({
          name: 'Zone 2 Ride',
          type: 'WORKOUT',
          start_date_local: '2026-02-20T07:00:00',
        })
      );
      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as EventResultData;
      expect(data.event.id).toBe('200');
      expect(data.message).toContain('created successfully');
    });

    it('creates event with all optional fields (CalendarEvent names)', async () => {
      mockCreateEvent.mockResolvedValue(makeEventResponse({ event_priority: 'B' }));

      const result = await callHandler({
        ...VALID_INPUT,
        end_date: '2026-02-20T09:00:00',
        description: 'Easy spin',
        category: 'Ride',
        planned_duration: 5400,
        planned_tss: 65,
        planned_distance: 40000,
        indoor: false,
        priority: 'B',
      });

      expect(result.success).toBe(true);
      expect(mockCreateEvent).toHaveBeenCalledWith(
        FAKE_CREDENTIALS,
        expect.objectContaining({
          end_date_local: '2026-02-20T09:00:00',
          description: 'Easy spin',
          event_priority: 'B',
        })
      );
    });

    it('accepts date-only format for start_date', async () => {
      mockCreateEvent.mockResolvedValue(makeEventResponse());
      const result = await callHandler({
        name: 'Rest',
        type: 'rest_day',
        start_date: '2026-02-20',
      });
      expect(result.success).toBe(true);
    });

    it.each(['WORKOUT', 'RACE', 'NOTE', 'REST_DAY', 'TRAVEL'])(
      'accepts event type %s',
      async (type) => {
        mockCreateEvent.mockResolvedValue(makeEventResponse({ type }));
        const result = await callHandler({ name: 'E', type, start_date: '2026-02-20' });
        expect(result.success).toBe(true);
      }
    );

    it('accepts lowercase event type and normalizes to uppercase in payload', async () => {
      mockCreateEvent.mockResolvedValue(makeEventResponse({ type: 'WORKOUT' }));
      const result = await callHandler({
        name: 'Ride',
        type: 'workout',
        start_date: '2026-02-20',
      });
      expect(result.success).toBe(true);
      expect(mockCreateEvent).toHaveBeenCalledWith(
        FAKE_CREDENTIALS,
        expect.objectContaining({ type: 'WORKOUT' })
      );
    });

    it.each(['A', 'B', 'C'])('accepts priority %s', async (p) => {
      mockCreateEvent.mockResolvedValue(makeEventResponse({ event_priority: p }));
      const result = await callHandler({ ...VALID_INPUT, priority: p });
      expect(result.success).toBe(true);
    });

    it('does not send undefined optional fields to the API', async () => {
      mockCreateEvent.mockResolvedValue(makeEventResponse());
      await callHandler({ name: 'Note', type: 'note', start_date: '2026-02-20' });
      const callArgs = mockCreateEvent.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
      expect(callArgs).toBeDefined();
      if (callArgs == null) return;
      expect(Object.keys(callArgs)).toEqual(['name', 'type', 'start_date_local']);
    });

    it('allows planned_duration of zero', async () => {
      mockCreateEvent.mockResolvedValue(makeEventResponse({ moving_time: 0 }));
      const result = await callHandler({ ...VALID_INPUT, planned_duration: 0 });
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  describe('error handling', () => {
    beforeEach(() => {
      mockGetIntervalsCredentials.mockResolvedValue(FAKE_CREDENTIALS);
    });

    describeApiErrorHandling(mockCreateEvent, callHandler, 'CREATE_EVENT_ERROR', VALID_INPUT);
  });

  // ---------------------------------------------------------------------------
  // Response shape
  // ---------------------------------------------------------------------------
  describe('response shape', () => {
    beforeEach(() => {
      mockGetIntervalsCredentials.mockResolvedValue(FAKE_CREDENTIALS);
    });

    it('returns CalendarEvent field names in response', async () => {
      mockCreateEvent.mockResolvedValue(
        makeEventResponse({ id: 42, name: 'Tempo Run', category: 'Run' })
      );
      const result = await callHandler({
        name: 'Tempo Run',
        type: 'workout',
        start_date: '2026-02-20T06:00:00',
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as EventResultData;
      expect(data.event).toHaveProperty('id', '42');
      expect(data.event).toHaveProperty('name', 'Tempo Run');
      expect(data.event).toHaveProperty('category', 'Run');
      expect(data.event).toHaveProperty('start_date');
      expect(data.event).toHaveProperty('planned_duration');
      expect(data.message).toContain('created successfully');
    });
  });
});
