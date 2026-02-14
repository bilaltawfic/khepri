import { jest } from '@jest/globals';

// =============================================================================
// ESM module mocks — must be set up before importing the module under test
// =============================================================================

const mockGetIntervalsCredentials = jest.fn<() => Promise<unknown>>();
const mockCreateEvent = jest.fn<() => Promise<unknown>>();

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
  createEvent: mockCreateEvent,
}));

// Dynamic import after mocks are registered
const { createEventTool } = await import('../create-event.ts');

// =============================================================================
// Test helpers
// =============================================================================

const ATHLETE_ID = 'athlete-test-1';

/** Minimal mock SupabaseClient — the handler delegates DB work to getIntervalsCredentials. */
const mockSupabase = {} as never;

/** Convenience: call the handler with defaults. */
async function callHandler(input: Record<string, unknown> = {}) {
  return createEventTool.handler(input, ATHLETE_ID, mockSupabase);
}

const FAKE_CREDENTIALS = {
  intervalsAthleteId: 'i12345',
  apiKey: 'test-key',
};

/** Factory for Intervals.icu API event response objects. */
function makeCreatedEvent(overrides?: Record<string, unknown>) {
  return {
    id: 200,
    name: 'Zone 2 Endurance Ride',
    type: 'WORKOUT',
    start_date_local: '2026-02-20T07:00:00',
    end_date_local: undefined,
    description: undefined,
    category: 'Ride',
    moving_time: 5400,
    icu_training_load: 65,
    distance: 40000,
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
      const result = await callHandler({
        type: 'WORKOUT',
        start_date_local: '2026-02-20',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('name');
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
        name: 'Test Event',
        type: 'INVALID_TYPE',
        start_date_local: '2026-02-20',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_EVENT_TYPE');
      expect(result.error).toContain('INVALID_TYPE');
    });

    it('returns error when type is missing', async () => {
      const result = await callHandler({
        name: 'Test Event',
        start_date_local: '2026-02-20',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_EVENT_TYPE');
    });

    it('returns error for invalid date format', async () => {
      const result = await callHandler({
        name: 'Test Event',
        type: 'WORKOUT',
        start_date_local: 'not-a-date',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_DATE');
    });

    it('returns error when start_date_local is missing', async () => {
      const result = await callHandler({
        name: 'Test Event',
        type: 'WORKOUT',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_DATE');
    });

    it('returns error for invalid priority', async () => {
      const result = await callHandler({
        name: 'Race Day',
        type: 'RACE',
        start_date_local: '2026-03-01',
        event_priority: 'X',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_PRIORITY');
    });

    it('returns error for negative moving_time', async () => {
      const result = await callHandler({
        name: 'Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20',
        moving_time: -100,
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('moving_time');
    });

    it('returns error for negative distance', async () => {
      const result = await callHandler({
        name: 'Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20',
        distance: -5000,
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('distance');
    });

    it('returns error for negative icu_training_load', async () => {
      const result = await callHandler({
        name: 'Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20',
        icu_training_load: -10,
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('icu_training_load');
    });

    it('returns error for invalid end_date_local format', async () => {
      const result = await callHandler({
        name: 'Trip',
        type: 'TRAVEL',
        start_date_local: '2026-02-20',
        end_date_local: 'bad-date',
      });

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

      const result = await callHandler({
        name: 'Morning Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20',
      });

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
      const createdEvent = makeCreatedEvent();
      mockCreateEvent.mockResolvedValue(createdEvent);

      const result = await callHandler({
        name: 'Zone 2 Endurance Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20T07:00:00',
      });

      expect(mockCreateEvent).toHaveBeenCalledWith(
        FAKE_CREDENTIALS,
        expect.objectContaining({
          name: 'Zone 2 Endurance Ride',
          type: 'WORKOUT',
          start_date_local: '2026-02-20T07:00:00',
        })
      );
      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as { event: Record<string, unknown>; message: string };
      expect(data.event.id).toBe('200');
      expect(data.event.name).toBe('Zone 2 Endurance Ride');
      expect(data.message).toContain('created successfully');
    });

    it('creates event with all optional fields', async () => {
      const createdEvent = makeCreatedEvent({
        description: 'Easy spin in zone 2',
        end_date_local: '2026-02-20T09:00:00',
        event_priority: 'B',
      });
      mockCreateEvent.mockResolvedValue(createdEvent);

      const result = await callHandler({
        name: 'Zone 2 Endurance Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20T07:00:00',
        end_date_local: '2026-02-20T09:00:00',
        description: 'Easy spin in zone 2',
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
          name: 'Zone 2 Endurance Ride',
          type: 'WORKOUT',
          start_date_local: '2026-02-20T07:00:00',
          end_date_local: '2026-02-20T09:00:00',
          description: 'Easy spin in zone 2',
          category: 'Ride',
          moving_time: 5400,
          icu_training_load: 65,
          distance: 40000,
          indoor: false,
          event_priority: 'B',
        })
      );
    });

    it('accepts date-only format for start_date_local', async () => {
      mockCreateEvent.mockResolvedValue(makeCreatedEvent());

      const result = await callHandler({
        name: 'Rest Day',
        type: 'REST_DAY',
        start_date_local: '2026-02-20',
      });

      expect(result.success).toBe(true);
      expect(mockCreateEvent).toHaveBeenCalledWith(
        FAKE_CREDENTIALS,
        expect.objectContaining({ start_date_local: '2026-02-20' })
      );
    });

    it.each(['WORKOUT', 'RACE', 'NOTE', 'REST_DAY', 'TRAVEL'])(
      'accepts valid event type %s',
      async (type) => {
        mockCreateEvent.mockResolvedValue(makeCreatedEvent({ type }));

        const result = await callHandler({
          name: 'Test Event',
          type,
          start_date_local: '2026-02-20',
        });

        expect(result.success).toBe(true);
      }
    );

    it.each(['A', 'B', 'C'])('accepts valid priority %s', async (priority) => {
      mockCreateEvent.mockResolvedValue(makeCreatedEvent({ event_priority: priority }));

      const result = await callHandler({
        name: 'Race',
        type: 'RACE',
        start_date_local: '2026-03-01',
        event_priority: priority,
      });

      expect(result.success).toBe(true);
    });

    it('does not send undefined optional fields to the API', async () => {
      mockCreateEvent.mockResolvedValue(makeCreatedEvent());

      await callHandler({
        name: 'Quick Note',
        type: 'NOTE',
        start_date_local: '2026-02-20',
      });

      const callArgs = mockCreateEvent.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
      expect(callArgs).toBeDefined();
      if (callArgs == null) return;
      expect(Object.keys(callArgs)).toEqual(['name', 'type', 'start_date_local']);
    });

    it('allows moving_time of zero', async () => {
      mockCreateEvent.mockResolvedValue(makeCreatedEvent({ moving_time: 0 }));

      const result = await callHandler({
        name: 'Rest',
        type: 'REST_DAY',
        start_date_local: '2026-02-20',
        moving_time: 0,
      });

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

    it('returns error for INVALID_CREDENTIALS (401)', async () => {
      mockCreateEvent.mockRejectedValue(
        new IntervalsApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
      );

      const result = await callHandler({
        name: 'Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns error for RATE_LIMITED (429)', async () => {
      mockCreateEvent.mockRejectedValue(
        new IntervalsApiError('Rate limit exceeded', 429, 'RATE_LIMITED')
      );

      const result = await callHandler({
        name: 'Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('RATE_LIMITED');
    });

    it('returns error for API_ERROR (500)', async () => {
      mockCreateEvent.mockRejectedValue(
        new IntervalsApiError('Server error: 500', 500, 'API_ERROR')
      );

      const result = await callHandler({
        name: 'Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('API_ERROR');
      expect(result.error).toContain('500');
    });

    it('returns error for NETWORK_ERROR', async () => {
      mockCreateEvent.mockRejectedValue(new IntervalsApiError('Network error', 0, 'NETWORK_ERROR'));

      const result = await callHandler({
        name: 'Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('returns generic error for non-IntervalsApiError', async () => {
      mockCreateEvent.mockRejectedValue(new Error('Unexpected failure'));

      const result = await callHandler({
        name: 'Ride',
        type: 'WORKOUT',
        start_date_local: '2026-02-20',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('CREATE_EVENT_ERROR');
      expect(result.error).toBe('Unexpected failure');
    });
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
        makeCreatedEvent({
          id: 42,
          name: 'Tempo Run',
          type: 'WORKOUT',
          category: 'Run',
          moving_time: 2700,
          icu_training_load: 65,
          distance: 10000,
          indoor: false,
        })
      );

      const result = await callHandler({
        name: 'Tempo Run',
        type: 'WORKOUT',
        start_date_local: '2026-02-20T06:00:00',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const data = result.data as { event: Record<string, unknown>; message: string };
      expect(data.event).toHaveProperty('id', '42');
      expect(data.event).toHaveProperty('name', 'Tempo Run');
      expect(data.event).toHaveProperty('type', 'WORKOUT');
      expect(data.event).toHaveProperty('category', 'Run');
      expect(data.event).toHaveProperty('moving_time', 2700);
      expect(data.event).toHaveProperty('icu_training_load', 65);
      expect(data.event).toHaveProperty('distance', 10000);
      expect(data.event).toHaveProperty('indoor', false);
      expect(data.message).toContain('Tempo Run');
      expect(data.message).toContain('created successfully');
    });
  });
});
