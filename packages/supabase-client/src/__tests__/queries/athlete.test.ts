/**
 * Tests for athlete query functions
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AthleteRow, KhepriSupabaseClient } from '../../types.js';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Create chainable mock functions
// Each mock returns the next in the chain, with mockSingle at the end
const mockSingle =
  jest.fn<() => Promise<{ data: AthleteRow | null; error: { message: string } | null }>>();

// Select chain for selects after eq (used in update().eq().select().single())
const mockSelectAfterEq = jest.fn(() => ({ single: mockSingle }));

// Eq returns both select (for updates) and single (for selects)
const mockEq = jest.fn(() => ({ select: mockSelectAfterEq, single: mockSingle }));

// Select returns eq (for queries) and single (for insert...select)
const mockSelect = jest.fn(() => ({ eq: mockEq, single: mockSingle }));

// Insert returns select chain
const mockInsert = jest.fn(() => ({ select: mockSelect }));

// Update returns eq chain
const mockUpdate = jest.fn(() => ({ eq: mockEq }));

// From returns all query starters
const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}));

// Type assertion for mock client
const mockClient = {
  from: mockFrom,
} as unknown as KhepriSupabaseClient;

// Import module under test
import {
  createAthlete,
  getAthleteByAuthUser,
  getAthleteById,
  getAthleteFitnessNumbers,
  updateAthlete,
  updateIntervalsConnection,
} from '../../queries/athlete.js';

// =============================================================================
// TEST DATA
// =============================================================================

const mockAthleteRow: AthleteRow = {
  id: 'athlete-123',
  auth_user_id: 'auth-user-456',
  display_name: 'Test Athlete',
  date_of_birth: '1990-01-15',
  weight_kg: 70,
  height_cm: 175,
  ftp_watts: 250,
  running_threshold_pace_sec_per_km: 270,
  css_sec_per_100m: 95,
  resting_heart_rate: 50,
  max_heart_rate: 185,
  lthr: 165,
  preferred_units: 'metric',
  timezone: 'America/New_York',
  daily_checkin_time: '07:00:00',
  intervals_icu_athlete_id: null,
  intervals_icu_connected: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// =============================================================================
// TESTS
// =============================================================================

describe('getAthleteByAuthUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns athlete when found', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockAthleteRow, error: null });

    const result = await getAthleteByAuthUser(mockClient, 'auth-user-456');

    expect(mockFrom).toHaveBeenCalledWith('athletes');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('auth_user_id', 'auth-user-456');
    expect(result.data).toEqual(mockAthleteRow);
    expect(result.error).toBeNull();
  });

  it('returns null when not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await getAthleteByAuthUser(mockClient, 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Row not found');
  });

  it('returns error on database failure', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection error' },
    });

    const result = await getAthleteByAuthUser(mockClient, 'auth-user-456');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Database connection error');
  });
});

describe('getAthleteById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns athlete when found', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockAthleteRow, error: null });

    const result = await getAthleteById(mockClient, 'athlete-123');

    expect(mockFrom).toHaveBeenCalledWith('athletes');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('id', 'athlete-123');
    expect(result.data).toEqual(mockAthleteRow);
    expect(result.error).toBeNull();
  });

  it('returns null when not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await getAthleteById(mockClient, 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});

describe('createAthlete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and returns new athlete', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockAthleteRow, error: null });

    const result = await createAthlete(mockClient, {
      auth_user_id: 'auth-user-456',
      display_name: 'Test Athlete',
    });

    expect(mockFrom).toHaveBeenCalledWith('athletes');
    expect(mockInsert).toHaveBeenCalledWith({
      auth_user_id: 'auth-user-456',
      display_name: 'Test Athlete',
    });
    expect(result.data).toEqual(mockAthleteRow);
    expect(result.error).toBeNull();
  });

  it('returns error on duplicate auth_user_id', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key value violates unique constraint' },
    });

    const result = await createAthlete(mockClient, {
      auth_user_id: 'existing-user',
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('duplicate key');
  });
});

describe('updateAthlete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates and returns athlete', async () => {
    const updatedAthlete = { ...mockAthleteRow, display_name: 'Updated Name' };
    mockSingle.mockResolvedValueOnce({ data: updatedAthlete, error: null });

    const result = await updateAthlete(mockClient, 'athlete-123', {
      display_name: 'Updated Name',
    });

    expect(mockFrom).toHaveBeenCalledWith('athletes');
    expect(mockUpdate).toHaveBeenCalledWith({ display_name: 'Updated Name' });
    expect(mockEq).toHaveBeenCalledWith('id', 'athlete-123');
    expect(result.data?.display_name).toBe('Updated Name');
    expect(result.error).toBeNull();
  });

  it('returns error when athlete not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await updateAthlete(mockClient, 'nonexistent', {
      display_name: 'New Name',
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});

describe('getAthleteFitnessNumbers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns fitness metrics', async () => {
    const fitnessData = {
      ftp_watts: 250,
      running_threshold_pace_sec_per_km: 270,
      css_sec_per_100m: 95,
      resting_heart_rate: 50,
      max_heart_rate: 185,
      lthr: 165,
    };
    mockSingle.mockResolvedValueOnce({ data: fitnessData, error: null });

    const result = await getAthleteFitnessNumbers(mockClient, 'athlete-123');

    expect(mockFrom).toHaveBeenCalledWith('athletes');
    expect(mockSelect).toHaveBeenCalledWith(
      'ftp_watts, running_threshold_pace_sec_per_km, css_sec_per_100m, resting_heart_rate, max_heart_rate, lthr'
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'athlete-123');
    expect(result.data).toEqual(fitnessData);
    expect(result.error).toBeNull();
  });

  it('returns null values for unset metrics', async () => {
    const partialFitnessData = {
      ftp_watts: 250,
      running_threshold_pace_sec_per_km: null,
      css_sec_per_100m: null,
      resting_heart_rate: 50,
      max_heart_rate: 185,
      lthr: null,
    };
    mockSingle.mockResolvedValueOnce({ data: partialFitnessData, error: null });

    const result = await getAthleteFitnessNumbers(mockClient, 'athlete-123');

    expect(result.data?.ftp_watts).toBe(250);
    expect(result.data?.css_sec_per_100m).toBeNull();
    expect(result.error).toBeNull();
  });
});

describe('updateIntervalsConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates connection status to connected', async () => {
    const connectedAthlete = {
      ...mockAthleteRow,
      intervals_icu_connected: true,
      intervals_icu_athlete_id: 'i12345',
    };
    mockSingle.mockResolvedValueOnce({ data: connectedAthlete, error: null });

    const result = await updateIntervalsConnection(mockClient, 'athlete-123', true, 'i12345');

    expect(mockFrom).toHaveBeenCalledWith('athletes');
    expect(mockUpdate).toHaveBeenCalledWith({
      intervals_icu_connected: true,
      intervals_icu_athlete_id: 'i12345',
    });
    expect(result.data?.intervals_icu_connected).toBe(true);
    expect(result.data?.intervals_icu_athlete_id).toBe('i12345');
    expect(result.error).toBeNull();
  });

  it('clears athlete ID when disconnecting', async () => {
    const disconnectedAthlete = {
      ...mockAthleteRow,
      intervals_icu_connected: false,
      intervals_icu_athlete_id: null,
    };
    mockSingle.mockResolvedValueOnce({ data: disconnectedAthlete, error: null });

    const result = await updateIntervalsConnection(mockClient, 'athlete-123', false);

    expect(mockUpdate).toHaveBeenCalledWith({
      intervals_icu_connected: false,
      intervals_icu_athlete_id: null,
    });
    expect(result.data?.intervals_icu_connected).toBe(false);
    expect(result.data?.intervals_icu_athlete_id).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error on failure', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Update failed' },
    });

    const result = await updateIntervalsConnection(mockClient, 'nonexistent', true, 'i12345');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Update failed');
  });
});
