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

const VALID_INPUT = { name: 'Ride', type: 'WORKOUT', start_date_local: '2026-02-20' };

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

    it('requires name, type, and start_date_local', () => {
      expect(createEventTool.definition.input_schema.required).toEqual([
        'name',
        'type',
        'start_date_local',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // Input validation
  // ---------------------------------------------------------------------------
  describe('input validation', () => {
    it('returns error when name is missing', async () => {
      const result = await callHandler({ type: 'WORKOUT', start_date_local: '2026-02-20' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error when name is empty string', async () => {
      const result = await callHandler({
        name: '  ',
        type: 'WORKOUT',
        start_date_local: '2026-02-20',
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for invalid event type', async () => {
      const result = await callHandler({
        name: 'Test',
        type: 'INVALID',
        start_date_local: '2026-02-20',
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_EVENT_TYPE');
    });

    it('returns error when type is missing', async () => {
      const result = await callHandler({ name: 'Test', start_date_local: '2026-02-20' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_EVENT_TYPE');
    });

    it('returns error for invalid date format', async () => {
      const result = await callHandler({ name: 'Test', type: 'WORKOUT', start_date_local: 'bad' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_DATE');
    });

    it('returns error when start_date_local is missing', async () => {
      const result = await callHandler({ name: 'Test', type: 'WORKOUT' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_DATE');
    });

    it('returns error for invalid priority', async () => {
      const result = await callHandler({ ...VALID_INPUT, event_priority: 'X' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_PRIORITY');
    });

    it('returns error for negative moving_time', async () => {
      const result = await callHandler({ ...VALID_INPUT, moving_time: -100 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for negative distance', async () => {
      const result = await callHandler({ ...VALID_INPUT, distance: -5000 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for negative icu_training_load', async () => {
      const result = await callHandler({ ...VALID_INPUT, icu_training_load: -10 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for NaN moving_time', async () => {
      const result = await callHandler({ ...VALID_INPUT, moving_time: Number.NaN });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for Infinity distance', async () => {
      const result = await callHandler({ ...VALID_INPUT, distance: Number.POSITIVE_INFINITY });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for invalid end_date_local format', async () => {
      const result = await callHandler({ ...VALID_INPUT, end_date_local: 'bad' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_DATE');
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

    it('creates event with minimal required fields', async () => {
      mockCreateEvent.mockResolvedValue(makeEventResponse({ name: 'Zone 2 Ride' }));

      const result = await callHandler({
        name: 'Zone 2 Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20T07:00:00',
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

    it('creates event with all optional fields', async () => {
      mockCreateEvent.mockResolvedValue(makeEventResponse({ event_priority: 'B' }));

      const result = await callHandler({
        ...VALID_INPUT,
        end_date_local: '2026-02-20T09:00:00',
        description: 'Easy spin',
        category: 'Ride',
        moving_time: 5400,
        icu_training_load: 65,
        distance: 40000,
        indoor: false,
        event_priority: 'B',
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

    it('accepts date-only format for start_date_local', async () => {
      mockCreateEvent.mockResolvedValue(makeEventResponse());
      const result = await callHandler({
        name: 'Rest',
        type: 'REST_DAY',
        start_date_local: '2026-02-20',
      });
      expect(result.success).toBe(true);
    });

    it.each(['WORKOUT', 'RACE', 'NOTE', 'REST_DAY', 'TRAVEL'])(
      'accepts event type %s',
      async (type) => {
        mockCreateEvent.mockResolvedValue(makeEventResponse({ type }));
        const result = await callHandler({ name: 'E', type, start_date_local: '2026-02-20' });
        expect(result.success).toBe(true);
      }
    );

    it('accepts lowercase event type', async () => {
      mockCreateEvent.mockResolvedValue(makeEventResponse({ type: 'WORKOUT' }));
      const result = await callHandler({
        name: 'Ride',
        type: 'workout',
        start_date_local: '2026-02-20',
      });
      expect(result.success).toBe(true);
      expect(mockCreateEvent).toHaveBeenCalledWith(
        FAKE_CREDENTIALS,
        expect.objectContaining({ type: 'WORKOUT' })
      );
    });

    it.each(['A', 'B', 'C'])('accepts priority %s', async (priority) => {
      mockCreateEvent.mockResolvedValue(makeEventResponse({ event_priority: priority }));
      const result = await callHandler({ ...VALID_INPUT, event_priority: priority });
      expect(result.success).toBe(true);
    });

    it('does not send undefined optional fields to the API', async () => {
      mockCreateEvent.mockResolvedValue(makeEventResponse());
      await callHandler({ name: 'Note', type: 'NOTE', start_date_local: '2026-02-20' });
      const callArgs = mockCreateEvent.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
      expect(callArgs).toBeDefined();
      if (callArgs == null) return;
      expect(Object.keys(callArgs)).toEqual(['name', 'type', 'start_date_local']);
    });

    it('allows moving_time of zero', async () => {
      mockCreateEvent.mockResolvedValue(makeEventResponse({ moving_time: 0 }));
      const result = await callHandler({ ...VALID_INPUT, moving_time: 0 });
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

    it('includes event data and success message', async () => {
      mockCreateEvent.mockResolvedValue(
        makeEventResponse({ id: 42, name: 'Tempo Run', category: 'Run' })
      );
      const result = await callHandler({
        name: 'Tempo Run',
        type: 'WORKOUT',
        start_date_local: '2026-02-20T06:00:00',
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as EventResultData;
      expect(data.event).toHaveProperty('id', '42');
      expect(data.event).toHaveProperty('name', 'Tempo Run');
      expect(data.event).toHaveProperty('category', 'Run');
      expect(data.message).toContain('created successfully');
    });
  });
});
