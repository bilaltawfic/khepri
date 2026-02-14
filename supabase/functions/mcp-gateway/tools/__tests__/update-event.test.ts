import { jest } from '@jest/globals';

// =============================================================================
// ESM module mocks — must be set up before importing the module under test
// =============================================================================

const mockGetIntervalsCredentials = jest.fn<() => Promise<unknown>>();
const mockUpdateEvent = jest.fn<() => Promise<unknown>>();

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
  updateEvent: mockUpdateEvent,
}));

// Dynamic import after mocks are registered
const { updateEventTool } = await import('../update-event.ts');

// =============================================================================
// Test helpers
// =============================================================================

const ATHLETE_ID = 'athlete-test-1';

/** Minimal mock SupabaseClient — the handler delegates DB work to getIntervalsCredentials. */
const mockSupabase = {} as never;

/** Convenience: call the handler with defaults. */
async function callHandler(input: Record<string, unknown> = {}) {
  return updateEventTool.handler(input, ATHLETE_ID, mockSupabase);
}

const FAKE_CREDENTIALS = {
  intervalsAthleteId: 'i12345',
  apiKey: 'test-key',
};

/** Factory for Intervals.icu API event response objects. */
function makeUpdatedEvent(overrides?: Record<string, unknown>) {
  return {
    id: 200,
    name: 'Updated Ride',
    type: 'WORKOUT',
    start_date_local: '2026-02-20T07:00:00',
    end_date_local: undefined,
    description: 'Updated description',
    category: 'Ride',
    moving_time: 7200,
    icu_training_load: 80,
    distance: 50000,
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

describe('updateEventTool', () => {
  describe('definition', () => {
    it('has the correct tool name', () => {
      expect(updateEventTool.definition.name).toBe('update_event');
    });

    it('requires event_id', () => {
      expect(updateEventTool.definition.input_schema.required).toEqual(['event_id']);
    });
  });

  // ---------------------------------------------------------------------------
  // Input validation
  // ---------------------------------------------------------------------------
  describe('input validation', () => {
    it('returns error when event_id is missing', async () => {
      const result = await callHandler({ name: 'Updated Name' });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('event_id');
    });

    it('returns error when event_id is empty string', async () => {
      const result = await callHandler({ event_id: '  ', name: 'Updated Name' });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for invalid event type', async () => {
      const result = await callHandler({
        event_id: '200',
        type: 'INVALID_TYPE',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_EVENT_TYPE');
    });

    it('returns error for invalid date format', async () => {
      const result = await callHandler({
        event_id: '200',
        start_date_local: 'not-a-date',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_DATE');
    });

    it('returns error for invalid priority', async () => {
      const result = await callHandler({
        event_id: '200',
        event_priority: 'Z',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_PRIORITY');
    });

    it('returns error when name is empty string', async () => {
      const result = await callHandler({
        event_id: '200',
        name: '  ',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for negative moving_time', async () => {
      const result = await callHandler({
        event_id: '200',
        moving_time: -100,
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('moving_time');
    });

    it('returns error for negative distance', async () => {
      const result = await callHandler({
        event_id: '200',
        distance: -5000,
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('distance');
    });

    it('returns error for negative icu_training_load', async () => {
      const result = await callHandler({
        event_id: '200',
        icu_training_load: -10,
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('icu_training_load');
    });

    it('returns error when no update fields are provided', async () => {
      mockGetIntervalsCredentials.mockResolvedValue(FAKE_CREDENTIALS);

      const result = await callHandler({ event_id: '200' });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('At least one field');
    });

    it('returns error for invalid end_date_local format', async () => {
      const result = await callHandler({
        event_id: '200',
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
        event_id: '200',
        name: 'Updated Name',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('NO_CREDENTIALS');
    });
  });

  // ---------------------------------------------------------------------------
  // Successful updates
  // ---------------------------------------------------------------------------
  describe('when credentials are configured', () => {
    beforeEach(() => {
      mockGetIntervalsCredentials.mockResolvedValue(FAKE_CREDENTIALS);
    });

    it('updates a single field (name)', async () => {
      mockUpdateEvent.mockResolvedValue(makeUpdatedEvent({ name: 'New Name' }));

      const result = await callHandler({
        event_id: '200',
        name: 'New Name',
      });

      expect(mockUpdateEvent).toHaveBeenCalledWith(FAKE_CREDENTIALS, '200', { name: 'New Name' });
      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as { event: Record<string, unknown>; message: string };
      expect(data.event.name).toBe('New Name');
      expect(data.message).toContain('updated successfully');
    });

    it('updates multiple fields', async () => {
      mockUpdateEvent.mockResolvedValue(
        makeUpdatedEvent({
          name: 'Longer Ride',
          moving_time: 7200,
          icu_training_load: 90,
        })
      );

      const result = await callHandler({
        event_id: '200',
        name: 'Longer Ride',
        moving_time: 7200,
        icu_training_load: 90,
      });

      expect(mockUpdateEvent).toHaveBeenCalledWith(FAKE_CREDENTIALS, '200', {
        name: 'Longer Ride',
        moving_time: 7200,
        icu_training_load: 90,
      });
      expect(result.success).toBe(true);
    });

    it('updates event type', async () => {
      mockUpdateEvent.mockResolvedValue(makeUpdatedEvent({ type: 'RACE' }));

      const result = await callHandler({
        event_id: '200',
        type: 'RACE',
      });

      expect(mockUpdateEvent).toHaveBeenCalledWith(FAKE_CREDENTIALS, '200', { type: 'RACE' });
      expect(result.success).toBe(true);
    });

    it('updates date', async () => {
      mockUpdateEvent.mockResolvedValue(
        makeUpdatedEvent({ start_date_local: '2026-02-25T08:00:00' })
      );

      const result = await callHandler({
        event_id: '200',
        start_date_local: '2026-02-25T08:00:00',
      });

      expect(mockUpdateEvent).toHaveBeenCalledWith(FAKE_CREDENTIALS, '200', {
        start_date_local: '2026-02-25T08:00:00',
      });
      expect(result.success).toBe(true);
    });

    it('converts event id to string in response', async () => {
      mockUpdateEvent.mockResolvedValue(makeUpdatedEvent({ id: 42 }));

      const result = await callHandler({
        event_id: '42',
        name: 'Updated',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as { event: Record<string, unknown> };
      expect(data.event.id).toBe('42');
    });

    it('allows moving_time of zero', async () => {
      mockUpdateEvent.mockResolvedValue(makeUpdatedEvent({ moving_time: 0 }));

      const result = await callHandler({
        event_id: '200',
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

    it('returns error when event does not exist (404)', async () => {
      mockUpdateEvent.mockRejectedValue(
        new IntervalsApiError('Intervals.icu API error: 404 - Not found', 404, 'API_ERROR')
      );

      const result = await callHandler({
        event_id: '99999',
        name: 'Updated Name',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('API_ERROR');
      expect(result.error).toContain('404');
    });

    it('returns error for INVALID_CREDENTIALS (401)', async () => {
      mockUpdateEvent.mockRejectedValue(
        new IntervalsApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
      );

      const result = await callHandler({
        event_id: '200',
        name: 'Updated',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns error for RATE_LIMITED (429)', async () => {
      mockUpdateEvent.mockRejectedValue(
        new IntervalsApiError('Rate limit exceeded', 429, 'RATE_LIMITED')
      );

      const result = await callHandler({
        event_id: '200',
        name: 'Updated',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('RATE_LIMITED');
    });

    it('returns error for API_ERROR (500)', async () => {
      mockUpdateEvent.mockRejectedValue(
        new IntervalsApiError('Server error: 500', 500, 'API_ERROR')
      );

      const result = await callHandler({
        event_id: '200',
        name: 'Updated',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('API_ERROR');
    });

    it('returns error for NETWORK_ERROR', async () => {
      mockUpdateEvent.mockRejectedValue(new IntervalsApiError('Network error', 0, 'NETWORK_ERROR'));

      const result = await callHandler({
        event_id: '200',
        name: 'Updated',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('returns generic error for non-IntervalsApiError', async () => {
      mockUpdateEvent.mockRejectedValue(new Error('Unexpected failure'));

      const result = await callHandler({
        event_id: '200',
        name: 'Updated',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('UPDATE_EVENT_ERROR');
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
      mockUpdateEvent.mockResolvedValue(
        makeUpdatedEvent({
          id: 42,
          name: 'Tempo Run',
          type: 'WORKOUT',
          category: 'Run',
          moving_time: 2700,
          icu_training_load: 65,
          distance: 10000,
          indoor: false,
          event_priority: 'A',
        })
      );

      const result = await callHandler({
        event_id: '42',
        name: 'Tempo Run',
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
      expect(data.event).toHaveProperty('event_priority', 'A');
      expect(data.message).toContain('Tempo Run');
      expect(data.message).toContain('updated successfully');
    });
  });
});
