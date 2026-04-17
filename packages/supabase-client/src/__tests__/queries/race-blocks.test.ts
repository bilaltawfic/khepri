/**
 * Tests for race block query functions
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { KhepriSupabaseClient, RaceBlockRow } from '../../types.js';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockSingle =
  jest.fn<() => Promise<{ data: RaceBlockRow | null; error: { message: string } | null }>>();

const mockLimit =
  jest.fn<() => Promise<{ data: RaceBlockRow[] | null; error: { message: string } | null }>>();

const mockOrder =
  jest.fn<() => Promise<{ data: RaceBlockRow[] | null; error: { message: string } | null }>>();

const mockIn = jest.fn(() => ({
  order: mockOrder,
  limit: mockLimit,
}));

const mockEq = jest.fn(() => ({
  eq: mockEq,
  in: mockIn,
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
  cancelBlock,
  completeBlock,
  createRaceBlock,
  getActiveBlock,
  getRaceBlockById,
  getSeasonRaceBlocks,
  lockBlock,
  startBlock,
  updateRaceBlock,
} from '../../queries/race-blocks.js';

// =============================================================================
// TEST DATA
// =============================================================================

const mockBlockRow: RaceBlockRow = {
  id: 'block-123',
  season_id: 'season-456',
  athlete_id: 'athlete-789',
  name: 'Ironman Build',
  goal_id: 'goal-111',
  start_date: '2026-03-01',
  end_date: '2026-06-01',
  total_weeks: 12,
  status: 'draft',
  phases: [],
  locked_at: null,
  pushed_to_intervals_at: null,
  weekly_compliance: [],
  overall_compliance: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// =============================================================================
// TESTS
// =============================================================================

describe('getRaceBlockById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns block when found', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockBlockRow, error: null });

    const result = await getRaceBlockById(mockClient, 'block-123');

    expect(mockFrom).toHaveBeenCalledWith('race_blocks');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(result.data).toEqual(mockBlockRow);
    expect(result.error).toBeNull();
  });

  it('returns error when not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await getRaceBlockById(mockClient, 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});

describe('getSeasonRaceBlocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns blocks ordered by start_date ascending', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockBlockRow], error: null });

    const result = await getSeasonRaceBlocks(mockClient, 'season-456');

    expect(mockFrom).toHaveBeenCalledWith('race_blocks');
    expect(mockEq).toHaveBeenCalledWith('season_id', 'season-456');
    expect(mockOrder).toHaveBeenCalledWith('start_date', { ascending: true });
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no blocks exist', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const result = await getSeasonRaceBlocks(mockClient, 'season-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await getSeasonRaceBlocks(mockClient, 'season-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database error');
  });
});

describe('getActiveBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the active block (locked or in_progress) when one exists', async () => {
    const activeBlock = { ...mockBlockRow, status: 'locked' };
    mockLimit.mockResolvedValueOnce({ data: [activeBlock], error: null });
    (mockOrder as jest.Mock).mockReturnValueOnce({ limit: mockLimit });

    const result = await getActiveBlock(mockClient, 'athlete-789');

    expect(mockFrom).toHaveBeenCalledWith('race_blocks');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-789');
    expect(mockIn).toHaveBeenCalledWith('status', ['locked', 'in_progress']);
    expect(mockLimit).toHaveBeenCalledWith(1);
    expect(result.data).toEqual(activeBlock);
    expect(result.error).toBeNull();
  });

  it('returns null when no active block exists', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });
    (mockOrder as jest.Mock).mockReturnValueOnce({ limit: mockLimit });

    const result = await getActiveBlock(mockClient, 'athlete-789');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection timeout' },
    });
    (mockOrder as jest.Mock).mockReturnValueOnce({ limit: mockLimit });

    const result = await getActiveBlock(mockClient, 'athlete-789');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Connection timeout');
  });
});

describe('createRaceBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and returns new block', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockBlockRow, error: null });

    const result = await createRaceBlock(mockClient, {
      season_id: 'season-456',
      athlete_id: 'athlete-789',
      name: 'Ironman Build',
      start_date: '2026-03-01',
      end_date: '2026-06-01',
      total_weeks: 12,
    });

    expect(mockFrom).toHaveBeenCalledWith('race_blocks');
    expect(result.data).toEqual(mockBlockRow);
    expect(result.error).toBeNull();
  });

  it('returns error on constraint violation', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Check constraint violated' },
    });

    const result = await createRaceBlock(mockClient, {
      season_id: 'season-456',
      athlete_id: 'athlete-789',
      name: 'Bad Block',
      start_date: '2026-06-01',
      end_date: '2026-03-01',
      total_weeks: 0,
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('Check constraint');
  });
});

describe('updateRaceBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates and returns block', async () => {
    const updated = { ...mockBlockRow, name: 'Updated Block' };
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });

    const result = await updateRaceBlock(mockClient, 'block-123', { name: 'Updated Block' });

    expect(mockFrom).toHaveBeenCalledWith('race_blocks');
    expect(result.data?.name).toBe('Updated Block');
    expect(result.error).toBeNull();
  });

  it('returns error when block not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await updateRaceBlock(mockClient, 'nonexistent', { name: 'Updated' });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});

describe('lockBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets status to locked with locked_at timestamp', async () => {
    const locked = { ...mockBlockRow, status: 'locked', locked_at: '2026-02-01T00:00:00.000Z' };
    mockSingle.mockResolvedValueOnce({ data: locked, error: null });

    const result = await lockBlock(mockClient, 'block-123');

    expect(mockFrom).toHaveBeenCalledWith('race_blocks');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'locked', locked_at: expect.any(String) })
    );
    expect(result.data?.status).toBe('locked');
    expect(result.error).toBeNull();
  });
});

describe('startBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets status to in_progress', async () => {
    const started = { ...mockBlockRow, status: 'in_progress' };
    mockSingle.mockResolvedValueOnce({ data: started, error: null });

    const result = await startBlock(mockClient, 'block-123');

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'in_progress' });
    expect(result.data?.status).toBe('in_progress');
    expect(result.error).toBeNull();
  });
});

describe('completeBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets status to completed', async () => {
    const completed = { ...mockBlockRow, status: 'completed' };
    mockSingle.mockResolvedValueOnce({ data: completed, error: null });

    const result = await completeBlock(mockClient, 'block-123');

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'completed' });
    expect(result.data?.status).toBe('completed');
    expect(result.error).toBeNull();
  });
});

describe('cancelBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets status to cancelled', async () => {
    const cancelled = { ...mockBlockRow, status: 'cancelled' };
    mockSingle.mockResolvedValueOnce({ data: cancelled, error: null });

    const result = await cancelBlock(mockClient, 'block-123');

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(result.data?.status).toBe('cancelled');
    expect(result.error).toBeNull();
  });
});
