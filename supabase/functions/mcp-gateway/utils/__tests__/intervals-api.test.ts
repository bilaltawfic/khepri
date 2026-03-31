import { jest } from '@jest/globals';
import {
  IntervalsApiError,
  createEvent,
  fetchActivities,
  fetchAthleteProfile,
  fetchEvents,
  fetchWellness,
  updateEvent,
  validateIntervalsCredentials,
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

  it('omits undefined query params', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, []));

    await fetchEvents(CREDENTIALS, {});

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).not.toContain('oldest');
    expect(calledUrl).not.toContain('newest');
  });

  it('throws INVALID_CREDENTIALS for 401', async () => {
    mockFetch.mockResolvedValue(mockResponse(401, 'Unauthorized'));
    await expect(fetchEvents(CREDENTIALS, {})).rejects.toThrow(IntervalsApiError);
  });

  it('throws RATE_LIMITED for 429', async () => {
    mockFetch.mockResolvedValue(mockResponse(429, 'Rate limited'));
    await expect(fetchEvents(CREDENTIALS, {})).rejects.toThrow(IntervalsApiError);
  });

  it('throws API_ERROR for 500', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, 'Server Error'));
    await expect(fetchEvents(CREDENTIALS, {})).rejects.toThrow(IntervalsApiError);
  });

  it('throws NETWORK_ERROR on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('DNS failed'));
    await expect(fetchEvents(CREDENTIALS, {})).rejects.toThrow(IntervalsApiError);
  });

  it('throws on invalid JSON', async () => {
    const badResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => {
        throw new SyntaxError('bad json');
      },
    } as unknown as Response;
    mockFetch.mockResolvedValue(badResponse);
    await expect(fetchEvents(CREDENTIALS, {})).rejects.toThrow(IntervalsApiError);
  });

  it('includes Authorization header with Basic auth', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, []));
    await fetchEvents(CREDENTIALS, {});
    const callHeaders = (mockFetch.mock.calls[0]?.[1] as RequestInit | undefined)?.headers as
      | Record<string, string>
      | undefined;
    expect(callHeaders?.Authorization).toMatch(/^Basic /);
    expect(callHeaders?.Accept).toBe('application/json');
  });

  it('handles non-Error throw in fetch', async () => {
    mockFetch.mockRejectedValue('string error');
    await expect(fetchEvents(CREDENTIALS, {})).rejects.toThrow(IntervalsApiError);
    try {
      await fetchEvents(CREDENTIALS, {});
    } catch (err) {
      expect((err as IntervalsApiError).message).toContain('connection failed');
    }
  });

  it('includes retry-after in RATE_LIMITED message when header present', async () => {
    mockFetch.mockResolvedValue(mockResponse(429, 'Rate limited', { 'Retry-After': '30' }));
    try {
      await fetchEvents(CREDENTIALS, {});
    } catch (err) {
      expect((err as IntervalsApiError).message).toContain('retry after 30s');
    }
  });
});

describe('fetchActivities (GET)', () => {
  it('sends GET request to activities endpoint', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, []));

    await fetchActivities(CREDENTIALS, { oldest: '2026-02-01' });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('/activities');
    expect(calledUrl).toContain('oldest=2026-02-01');
  });

  it('throws on error responses', async () => {
    mockFetch.mockResolvedValue(mockResponse(403, 'Forbidden'));
    await expect(fetchActivities(CREDENTIALS, {})).rejects.toThrow(IntervalsApiError);
  });
});

describe('fetchWellness (GET)', () => {
  it('sends GET request to wellness endpoint', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, []));

    await fetchWellness(CREDENTIALS, { newest: '2026-02-28' });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('/wellness');
    expect(calledUrl).toContain('newest=2026-02-28');
  });

  it('throws on error responses', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, 'Error'));
    await expect(fetchWellness(CREDENTIALS, {})).rejects.toThrow(IntervalsApiError);
  });
});

describe('fetchAthleteProfile', () => {
  const RAW_PROFILE = {
    id: 'i12345',
    icu_resting_hr: 39,
    sportSettings: [
      {
        types: ['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide', 'TrackRide'],
        ftp: 193,
        lthr: 172,
        max_hr: 190,
        threshold_pace: null,
        pace_units: null,
      },
      {
        types: ['Run', 'VirtualRun', 'TrailRun'],
        ftp: null,
        lthr: 172,
        max_hr: 190,
        threshold_pace: 3.663,
        pace_units: 'MINS_KM',
      },
      {
        types: ['Swim', 'OpenWaterSwim'],
        ftp: null,
        lthr: 172,
        max_hr: 190,
        threshold_pace: 0.746,
        pace_units: 'SECS_100M',
      },
    ],
  };

  it('extracts cycling FTP, LTHR, max HR from sportSettings', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, RAW_PROFILE));

    const profile = await fetchAthleteProfile(CREDENTIALS);

    expect(profile.ftp).toBe(193);
    expect(profile.lthr).toBe(172);
    expect(profile.max_hr).toBe(190);
  });

  it('extracts icu_resting_hr from top level', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, RAW_PROFILE));

    const profile = await fetchAthleteProfile(CREDENTIALS);

    expect(profile.resting_hr).toBe(39);
  });

  it('converts running threshold pace from m/s to sec/km', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, RAW_PROFILE));

    const profile = await fetchAthleteProfile(CREDENTIALS);

    // 3.663 m/s → 1000/3.663 ≈ 273 sec/km
    expect(profile.run_ftp).toBe(273);
  });

  it('converts swim threshold pace from m/s to sec/100m', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, RAW_PROFILE));

    const profile = await fetchAthleteProfile(CREDENTIALS);

    // 0.746 m/s → 100/0.746 ≈ 134 sec/100m
    expect(profile.swim_ftp).toBe(134);
  });

  it('returns undefined for missing fields', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'i12345', sportSettings: [] }));

    const profile = await fetchAthleteProfile(CREDENTIALS);

    expect(profile.ftp).toBeUndefined();
    expect(profile.lthr).toBeUndefined();
    expect(profile.max_hr).toBeUndefined();
    expect(profile.resting_hr).toBeUndefined();
    expect(profile.run_ftp).toBeUndefined();
    expect(profile.swim_ftp).toBeUndefined();
  });

  it('handles missing sportSettings array', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'i12345' }));

    const profile = await fetchAthleteProfile(CREDENTIALS);

    expect(profile.id).toBe('i12345');
    expect(profile.ftp).toBeUndefined();
  });
});

describe('validateIntervalsCredentials', () => {
  it('resolves when credentials are valid (200)', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'i12345', name: 'Test Athlete' }));

    await expect(validateIntervalsCredentials(CREDENTIALS)).resolves.toBeUndefined();

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toBe('https://intervals.icu/api/v1/athlete/i12345');
  });

  it('throws INVALID_CREDENTIALS for 401', async () => {
    mockFetch.mockResolvedValue(mockResponse(401, 'Unauthorized'));

    await expect(validateIntervalsCredentials(CREDENTIALS)).rejects.toThrow(IntervalsApiError);
    try {
      await validateIntervalsCredentials(CREDENTIALS);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('throws INVALID_CREDENTIALS for 403', async () => {
    mockFetch.mockResolvedValue(mockResponse(403, 'Forbidden'));

    await expect(validateIntervalsCredentials(CREDENTIALS)).rejects.toThrow(IntervalsApiError);
    try {
      await validateIntervalsCredentials(CREDENTIALS);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('throws RATE_LIMITED for 429', async () => {
    mockFetch.mockResolvedValue(mockResponse(429, 'Too many requests'));

    await expect(validateIntervalsCredentials(CREDENTIALS)).rejects.toThrow(IntervalsApiError);
    try {
      await validateIntervalsCredentials(CREDENTIALS);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('RATE_LIMITED');
    }
  });

  it('throws NETWORK_ERROR on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    await expect(validateIntervalsCredentials(CREDENTIALS)).rejects.toThrow(IntervalsApiError);
    try {
      await validateIntervalsCredentials(CREDENTIALS);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('NETWORK_ERROR');
    }
  });

  it('throws API_ERROR for 500', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, 'Internal Server Error'));

    await expect(validateIntervalsCredentials(CREDENTIALS)).rejects.toThrow(IntervalsApiError);
    try {
      await validateIntervalsCredentials(CREDENTIALS);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('API_ERROR');
    }
  });

  it('includes Authorization header with Basic auth', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'i12345' }));

    await validateIntervalsCredentials(CREDENTIALS);

    const callHeaders = (mockFetch.mock.calls[0]?.[1] as RequestInit | undefined)?.headers as
      | Record<string, string>
      | undefined;
    expect(callHeaders?.Authorization).toMatch(/^Basic /);
  });

  it('URL-encodes the athlete ID to prevent path injection', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: 'i12345' }));

    await validateIntervalsCredentials({
      intervalsAthleteId: '../admin',
      apiKey: 'test-key',
    });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toBe('https://intervals.icu/api/v1/athlete/..%2Fadmin');
  });

  it('throws API_ERROR when 200 response has invalid JSON body', async () => {
    const badResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => 'not json',
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as Response;
    mockFetch.mockResolvedValue(badResponse);

    await expect(validateIntervalsCredentials(CREDENTIALS)).rejects.toThrow(IntervalsApiError);
    try {
      await validateIntervalsCredentials(CREDENTIALS);
    } catch (err) {
      expect((err as IntervalsApiError).code).toBe('API_ERROR');
      expect((err as IntervalsApiError).statusCode).toBe(200);
    }
  });
});
