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
const mockUpdateEvent = jest.fn<() => Promise<unknown>>();

jest.unstable_mockModule('../../utils/credentials.ts', () => ({
  getIntervalsCredentials: mockGetIntervalsCredentials,
}));

jest.unstable_mockModule('../../utils/intervals-api.ts', () => ({
  IntervalsApiError,
  updateEvent: mockUpdateEvent,
}));

const { updateEventTool } = await import('../update-event.ts');

// =============================================================================
// Helpers
// =============================================================================

async function callHandler(input: Record<string, unknown> = {}) {
  return updateEventTool.handler(input, ATHLETE_ID, MOCK_SUPABASE);
}

const VALID_INPUT = { event_id: '200', name: 'Updated' };

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
      const result = await callHandler({ name: 'Updated' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error when event_id is empty', async () => {
      const result = await callHandler({ event_id: '  ', name: 'Updated' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for invalid event type', async () => {
      const result = await callHandler({ event_id: '200', type: 'INVALID' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_EVENT_TYPE');
    });

    it('returns error for invalid date format', async () => {
      const result = await callHandler({ event_id: '200', start_date_local: 'bad' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_DATE');
    });

    it('returns error for invalid priority', async () => {
      const result = await callHandler({ event_id: '200', event_priority: 'Z' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_PRIORITY');
    });

    it('returns error when name is empty', async () => {
      const result = await callHandler({ event_id: '200', name: '  ' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for negative moving_time', async () => {
      const result = await callHandler({ event_id: '200', moving_time: -100 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for negative distance', async () => {
      const result = await callHandler({ event_id: '200', distance: -5000 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for negative icu_training_load', async () => {
      const result = await callHandler({ event_id: '200', icu_training_load: -10 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error when no update fields are provided', async () => {
      mockGetIntervalsCredentials.mockResolvedValue(FAKE_CREDENTIALS);
      const result = await callHandler({ event_id: '200' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('At least one field');
    });

    it('returns error for invalid end_date_local', async () => {
      const result = await callHandler({ event_id: '200', end_date_local: 'bad' });
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
  // Successful updates
  // ---------------------------------------------------------------------------
  describe('when credentials are configured', () => {
    beforeEach(() => {
      mockGetIntervalsCredentials.mockResolvedValue(FAKE_CREDENTIALS);
    });

    it('updates a single field', async () => {
      mockUpdateEvent.mockResolvedValue(makeEventResponse({ name: 'New Name' }));
      const result = await callHandler({ event_id: '200', name: 'New Name' });

      expect(mockUpdateEvent).toHaveBeenCalledWith(FAKE_CREDENTIALS, '200', { name: 'New Name' });
      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as EventResultData;
      expect(data.message).toContain('updated successfully');
    });

    it('updates multiple fields', async () => {
      mockUpdateEvent.mockResolvedValue(
        makeEventResponse({ name: 'Longer Ride', moving_time: 7200 })
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
      mockUpdateEvent.mockResolvedValue(makeEventResponse({ type: 'RACE' }));
      const result = await callHandler({ event_id: '200', type: 'RACE' });
      expect(mockUpdateEvent).toHaveBeenCalledWith(FAKE_CREDENTIALS, '200', { type: 'RACE' });
      expect(result.success).toBe(true);
    });

    it('updates date', async () => {
      mockUpdateEvent.mockResolvedValue(
        makeEventResponse({ start_date_local: '2026-02-25T08:00:00' })
      );
      const result = await callHandler({
        event_id: '200',
        start_date_local: '2026-02-25T08:00:00',
      });
      expect(result.success).toBe(true);
    });

    it('converts event id to string in response', async () => {
      mockUpdateEvent.mockResolvedValue(makeEventResponse({ id: 42 }));
      const result = await callHandler({ event_id: '42', name: 'Updated' });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect((result.data as EventResultData).event.id).toBe('42');
    });

    it('allows moving_time of zero', async () => {
      mockUpdateEvent.mockResolvedValue(makeEventResponse({ moving_time: 0 }));
      const result = await callHandler({ event_id: '200', moving_time: 0 });
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
      mockUpdateEvent.mockRejectedValue(new IntervalsApiError('Not found', 404, 'API_ERROR'));
      const result = await callHandler(VALID_INPUT);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('API_ERROR');
    });

    describeApiErrorHandling(mockUpdateEvent, callHandler, 'UPDATE_EVENT_ERROR', VALID_INPUT);
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
        makeEventResponse({ id: 42, name: 'Tempo Run', category: 'Run', event_priority: 'A' })
      );
      const result = await callHandler({ event_id: '42', name: 'Tempo Run' });
      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as EventResultData;
      expect(data.event).toHaveProperty('id', '42');
      expect(data.event).toHaveProperty('name', 'Tempo Run');
      expect(data.event).toHaveProperty('event_priority', 'A');
      expect(data.message).toContain('updated successfully');
    });
  });
});
