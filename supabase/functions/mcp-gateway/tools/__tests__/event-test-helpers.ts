import { jest } from '@jest/globals';

/**
 * Local copy of IntervalsApiError for ESM module mocking.
 *
 * Intentionally duplicated from utils/intervals-api.ts because
 * jest.unstable_mockModule() requires the class defined before module
 * setup — importing from the real module would bypass the mock.
 *
 * COUPLING: If you change the constructor signature in intervals-api.ts,
 * you must update this copy to match.
 */
export class IntervalsApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'IntervalsApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const ATHLETE_ID = 'athlete-test-1';

/** Minimal mock SupabaseClient — handlers delegate DB work to getIntervalsCredentials. */
export const MOCK_SUPABASE = {} as never;

export const FAKE_CREDENTIALS = {
  intervalsAthleteId: 'i12345',
  apiKey: 'test-key',
};

/** Factory for Intervals.icu API event response objects. */
export function makeEventResponse(overrides?: Record<string, unknown>) {
  return {
    id: 200,
    name: 'Test Event',
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

/**
 * Set up ESM module mocks for credentials and an API function.
 * Returns the mock functions for assertions.
 */
export function setupEventMocks(apiModuleExports: Record<string, unknown>) {
  const mockGetIntervalsCredentials = jest.fn<() => Promise<unknown>>();

  jest.unstable_mockModule('../../utils/credentials.ts', () => ({
    getIntervalsCredentials: mockGetIntervalsCredentials,
  }));

  jest.unstable_mockModule('../../utils/intervals-api.ts', () => ({
    IntervalsApiError,
    ...apiModuleExports,
  }));

  return { mockGetIntervalsCredentials };
}

/** Result data shape for event tool responses. */
export interface EventResultData {
  readonly event: Record<string, unknown>;
  readonly message: string;
}

/**
 * Shared error handling tests for event tools.
 * Call this with the mock API function and a callHandler function.
 */
export function describeApiErrorHandling(
  mockApiFn: jest.Mock<() => Promise<unknown>>,
  callHandler: (
    input: Record<string, unknown>
  ) => Promise<{ success: boolean; error?: string; code?: string }>,
  errorCode: string,
  validInput: Record<string, unknown>
) {
  it('returns error for INVALID_CREDENTIALS (401)', async () => {
    mockApiFn.mockRejectedValue(
      new IntervalsApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    );
    const result = await callHandler(validInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns error for RATE_LIMITED (429)', async () => {
    mockApiFn.mockRejectedValue(new IntervalsApiError('Rate limit exceeded', 429, 'RATE_LIMITED'));
    const result = await callHandler(validInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('RATE_LIMITED');
  });

  it('returns error for API_ERROR (500)', async () => {
    mockApiFn.mockRejectedValue(new IntervalsApiError('Server error: 500', 500, 'API_ERROR'));
    const result = await callHandler(validInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('API_ERROR');
  });

  it('returns error for NETWORK_ERROR', async () => {
    mockApiFn.mockRejectedValue(new IntervalsApiError('Network error', 0, 'NETWORK_ERROR'));
    const result = await callHandler(validInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('NETWORK_ERROR');
  });

  it('returns generic error for non-IntervalsApiError', async () => {
    mockApiFn.mockRejectedValue(new Error('Unexpected failure'));
    const result = await callHandler(validInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe(errorCode);
    expect(result.error).toBe('Unexpected failure');
  });
}
