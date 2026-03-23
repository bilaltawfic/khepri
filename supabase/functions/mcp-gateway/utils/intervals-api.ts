import type { IntervalsCredentials } from './credentials.ts';

const INTERVALS_BASE_URL = 'https://intervals.icu/api/v1';

/**
 * Build the common Authorization header value.
 * Uses Basic auth with API_KEY:{apiKey} per Intervals.icu docs.
 */
function authHeader(credentials: IntervalsCredentials): string {
  const token = btoa(`API_KEY:${credentials.apiKey}`);
  return `Basic ${token}`;
}

/**
 * Handle error responses from the Intervals.icu API.
 * Throws an IntervalsApiError with a machine-readable code.
 */
async function handleErrorResponse(response: Response): Promise<never> {
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

/**
 * Parse a JSON response body, throwing on invalid JSON.
 */
async function parseJsonResponse<T>(response: Response): Promise<T> {
  try {
    return await response.json();
  } catch {
    throw new IntervalsApiError(
      'Intervals.icu returned invalid JSON',
      response.status,
      'API_ERROR'
    );
  }
}

/**
 * Make an authenticated GET request to the Intervals.icu API.
 * Uses Basic auth with API_KEY:{apiKey} per Intervals.icu docs.
 */
async function intervalsRequest<T>(
  credentials: IntervalsCredentials,
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const encodedId = encodeURIComponent(credentials.intervalsAthleteId);
  const url = new URL(`${INTERVALS_BASE_URL}/athlete/${encodedId}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader(credentials),
        Accept: 'application/json',
      },
    });
  } catch (err) {
    throw new IntervalsApiError(
      `Intervals.icu network error: ${err instanceof Error ? err.message : 'connection failed'}`,
      0,
      'NETWORK_ERROR'
    );
  }

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return parseJsonResponse<T>(response);
}

/**
 * Make an authenticated POST or PUT request to the Intervals.icu API.
 */
async function intervalsRequestWithBody<T>(
  credentials: IntervalsCredentials,
  method: 'POST' | 'PUT',
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const encodedId = encodeURIComponent(credentials.intervalsAthleteId);
  const url = new URL(`${INTERVALS_BASE_URL}/athlete/${encodedId}${endpoint}`);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: authHeader(credentials),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new IntervalsApiError(
      `Intervals.icu network error: ${err instanceof Error ? err.message : 'connection failed'}`,
      0,
      'NETWORK_ERROR'
    );
  }

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return parseJsonResponse<T>(response);
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
// Credential validation
// ====================================================================

/**
 * Validate Intervals.icu credentials by fetching the athlete profile.
 * Throws IntervalsApiError on invalid/expired credentials, rate limiting,
 * generic API errors (e.g. 4xx/5xx such as 404/500), or network errors.
 */
export async function validateIntervalsCredentials(
  credentials: IntervalsCredentials
): Promise<void> {
  const encodedAthleteId = encodeURIComponent(credentials.intervalsAthleteId);
  const url = `${INTERVALS_BASE_URL}/athlete/${encodedAthleteId}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: authHeader(credentials),
        Accept: 'application/json',
      },
    });
  } catch (err) {
    throw new IntervalsApiError(
      `Intervals.icu network error: ${err instanceof Error ? err.message : 'connection failed'}`,
      0,
      'NETWORK_ERROR'
    );
  }

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  // Ensure the response body is valid JSON so that malformed 2xx
  // responses do not cause invalid credentials to be accepted.
  try {
    await response.json();
  } catch {
    throw new IntervalsApiError(
      'Intervals.icu returned invalid JSON while validating credentials',
      response.status,
      'API_ERROR'
    );
  }
}

// ====================================================================
// Athlete Profile
// ====================================================================

export interface IntervalsAthleteProfile {
  readonly id: string;
  readonly ftp?: number;
  readonly lthr?: number;
  readonly run_ftp?: number; // running threshold pace (sec/km)
  readonly swim_ftp?: number; // CSS (sec/100m)
  readonly resting_hr?: number;
  readonly max_hr?: number;
}

/** Raw sport settings entry from the Intervals.icu API. */
interface SportSettings {
  readonly types: string[];
  readonly ftp?: number | null;
  readonly lthr?: number | null;
  readonly max_hr?: number | null;
  readonly threshold_pace?: number | null; // m/s for running, m/s for swimming
  readonly pace_units?: string | null; // e.g. 'MINS_KM', 'SECS_100M'
}

/** Raw athlete response from the Intervals.icu API. */
interface RawAthleteResponse {
  readonly id: string;
  readonly icu_resting_hr?: number | null;
  readonly sportSettings?: SportSettings[];
}

const CYCLING_TYPES = ['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide', 'TrackRide'];
const RUNNING_TYPES = ['Run', 'VirtualRun', 'TrailRun'];
const SWIMMING_TYPES = ['Swim', 'OpenWaterSwim'];

function findSportSettings(
  settings: SportSettings[],
  targetTypes: string[]
): SportSettings | undefined {
  return settings.find((s) => s.types.some((t) => targetTypes.includes(t)));
}

/**
 * Convert running threshold pace from m/s to sec/km.
 * Intervals.icu stores running pace as speed in m/s.
 */
function runPaceMsToSecPerKm(speedMs: number): number | undefined {
  if (speedMs <= 0) return undefined;
  return Math.round(1000 / speedMs);
}

/**
 * Convert swim threshold pace from m/s to sec/100m.
 * Intervals.icu stores swim pace as speed in m/s.
 */
function swimPaceMsToSecPer100m(speedMs: number): number | undefined {
  if (speedMs <= 0) return undefined;
  return Math.round(100 / speedMs);
}

/**
 * Fetch athlete profile from Intervals.icu and extract fitness thresholds.
 * API endpoint: GET /api/v1/athlete/{id}
 *
 * The API stores thresholds in two places:
 * - Top-level: `icu_resting_hr`
 * - `sportSettings` array: per-sport `ftp`, `lthr`, `max_hr`, `threshold_pace`
 */
export async function fetchAthleteProfile(
  credentials: IntervalsCredentials
): Promise<IntervalsAthleteProfile> {
  const raw = await intervalsRequest<RawAthleteResponse>(credentials, '');
  const settings = raw.sportSettings ?? [];

  const cycling = findSportSettings(settings, CYCLING_TYPES);
  const running = findSportSettings(settings, RUNNING_TYPES);
  const swimming = findSportSettings(settings, SWIMMING_TYPES);

  return {
    id: raw.id,
    ftp: cycling?.ftp ?? undefined,
    lthr: cycling?.lthr ?? undefined,
    max_hr: cycling?.max_hr ?? undefined,
    resting_hr: raw.icu_resting_hr ?? undefined,
    run_ftp:
      running?.threshold_pace == null ? undefined : runPaceMsToSecPerKm(running.threshold_pace),
    swim_ftp:
      swimming?.threshold_pace == null
        ? undefined
        : swimPaceMsToSecPer100m(swimming.threshold_pace),
  };
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
  readonly sleepQuality?: number; // 1-4 scale: 1=Great, 4=Poor
  readonly sleepScore?: number; // 0-100 device-reported score
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

/** Input shape for creating events via the Intervals.icu API. */
export interface CreateEventInput {
  readonly name: string;
  readonly type: string;
  readonly start_date_local: string;
  readonly end_date_local?: string;
  readonly description?: string;
  readonly category?: string;
  readonly moving_time?: number;
  readonly icu_training_load?: number;
  readonly distance?: number;
  readonly indoor?: boolean;
  readonly event_priority?: string;
}

/**
 * Create a new event on the athlete's Intervals.icu calendar.
 * API endpoint: POST /api/v1/athlete/{id}/events
 */
export async function createEvent(
  credentials: IntervalsCredentials,
  event: CreateEventInput
): Promise<IntervalsEvent> {
  return intervalsRequestWithBody<IntervalsEvent>(credentials, 'POST', '/events', { ...event });
}

/** Input shape for updating events via the Intervals.icu API. */
export interface UpdateEventInput {
  readonly name?: string;
  readonly type?: string;
  readonly start_date_local?: string;
  readonly end_date_local?: string;
  readonly description?: string;
  readonly category?: string;
  readonly moving_time?: number;
  readonly icu_training_load?: number;
  readonly distance?: number;
  readonly indoor?: boolean;
  readonly event_priority?: string;
}

/**
 * Update an existing event on the athlete's Intervals.icu calendar.
 * API endpoint: PUT /api/v1/athlete/{id}/events/{eventId}
 */
export async function updateEvent(
  credentials: IntervalsCredentials,
  eventId: string,
  updates: UpdateEventInput
): Promise<IntervalsEvent> {
  return intervalsRequestWithBody<IntervalsEvent>(
    credentials,
    'PUT',
    `/events/${encodeURIComponent(eventId)}`,
    {
      ...updates,
    }
  );
}
