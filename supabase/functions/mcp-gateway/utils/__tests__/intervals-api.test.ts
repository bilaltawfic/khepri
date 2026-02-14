import { jest } from '@jest/globals';
import {
  IntervalsApiError,
  createEvent,
  fetchActivities,
  fetchEvents,
  fetchWellness,
  updateEvent,
} from '../intervals-api.ts';

// =============================================================================
// Mock fetch globally
// =============================================================================

const mockFetch = jest.fn<typeof globalThis.fetch>();

beforeAll(() => {
  globalThis.fetch = mockFetch;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// Helpers
// =============================================================================

const CREDENTIALS = {
  intervalsAthleteId: 'i12345',
  apiKey: 'test-api-key',
};

function mockResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => body,
  } as Response;
}

// =============================================================================
// Tests
// =============================================================================

describe('IntervalsApiError', () => {
  it('has correct name, statusCode, and code', () => {
    const error = new IntervalsApiError('test message', 401, 'INVALID_CREDENTIALS');
    expect(error.name).toBe('IntervalsApiError');
    expect(error.message).toBe('test message');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('INVALID_CREDENTIALS');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('createEvent', () => {
  const eventInput = {
    name: 'Test Ride',
    type: 'WORKOUT',
    start_date_local: '2026-02-20T07:00:00',
  };

  it('sends POST request with correct URL and body', async () => {
    const responseEvent = { id: 42, ...eventInput };
    mockFetch.mockResolvedValue(mockResponse(200, responseEvent));

    const result = await createEvent(CREDENTIALS, eventInput);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/athlete/i12345/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(eventInput),
      })
    );
    expect(result).toEqual(responseEvent);
  });

  it('includes correct auth and content-type headers', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 1 }));

    await createEvent(CREDENTIALS, eventInput);

    const callHeaders = (mockFetch.mock.calls[0]?.[1] as RequestInit | undefined)?.headers as
      | Record<string, string>
      | undefined;
    expect(callHeaders?.Authorization).toMatch(/^Basic /);
    expect(callHeaders?.['Content-Type']).toBe('application/json');
  });

  it('throws INVALID_CREDENTIALS for 401', async () => {
    mockFetch.mockResolvedValue(mockResponse(401, 'Unauthorized'));

    await expect(createEvent(CREDENTIALS, eventInput)).rejects.toThrow(IntervalsApiError);
    try {
      await createEvent(CREDENTIALS, eventInput);
    } catch (err) {
      expect(err).toBeInstanceOf(IntervalsApiError);
      expect((err as IntervalsApiError).code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('throws RATE_LIMITED for 429', async () => {
    mockFetch.mockResolvedValue(mockResponse(429, 'Too many requests', { 'Retry-After': '60' }));

    await expect(createEvent(CREDENTIALS, eventInput)).rejects.toThrow(IntervalsApiError);
    try {
      await createEvent(CREDENTIALS, eventInput);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('RATE_LIMITED');
    }
  });

  it('throws API_ERROR for 500', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, 'Internal Server Error'));

    await expect(createEvent(CREDENTIALS, eventInput)).rejects.toThrow(IntervalsApiError);
    try {
      await createEvent(CREDENTIALS, eventInput);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('API_ERROR');
    }
  });

  it('throws NETWORK_ERROR on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    await expect(createEvent(CREDENTIALS, eventInput)).rejects.toThrow(IntervalsApiError);
    try {
      await createEvent(CREDENTIALS, eventInput);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('NETWORK_ERROR');
    }
  });

  it('throws API_ERROR on invalid JSON response', async () => {
    const badResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response;
    mockFetch.mockResolvedValue(badResponse);

    await expect(createEvent(CREDENTIALS, eventInput)).rejects.toThrow(IntervalsApiError);
    try {
      await createEvent(CREDENTIALS, eventInput);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('API_ERROR');
      expect((err as IntervalsApiError).message).toContain('invalid JSON');
    }
  });
});

describe('updateEvent', () => {
  const updates = { name: 'Updated Ride', moving_time: 7200 };

  it('sends PUT request with correct URL and body', async () => {
    const responseEvent = { id: 42, ...updates };
    mockFetch.mockResolvedValue(mockResponse(200, responseEvent));

    const result = await updateEvent(CREDENTIALS, '42', updates);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/athlete/i12345/events/42',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(updates),
      })
    );
    expect(result).toEqual(responseEvent);
  });

  it('throws INVALID_CREDENTIALS for 403', async () => {
    mockFetch.mockResolvedValue(mockResponse(403, 'Forbidden'));

    await expect(updateEvent(CREDENTIALS, '42', updates)).rejects.toThrow(IntervalsApiError);
    try {
      await updateEvent(CREDENTIALS, '42', updates);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('throws API_ERROR for 404', async () => {
    mockFetch.mockResolvedValue(mockResponse(404, 'Not found'));

    await expect(updateEvent(CREDENTIALS, '99999', updates)).rejects.toThrow(IntervalsApiError);
    try {
      await updateEvent(CREDENTIALS, '99999', updates);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('API_ERROR');
    }
  });

  it('throws NETWORK_ERROR on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('timeout'));

    await expect(updateEvent(CREDENTIALS, '42', updates)).rejects.toThrow(IntervalsApiError);
    try {
      await updateEvent(CREDENTIALS, '42', updates);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('NETWORK_ERROR');
    }
  });
});

describe('fetchEvents (GET)', () => {
  it('sends GET request with query params', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, []));

    await fetchEvents(CREDENTIALS, { oldest: '2026-02-01', newest: '2026-02-28' });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('oldest=2026-02-01');
    expect(calledUrl).toContain('newest=2026-02-28');
  });
});

describe('fetchActivities (GET)', () => {
  it('sends GET request to activities endpoint', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, []));

    await fetchActivities(CREDENTIALS, { oldest: '2026-02-01' });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('/activities');
  });
});

describe('fetchWellness (GET)', () => {
  it('sends GET request to wellness endpoint', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, []));

    await fetchWellness(CREDENTIALS, { newest: '2026-02-28' });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('/wellness');
  });
});
