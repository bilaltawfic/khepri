/**
 * Tests for season query functions
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { KhepriSupabaseClient, SeasonRow } from '../../types.js';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockSingle =
  jest.fn<() => Promise<{ data: SeasonRow | null; error: { message: string } | null }>>();

const mockLimit =
  jest.fn<() => Promise<{ data: SeasonRow[] | null; error: { message: string } | null }>>();

const mockOrder =
  jest.fn<() => Promise<{ data: SeasonRow[] | null; error: { message: string } | null }>>();

const mockEq = jest.fn(() => ({
  eq: mockEq,
  order: mockOrder,
  select: jest.fn(() => ({ single: mockSingle })),
  single: mockSingle,
  limit: mockLimit,
}));

const mockSelect = jest.fn(() => ({
  eq: mockEq,
  single: mockSingle,
}));

const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }));
const mockUpdate = jest.fn(() => ({
  eq: jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) })),
}));

const mockFrom = jest.fn(() => ({
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
}));

const mockClient = {
  from: mockFrom,
} as unknown as KhepriSupabaseClient;

import {
  archiveSeasonRecord,
  completeSeasonRecord,
  createSeason,
  getActiveSeason,
  getAthleteSeasons,
  getSeasonById,
  updateSeason,
} from '../../queries/seasons.js';

// =============================================================================
// TEST DATA
// =============================================================================

const mockSeasonRow: SeasonRow = {
  id: 'season-123',
  athlete_id: 'athlete-456',
  name: '2026 Triathlon Season',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  status: 'active',
  preferences: {},
  skeleton: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// =============================================================================
// TESTS
// =============================================================================

describe('getActiveSeason', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the active season when one exists', async () => {
    mockLimit.mockResolvedValueOnce({ data: [mockSeasonRow], error: null });

    const result = await getActiveSeason(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('seasons');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockEq).toHaveBeenCalledWith('status', 'active');
    expect(mockLimit).toHaveBeenCalledWith(1);
    expect(result.data).toEqual(mockSeasonRow);
    expect(result.error).toBeNull();
  });

  it('returns null when no active season exists', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });

    const result = await getActiveSeason(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns null when data is null', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: null });

    const result = await getActiveSeason(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection timeout' },
    });

    const result = await getActiveSeason(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Connection timeout');
  });
});

describe('getSeasonById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns season when found', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockSeasonRow, error: null });

    const result = await getSeasonById(mockClient, 'season-123');

    expect(mockFrom).toHaveBeenCalledWith('seasons');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(result.data).toEqual(mockSeasonRow);
    expect(result.error).toBeNull();
  });

  it('returns error when not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await getSeasonById(mockClient, 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});

describe('getAthleteSeasons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns seasons ordered by start_date descending', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockSeasonRow], error: null });

    const result = await getAthleteSeasons(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('seasons');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockOrder).toHaveBeenCalledWith('start_date', { ascending: false });
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no seasons exist', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const result = await getAthleteSeasons(mockClient, 'athlete-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await getAthleteSeasons(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database error');
  });
});

describe('createSeason', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and returns new season', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockSeasonRow, error: null });

    const result = await createSeason(mockClient, {
      athlete_id: 'athlete-456',
      name: '2026 Triathlon Season',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    });

    expect(mockFrom).toHaveBeenCalledWith('seasons');
    expect(result.data).toEqual(mockSeasonRow);
    expect(result.error).toBeNull();
  });

  it('returns error on constraint violation', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key value violates unique constraint' },
    });

    const result = await createSeason(mockClient, {
      athlete_id: 'athlete-456',
      name: 'Duplicate Season',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('duplicate key');
  });
});

describe('updateSeason', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates and returns season', async () => {
    const updated = { ...mockSeasonRow, name: 'Updated Season' };
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });

    const result = await updateSeason(mockClient, 'season-123', { name: 'Updated Season' });

    expect(mockFrom).toHaveBeenCalledWith('seasons');
    expect(result.data?.name).toBe('Updated Season');
    expect(result.error).toBeNull();
  });

  it('returns error when season not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await updateSeason(mockClient, 'nonexistent', { name: 'Updated' });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});

describe('archiveSeasonRecord', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to updateSeason with status archived', async () => {
    const archived = { ...mockSeasonRow, status: 'archived' };
    mockSingle.mockResolvedValueOnce({ data: archived, error: null });

    const result = await archiveSeasonRecord(mockClient, 'season-123');

    expect(mockFrom).toHaveBeenCalledWith('seasons');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'archived' });
    expect(result.data?.status).toBe('archived');
    expect(result.error).toBeNull();
  });
});

describe('completeSeasonRecord', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to updateSeason with status completed', async () => {
    const completed = { ...mockSeasonRow, status: 'completed' };
    mockSingle.mockResolvedValueOnce({ data: completed, error: null });

    const result = await completeSeasonRecord(mockClient, 'season-123');

    expect(mockFrom).toHaveBeenCalledWith('seasons');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'completed' });
    expect(result.data?.status).toBe('completed');
    expect(result.error).toBeNull();
  });
});
