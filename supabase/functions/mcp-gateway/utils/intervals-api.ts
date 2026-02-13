import type { IntervalsCredentials } from './credentials.ts';

const INTERVALS_BASE_URL = 'https://intervals.icu/api/v1';

/**
 * Make an authenticated request to the Intervals.icu API.
 * Uses Basic auth with API_KEY:{apiKey} per Intervals.icu docs.
 */
async function intervalsRequest<T>(
  credentials: IntervalsCredentials,
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${INTERVALS_BASE_URL}/athlete/${credentials.intervalsAthleteId}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${btoa(`API_KEY:${credentials.apiKey}`)}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new IntervalsApiError(
        'Invalid or expired Intervals.icu credentials',
        response.status,
        'INVALID_CREDENTIALS'
      );
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new IntervalsApiError(
        `Intervals.icu rate limit exceeded${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`,
        response.status,
        'RATE_LIMITED'
      );
    }
    const text = await response.text();
    throw new IntervalsApiError(
      `Intervals.icu API error: ${response.status} - ${text}`,
      response.status,
      'API_ERROR'
    );
  }

  return response.json();
}

/**
 * Custom error class for Intervals.icu API errors.
 * Carries a machine-readable code for upstream error handling.
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

// ====================================================================
// Activities
// ====================================================================

export interface IntervalsActivity {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly start_date_local: string;
  readonly moving_time: number; // seconds
  readonly distance?: number; // meters
  readonly icu_training_load?: number; // TSS equivalent
  readonly icu_ctl?: number;
  readonly icu_atl?: number;
}

/**
 * Fetch activities from Intervals.icu.
 * API endpoint: GET /api/v1/athlete/{id}/activities
 */
export async function fetchActivities(
  credentials: IntervalsCredentials,
  options: { readonly oldest?: string; readonly newest?: string }
): Promise<IntervalsActivity[]> {
  const params: Record<string, string> = {};
  if (options.oldest != null) params.oldest = options.oldest;
  if (options.newest != null) params.newest = options.newest;

  return intervalsRequest<IntervalsActivity[]>(credentials, '/activities', params);
}

// ====================================================================
// Wellness
// ====================================================================

export interface IntervalsWellness {
  readonly id: string; // date string YYYY-MM-DD
  readonly ctl: number;
  readonly atl: number;
  readonly rampRate?: number;
  readonly restingHR?: number;
  readonly hrv?: number;
  readonly hrvSDNN?: number;
  readonly sleepSecs?: number;
  readonly sleepQuality?: number;
  readonly weight?: number;
  readonly fatigue?: number;
  readonly soreness?: number;
  readonly stress?: number;
  readonly mood?: number;
}

/**
 * Fetch wellness data from Intervals.icu.
 * API endpoint: GET /api/v1/athlete/{id}/wellness
 */
export async function fetchWellness(
  credentials: IntervalsCredentials,
  options: { readonly oldest?: string; readonly newest?: string }
): Promise<IntervalsWellness[]> {
  const params: Record<string, string> = {};
  if (options.oldest != null) params.oldest = options.oldest;
  if (options.newest != null) params.newest = options.newest;

  return intervalsRequest<IntervalsWellness[]>(credentials, '/wellness', params);
}

// ====================================================================
// Events
// ====================================================================

export interface IntervalsEvent {
  readonly id: number;
  readonly name: string;
  readonly description?: string;
  readonly start_date_local: string;
  readonly end_date_local?: string;
  readonly type: string; // WORKOUT, NOTE, RACE, etc.
  readonly category?: string; // Ride, Run, Swim, etc.
  readonly moving_time?: number; // seconds (planned)
  readonly icu_training_load?: number; // planned TSS
  readonly distance?: number; // meters (planned)
  readonly indoor?: boolean;
  readonly event_priority?: string; // A, B, C
}

/**
 * Fetch calendar events from Intervals.icu.
 * API endpoint: GET /api/v1/athlete/{id}/events
 */
export async function fetchEvents(
  credentials: IntervalsCredentials,
  options: { readonly oldest?: string; readonly newest?: string }
): Promise<IntervalsEvent[]> {
  const params: Record<string, string> = {};
  if (options.oldest != null) params.oldest = options.oldest;
  if (options.newest != null) params.newest = options.newest;

  return intervalsRequest<IntervalsEvent[]>(credentials, '/events', params);
}
