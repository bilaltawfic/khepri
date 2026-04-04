/**
 * Tests for plan adaptation query functions
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { KhepriSupabaseClient, PlanAdaptationRow } from '../../types.js';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockSingle =
  jest.fn<() => Promise<{ data: PlanAdaptationRow | null; error: { message: string } | null }>>();

const mockOrder =
  jest.fn<() => Promise<{ data: PlanAdaptationRow[] | null; error: { message: string } | null }>>();

const mockEq = jest.fn(() => ({
  eq: mockEq,
  order: mockOrder,
  select: jest.fn(() => ({ single: mockSingle })),
  single: mockSingle,
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
  acceptAdaptation,
  createAdaptation,
  getAdaptationById,
  getBlockAdaptations,
  getPendingAdaptations,
  rejectAdaptation,
  rollbackAdaptation,
} from '../../queries/plan-adaptations.js';

// =============================================================================
// TEST DATA
// =============================================================================

const mockAdaptationRow: PlanAdaptationRow = {
  id: 'adapt-123',
  block_id: 'block-456',
  athlete_id: 'athlete-789',
  trigger: 'coach_suggestion',
  status: 'suggested',
  affected_workouts: [],
  reason: 'Reduce volume due to fatigue',
  context: null,
  rolled_back_at: null,
  rolled_back_by: null,
  rollback_adaptation_id: null,
  created_at: '2026-03-15T00:00:00Z',
};

// =============================================================================
// TESTS
// =============================================================================

describe('getAdaptationById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns adaptation when found', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockAdaptationRow, error: null });

    const result = await getAdaptationById(mockClient, 'adapt-123');

    expect(mockFrom).toHaveBeenCalledWith('plan_adaptations');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(result.data).toEqual(mockAdaptationRow);
    expect(result.error).toBeNull();
  });

  it('returns error when not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await getAdaptationById(mockClient, 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});

describe('getBlockAdaptations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns adaptations ordered by created_at descending', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockAdaptationRow], error: null });

    const result = await getBlockAdaptations(mockClient, 'block-456');

    expect(mockFrom).toHaveBeenCalledWith('plan_adaptations');
    expect(mockEq).toHaveBeenCalledWith('block_id', 'block-456');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no adaptations exist', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const result = await getBlockAdaptations(mockClient, 'block-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await getBlockAdaptations(mockClient, 'block-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database error');
  });
});

describe('getPendingAdaptations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns pending adaptations for athlete', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockAdaptationRow], error: null });

    const result = await getPendingAdaptations(mockClient, 'athlete-789');

    expect(mockFrom).toHaveBeenCalledWith('plan_adaptations');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-789');
    expect(mockEq).toHaveBeenCalledWith('status', 'suggested');
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no pending adaptations', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const result = await getPendingAdaptations(mockClient, 'athlete-789');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await getPendingAdaptations(mockClient, 'athlete-789');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database error');
  });
});

describe('createAdaptation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and returns new adaptation', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockAdaptationRow, error: null });

    const result = await createAdaptation(mockClient, {
      block_id: 'block-456',
      athlete_id: 'athlete-789',
      trigger: 'coach_suggestion',
      reason: 'Reduce volume due to fatigue',
    });

    expect(mockFrom).toHaveBeenCalledWith('plan_adaptations');
    expect(result.data).toEqual(mockAdaptationRow);
    expect(result.error).toBeNull();
  });

  it('returns error on insert failure', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Insert failed' },
    });

    const result = await createAdaptation(mockClient, {
      block_id: 'block-456',
      athlete_id: 'athlete-789',
      trigger: 'coach_suggestion',
      reason: 'Test',
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Insert failed');
  });
});

describe('acceptAdaptation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets status to accepted', async () => {
    const accepted = { ...mockAdaptationRow, status: 'accepted' };
    mockSingle.mockResolvedValueOnce({ data: accepted, error: null });

    const result = await acceptAdaptation(mockClient, 'adapt-123');

    expect(mockFrom).toHaveBeenCalledWith('plan_adaptations');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'accepted' });
    expect(result.data?.status).toBe('accepted');
    expect(result.error).toBeNull();
  });
});

describe('rejectAdaptation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets status to rejected', async () => {
    const rejected = { ...mockAdaptationRow, status: 'rejected' };
    mockSingle.mockResolvedValueOnce({ data: rejected, error: null });

    const result = await rejectAdaptation(mockClient, 'adapt-123');

    expect(mockFrom).toHaveBeenCalledWith('plan_adaptations');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'rejected' });
    expect(result.data?.status).toBe('rejected');
    expect(result.error).toBeNull();
  });
});

describe('rollbackAdaptation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets status to rolled_back with timestamp and actor', async () => {
    const rolledBack = {
      ...mockAdaptationRow,
      status: 'rolled_back',
      rolled_back_at: '2026-03-16T00:00:00.000Z',
      rolled_back_by: 'athlete',
    };
    mockSingle.mockResolvedValueOnce({ data: rolledBack, error: null });

    const result = await rollbackAdaptation(mockClient, 'adapt-123', 'athlete');

    expect(mockFrom).toHaveBeenCalledWith('plan_adaptations');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rolled_back',
        rolled_back_at: expect.any(String),
        rolled_back_by: 'athlete',
      })
    );
    expect(result.data?.status).toBe('rolled_back');
    expect(result.error).toBeNull();
  });

  it('returns error when adaptation not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await rollbackAdaptation(mockClient, 'nonexistent', 'support');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});
