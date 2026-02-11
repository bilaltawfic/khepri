/**
 * Tests for goal query functions
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { GoalRow, KhepriSupabaseClient } from '../../types.js';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockSingle =
  jest.fn<() => Promise<{ data: GoalRow | null; error: { message: string } | null }>>();

const mockOrder =
  jest.fn<() => Promise<{ data: GoalRow[] | null; error: { message: string } | null }>>();

const mockDeleteEq = jest.fn<() => Promise<{ error: { message: string } | null }>>();

const mockGte = jest.fn(() => ({ order: mockOrder }));
const mockEq = jest.fn(() => ({
  eq: mockEq,
  gte: mockGte,
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
const mockDelete = jest.fn(() => ({ eq: mockDeleteEq }));

const mockFrom = jest.fn(() => ({
  delete: mockDelete,
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
}));

const mockClient = {
  from: mockFrom,
} as unknown as KhepriSupabaseClient;

import {
  cancelGoal,
  completeGoal,
  createGoal,
  deleteGoal,
  getActiveGoals,
  getAllGoals,
  getGoalById,
  getGoalsByType,
  getUpcomingRaceGoals,
  updateGoal,
} from '../../queries/goals.js';

// =============================================================================
// TEST DATA
// =============================================================================

const mockGoalRow: GoalRow = {
  id: 'goal-123',
  athlete_id: 'athlete-456',
  goal_type: 'race',
  title: 'Boston Marathon 2026',
  description: 'Qualify for Boston with a sub-3 hour marathon',
  target_date: '2026-04-20',
  priority: 'A',
  status: 'active',
  race_event_name: 'Boston Marathon',
  race_distance: '42.195km',
  race_location: 'Boston, MA',
  race_target_time_seconds: 10800,
  perf_metric: null,
  perf_current_value: null,
  perf_target_value: null,
  fitness_metric: null,
  fitness_target_value: null,
  health_metric: null,
  health_current_value: null,
  health_target_value: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// =============================================================================
// TESTS
// =============================================================================

describe('getAllGoals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries goals table filtered by athlete_id with priority ordering', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockGoalRow], error: null });

    const result = await getAllGoals(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('goals');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockOrder).toHaveBeenCalledWith('priority', { ascending: true, nullsFirst: false });
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no goals', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const result = await getAllGoals(mockClient, 'athlete-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns empty array when data is null (no rows)', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null });

    const result = await getAllGoals(mockClient, 'athlete-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error on database failure', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed' },
    });

    const result = await getAllGoals(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database connection failed');
  });
});

describe('getActiveGoals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters by athlete_id and active status with priority ordering', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockGoalRow], error: null });

    const result = await getActiveGoals(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('goals');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockEq).toHaveBeenCalledWith('status', 'active');
    expect(mockOrder).toHaveBeenCalledWith('priority', { ascending: true, nullsFirst: false });
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no active goals', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const result = await getActiveGoals(mockClient, 'athlete-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});

describe('getGoalsByType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters by athlete_id and goal_type with priority ordering', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockGoalRow], error: null });

    const result = await getGoalsByType(mockClient, 'athlete-456', 'race');

    expect(mockFrom).toHaveBeenCalledWith('goals');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockEq).toHaveBeenCalledWith('goal_type', 'race');
    expect(mockOrder).toHaveBeenCalledWith('priority', { ascending: true, nullsFirst: false });
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });
});

describe('getGoalById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns goal when found', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockGoalRow, error: null });

    const result = await getGoalById(mockClient, 'goal-123');

    expect(mockFrom).toHaveBeenCalledWith('goals');
    expect(result.data).toEqual(mockGoalRow);
    expect(result.error).toBeNull();
  });

  it('returns null when not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await getGoalById(mockClient, 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});

describe('getUpcomingRaceGoals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters by athlete_id, race type, active status, and future date', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockGoalRow], error: null });

    const result = await getUpcomingRaceGoals(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('goals');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockEq).toHaveBeenCalledWith('goal_type', 'race');
    expect(mockEq).toHaveBeenCalledWith('status', 'active');
    // Should filter for dates >= today
    expect(mockGte).toHaveBeenCalledWith(
      'target_date',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
    expect(mockOrder).toHaveBeenCalledWith('target_date', { ascending: true });
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });
});

describe('createGoal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and returns new goal', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockGoalRow, error: null });

    const result = await createGoal(mockClient, {
      athlete_id: 'athlete-456',
      goal_type: 'race',
      title: 'Boston Marathon 2026',
    });

    expect(mockFrom).toHaveBeenCalledWith('goals');
    expect(result.data).toEqual(mockGoalRow);
    expect(result.error).toBeNull();
  });
});

describe('updateGoal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates and returns goal', async () => {
    const updatedGoal = { ...mockGoalRow, title: 'Updated Title' };
    mockSingle.mockResolvedValueOnce({ data: updatedGoal, error: null });

    const result = await updateGoal(mockClient, 'goal-123', { title: 'Updated Title' });

    expect(mockFrom).toHaveBeenCalledWith('goals');
    expect(result.data?.title).toBe('Updated Title');
    expect(result.error).toBeNull();
  });
});

describe('completeGoal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to updateGoal with status completed', async () => {
    const completedGoal = { ...mockGoalRow, status: 'completed' as const };
    mockSingle.mockResolvedValueOnce({ data: completedGoal, error: null });

    const result = await completeGoal(mockClient, 'goal-123');

    expect(mockFrom).toHaveBeenCalledWith('goals');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'completed' });
    expect(result.data?.status).toBe('completed');
    expect(result.error).toBeNull();
  });
});

describe('cancelGoal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets status to cancelled', async () => {
    const cancelledGoal = { ...mockGoalRow, status: 'cancelled' as const };
    mockSingle.mockResolvedValueOnce({ data: cancelledGoal, error: null });

    const result = await cancelGoal(mockClient, 'goal-123');

    expect(mockFrom).toHaveBeenCalledWith('goals');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(result.data?.status).toBe('cancelled');
    expect(result.error).toBeNull();
  });
});

describe('deleteGoal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes goal from database', async () => {
    mockDeleteEq.mockResolvedValueOnce({ error: null });

    const result = await deleteGoal(mockClient, 'goal-123');

    expect(mockFrom).toHaveBeenCalledWith('goals');
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });
});

describe('error handling for single-row queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error on createGoal failure', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Insert failed' },
    });

    const result = await createGoal(mockClient, {
      athlete_id: 'athlete-456',
      goal_type: 'race',
      title: 'Test',
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Insert failed');
  });

  it('returns error on updateGoal failure', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Update failed' },
    });

    const result = await updateGoal(mockClient, 'goal-123', { title: 'Updated' });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Update failed');
  });

  it('returns error on deleteGoal failure', async () => {
    mockDeleteEq.mockResolvedValueOnce({
      error: { message: 'Delete failed' },
    });

    const result = await deleteGoal(mockClient, 'goal-123');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Delete failed');
  });
});

describe('error handling for list queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null data on error for getActiveGoals', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed' },
    });

    const result = await getActiveGoals(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database connection failed');
  });

  it('returns null data on error for getAllGoals', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection timeout' },
    });

    const result = await getAllGoals(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Connection timeout');
  });

  it('returns null data on error for getUpcomingRaceGoals', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Permission denied' },
    });

    const result = await getUpcomingRaceGoals(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Permission denied');
  });

  it('returns null data on error for getGoalsByType', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Query timeout' },
    });

    const result = await getGoalsByType(mockClient, 'athlete-456', 'race');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Query timeout');
  });
});
